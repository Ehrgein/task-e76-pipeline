import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ProcessingStatus, Source, Tenant } from "@prisma/client";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaService } from "../prisma/prisma.service";
import { StagingService } from "../staging/staging.service";

interface ManifestEntry {
  tenant: string;
  source: Source;
  batch: number;
  path: string;
}

export enum IngestionOutcome {
  Loaded = "loaded",
  AlreadyLoaded = "already_loaded",
  Missing = "missing",
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
    const manifestPath = join(this.fixturesDir, "manifest.json");

    const manifest: { batches: ManifestEntry[] } = JSON.parse(
      readFileSync(manifestPath, "utf8"),
    );

    // Manifest uses slug to represent a tenant, so we grab the tenant (check it exists), and compare its slug.
    const entries = manifest.batches.filter((e) => e.tenant === tenant.slug);

    const results: FileResult[] = [];

    for (const entry of entries) {
      const fullPath = join(this.fixturesDir, entry.path);

      // Ideally we would use a service like AWS, SFTP, or something like minIO to detect the files are on prem/cloud.
      // This is just since tthe files are local right now.
      if (!existsSync(fullPath)) {
        results.push({ path: entry.path, outcome: IngestionOutcome.Missing });
        continue;
      }

      const content = readFileSync(fullPath, "utf8");
      const sha256 = createHash("sha256").update(content).digest("hex");

      // One file failing to store (e.g. the database drops for a moment) must
      // not stop the others. Nothing was written for it, so the next run
      // simply tries it again.
      try {
        const existing = await this.prisma.rawFile.findUnique({
          where: { tenantId_sha256: { tenantId: tenant.id, sha256 } },
        });

        if (existing) {
          results.push({ path: entry.path, outcome: IngestionOutcome.AlreadyLoaded });
          continue;
        }

        // The file and its "pending" status are created in one write, so a
        // stored file always has a status and can never be forgotten.
        const rawFile = await this.prisma.rawFile.create({
          data: {
            tenantId: tenant.id,
            source: entry.source,
            batch: entry.batch,
            path: entry.path,
            sha256,
            content,
            processing: { create: { tenantId: tenant.id, status: ProcessingStatus.pending } },
          },
        });

        // This could be event driven instead: publish "raw file stored" and
        // let a worker stage it. For now staging is called directly for the sake of simplicity.
        // In an event architecture, it would just fire an event and that would take care of staging.
        // Debatable if event architecture is warranted for how many files there are here, though.

        await this.stagingService.stageFile(rawFile, tenant);

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
