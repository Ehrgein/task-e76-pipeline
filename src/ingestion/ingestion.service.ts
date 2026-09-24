import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ProcessingStatus, Source, Tenant } from "@prisma/client";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readManifest } from "../lib/manifest";
import { PrismaService } from "../prisma/prisma.service";
import { StagingService } from "../staging/staging.service";

// Every source is stored raw. Only orders are modelled into staging: they are
// what revenue is built from. Refunds, email events and ad spend stay raw by
// decision (see TRADEOFFS.md).
const STAGED_SOURCES: Source[] = [Source.orders];

// A stored file whose staging didn't finish (the run died, it failed, or it
// was quarantined and the mapping may have been fixed) is staged again on the
// next run. dead_letter files have used up their retries and are left alone.
const RESTAGE_STATUSES: ProcessingStatus[] = [
  ProcessingStatus.pending,
  ProcessingStatus.processing,
  ProcessingStatus.failed,
  ProcessingStatus.quarantined,
];

export enum IngestionOutcome {
  Loaded = "loaded",
  AlreadyLoaded = "already_loaded",
  NotFound = "not_found",
  Failed = "failed",
}

export interface FileResult {
  path: string;
  outcome: IngestionOutcome;
  error?: string;
}

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);
  private readonly fixturesDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly stagingService: StagingService,
    config: ConfigService,
  ) {
    this.fixturesDir = config.get("FIXTURES_DIR", "./fixtures");
  }

  // Stores every file the manifest lists for this tenant, exactly as it
  // arrived. A file whose content was already stored is skipped.
  async ingestTenantRawFiles(tenant: Tenant): Promise<FileResult[]> {
    const entries = readManifest(this.fixturesDir, tenant);

    const results: FileResult[] = [];

    for (const entry of entries) {
      const fullPath = join(this.fixturesDir, entry.path);

      // Ideally we would use a service like AWS, SFTP, or something like minIO to detect the files are on prem/cloud.
      // This is just since tthe files are local right now.
      // Not at the source (yet). Nothing to store; whether it is late is
      // decided separately, by the missing-files check (MissingFilesService).
      if (!existsSync(fullPath)) {
        results.push({ path: entry.path, outcome: IngestionOutcome.NotFound });
        continue;
      }

      const content = readFileSync(fullPath, "utf8");
      const sha256 = createHash("sha256").update(content).digest("hex");

      // One file failing to store (e.g. the database drops for a moment) must
      // not stop the others. Nothing was written for it, so the next run
      // simply tries it again.
      try {
        const isStaged = STAGED_SOURCES.includes(entry.source);

        const existing = await this.prisma.rawFile.findUnique({
          where: { tenantId_sha256: { tenantId: tenant.id, sha256 } },
          include: { processing: true },
        });

        if (existing) {
          // Replay: "already stored" doesn't mean "done". If an earlier run
          // died before staging finished, this run finishes it. The unique
          // keys in staging make that safe: nothing is counted twice.
          if (existing.processing && RESTAGE_STATUSES.includes(existing.processing.status)) {
            await this.stagingService.stageFile(existing, tenant);
          }

          results.push({ path: entry.path, outcome: IngestionOutcome.AlreadyLoaded });
          continue;
        }

        // The file and its "pending" status are created in one write, so a
        // stored file always has a status and can never be forgotten. Sources
        // that aren't staged get no status: there is nothing to track.
        const rawFile = await this.prisma.rawFile.create({
          data: {
            tenantId: tenant.id,
            source: entry.source,
            batch: entry.batch,
            path: entry.path,
            sha256,
            content,
            processing: isStaged
              ? { create: { tenantId: tenant.id, status: ProcessingStatus.pending } }
              : undefined,
          },
        });

        // This could be event driven instead: publish "raw file stored" and
        // let a worker stage it. For now staging is called directly for the sake of simplicity.
        // In an event architecture, it would just fire an event and that would take care of staging.
        // Debatable if event architecture is warranted for how many files there are here, though.
        if (isStaged) {
          await this.stagingService.stageFile(rawFile, tenant);
        }

        results.push({ path: entry.path, outcome: IngestionOutcome.Loaded });
      } catch (err) {
        const error = (err as Error).message;
        this.logger.error(`${entry.path} failed: ${error}`);
        results.push({ path: entry.path, outcome: IngestionOutcome.Failed, error });
      }
    }

    return results;
  }
}
