import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Source, Tenant } from "@prisma/client";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaService } from "../prisma/prisma.service";

interface ManifestEntry {
  tenant: string;
  source: Source;
  batch: number;
  path: string;
}

export interface FileResult {
  path: string;
  outcome: "loaded" | "already_loaded" | "missing";
}

@Injectable()
export class IngestionService {
  private readonly fixturesDir: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.fixturesDir = config.get("FIXTURES_DIR", "./fixtures");
  }

  // Stores every file the manifest lists for this tenant, exactly as it
  // arrived. A file whose content was already stored is skipped.
  async ingestTenant(tenant: Tenant): Promise<FileResult[]> {
    const manifestPath = join(this.fixturesDir, "manifest.json");
    const manifest: { batches: ManifestEntry[] } = JSON.parse(readFileSync(manifestPath, "utf8"));
    const entries = manifest.batches.filter((e) => e.tenant === tenant.id);

    const results: FileResult[] = [];

    for (const entry of entries) {
      const fullPath = join(this.fixturesDir, entry.path);

      if (!existsSync(fullPath)) {
        results.push({ path: entry.path, outcome: "missing" });
        continue;
      }

      const content = readFileSync(fullPath, "utf8");
      const sha256 = createHash("sha256").update(content).digest("hex");

      const existing = await this.prisma.rawFile.findUnique({
        where: { tenantId_sha256: { tenantId: tenant.id, sha256 } },
      });

      if (existing) {
        results.push({ path: entry.path, outcome: "already_loaded" });
        continue;
      }

      await this.prisma.rawFile.create({
        data: {
          tenantId: tenant.id,
          source: entry.source,
          batch: entry.batch,
          path: entry.path,
          sha256,
          content,
        },
      });

      results.push({ path: entry.path, outcome: "loaded" });
    }

    return results;
  }
}
