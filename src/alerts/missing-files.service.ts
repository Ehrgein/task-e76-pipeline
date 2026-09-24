import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { AlertType, Tenant } from "@prisma/client";
import { addDays, addHours, format, parseISO } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { readManifest } from "../lib/manifest";
import { PrismaService } from "../prisma/prisma.service";

// How long after a batch's last day we wait before calling it missing. This is
// the client's decision (see QUESTIONS.md); 24 hours until they tell us.
const MISSING_AFTER_HOURS = 24;

// Compares what the manifest expects with what we have actually stored.
// "Arrived" means stored in raw_files (whatever its processing status), not
// "sitting in a folder". It runs on its own schedule, independent of
// ingestion, so a missing file is flagged even if ingestion never runs.
@Injectable()
export class MissingFilesService {
  private readonly logger = new Logger(MissingFilesService.name);
  private readonly fixturesDir: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.fixturesDir = config.get("FIXTURES_DIR", "./fixtures");
  }

  // Short-term solution: once a day at 02:00 UTC, after the nightly files are
  // expected to have landed. An alert stays open even if the file arrives
  // later. The next step would be to resolve it automatically when the file
  // is stored, so late arrivals don't leave stale alerts behind.
  @Cron("0 2 * * *", { timeZone: "UTC" })
  async checkAllTenants() {
    const tenants = await this.prisma.tenant.findMany();

    for (const tenant of tenants) {
      await this.flagOverdue(tenant);
    }
  }

  async flagOverdue(tenant: Tenant) {
    const expected = readManifest(this.fixturesDir, tenant);

    // northwind/email_events/batch_01.ndjson for example
    const expectedPaths = expected.map((entry) => entry.path);

    // Check which paths given by the manifest are in the actual database, regardless of processing status
    const stored = await this.prisma.rawFile.findMany({
      where: {
        tenantId: tenant.id,
        path: { in: expectedPaths },
      },
      select: { path: true },
    });

    const storedPaths = stored.map((file) => file.path);

    for (const entry of expected) {
      if (storedPaths.includes(entry.path)) continue;

      // A batch can only be complete once the last day it covers is over, so
      // it is due at midnight after covers_to (tenant's timezone), plus the
      // wait above. Before that, not having it yet is normal.
      // e.g. covers_to 2026-01-23 → midnight 2026-01-24 → + 24h → due by 2026-01-25 00:00
      const dayAfterCoversTo = format(
        addDays(parseISO(entry.covers_to), 1),
        "yyyy-MM-dd",
      );

      const dueBy = addHours(
        fromZonedTime(`${dayAfterCoversTo}T00:00:00`, tenant.timezone),
        MISSING_AFTER_HOURS,
      );

      if (new Date() < dueBy) continue;

      // The unique key on (tenant, type, expected path) means later runs skip
      // it instead of raising it again.
      const { count } = await this.prisma.pipelineAlert.createMany({
        data: {
          tenantId: tenant.id,
          type: AlertType.missing_file,
          expectedPath: entry.path,
          details: {
            coversFrom: entry.covers_from,
            coversTo: entry.covers_to,
            dueBy: dueBy.toISOString(),
          },
        },
        skipDuplicates: true,
      });

      if (count > 0) {
        this.logger.warn(
          `missing_file: ${entry.path} was due by ${dueBy.toISOString()}`,
        );
      }
    }
  }
}
