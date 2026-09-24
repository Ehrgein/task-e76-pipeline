import { Injectable, Logger } from "@nestjs/common";
import {
  AlertType,
  Prisma,
  ProcessingStatus,
  RawFile,
  Source,
  Tenant,
} from "@prisma/client";
import { parse } from "csv-parse/sync";
import { PrismaService } from "../prisma/prisma.service";
import { normalizeChannel } from "./channel";
import { OrderColumns } from "./order-columns";

// A file that fails this many times stops being retried and goes to the
// dead-letter state, where a person has to look at it.
const MAX_ATTEMPTS = 3;

export enum StagingOutcome {
  Staged = "staged",
  Quarantined = "quarantined",
  Failed = "failed",
  DeadLetter = "dead_letter",
  NotSupported = "not_supported",
}

export interface StagingResult {
  path: string;
  outcome: StagingOutcome;
  inserted?: number;
  duplicates?: number;
  missingColumns?: string[];
  error?: string;
}

@Injectable()
export class StagingService {
  private readonly logger = new Logger(StagingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Raw file ID is guaranteed to exist as per our previous step of ingestion. That is to say:
  // Ingestion > calls this functions after creating the raw File. ID now exists due to Prisma returning the ID.
  // If this was an event driven architecture, we would do a lookup of the ID just in case.
  async stageFile(file: RawFile, tenant: Tenant): Promise<StagingResult> {
    // Only orders have a staging step so far. Other sources stay pending, so
    // they are visibly not processed rather than silently marked done.
    if (file.source !== Source.orders) {
      return { path: file.path, outcome: StagingOutcome.NotSupported };
    }

    // Claim the file. Every attempt is counted, so a file that keeps failing
    // ends up in dead_letter instead of being retried forever.
    // Ideally, we would want something to later check on a CRON, or job, for retries, but out of scope for the amount of time.
    const processing = await this.prisma.fileProcessing.update({
      where: { rawFileId: file.id },
      data: {
        status: ProcessingStatus.processing,
        attempts: { increment: 1 },
        lastError: null,
      },
    });

    try {
      return await this.stageOrderFile(file, tenant);
    } catch (err) {
      const error = (err as Error).message;
      const isDeadLetter = processing.attempts >= MAX_ATTEMPTS;

      await this.prisma.fileProcessing.update({
        where: { rawFileId: file.id },
        data: {
          status: isDeadLetter
            ? ProcessingStatus.dead_letter
            : ProcessingStatus.failed,
          lastError: error,
        },
      });

      if (isDeadLetter) {
        await this.openAlert(tenant.id, file.id, AlertType.dead_letter, [
          error,
        ]);
      }

      return {
        path: file.path,
        outcome: isDeadLetter
          ? StagingOutcome.DeadLetter
          : StagingOutcome.Failed,
        error,
      };
    }
  }

  private async stageOrderFile(
    file: RawFile,
    tenant: Tenant,
  ): Promise<StagingResult> {
    const columns = tenant.orderColumns as OrderColumns;

    const rows: Record<string, string>[] = parse(file.content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const [headers]: string[][] = parse(file.content, { to_line: 1 });

    // Schema drift: every column the tenant's mapping needs must be in the
    // file. If one is missing (renamed or dropped), the file is held back:
    // staging it would mean rows with no amount or no date. Extra columns
    // break nothing, since we never read them, so they are only logged.
    const mappedColumns = Object.values(columns);

    const missingColumns = mappedColumns.filter(
      (column) => !headers.includes(column),
    );

    const unexpectedColumns = headers.filter(
      (header) => !mappedColumns.includes(header),
    );

    if (unexpectedColumns.length > 0) {
      this.logger.warn(
        `${file.path}: unexpected columns ${unexpectedColumns.join(", ")}`,
      );
    }

    if (missingColumns.length > 0) {
      await this.openAlert(
        tenant.id,
        file.id,
        AlertType.missing_columns,
        missingColumns,
      );

      await this.prisma.fileProcessing.update({
        where: { rawFileId: file.id },
        data: {
          status: ProcessingStatus.quarantined,
          lastError: `missing columns: ${missingColumns.join(", ")}`,
        },
      });

      return {
        path: file.path,
        outcome: StagingOutcome.Quarantined,
        missingColumns,
      };
    }

    const orderIds = rows.map((row) => row[columns.order_id]);

    // Orders in this file that were already staged from a different file.
    // The database is the lookup, not an in-memory Set: the original may have
    // been staged by an earlier run. They are never staged twice (see
    // skipDuplicates below), but always reported, so nothing is dropped silently.
    const alreadyStaged = await this.prisma.stagingOrder.findMany({
      where: {
        tenantId: tenant.id,
        orderId: { in: orderIds },
        rawFileId: { not: file.id },
      },
      select: { orderId: true, rawFile: { select: { path: true } } },
    });

    if (alreadyStaged.length > 0) {
      const duplicates = alreadyStaged.map((order) => ({
        orderId: order.orderId,
        originalFile: order.rawFile.path,
      }));

      await this.openAlert(
        tenant.id,
        file.id,
        AlertType.duplicate_orders,
        duplicates,
      );
    }

    // The rows and the "completed" status are written in one transaction:
    // either both land or neither does. A crash in between can't leave rows
    // staged while the file still looks unfinished, or the other way round.
    const inserted = await this.prisma.$transaction(async (tx) => {
      // skipDuplicates relies on the (tenant, order_id) unique key: Postgres
      // refuses a second row for an order, and this turns that refusal into a
      // skip instead of an error. The skipped duplicates were reported above.
      const { count } = await tx.stagingOrder.createMany({
        data: rows.map((row) => ({
          tenantId: tenant.id,
          orderId: row[columns.order_id],
          createdAt: new Date(row[columns.created_at]),
          channelRaw: row[columns.channel],
          channel: normalizeChannel(row[columns.channel]),
          gross: row[columns.gross],
          currency: row[columns.currency],
          rawFileId: file.id,
        })),
        skipDuplicates: true,
      });

      await tx.fileProcessing.update({
        where: { rawFileId: file.id },
        data: { status: ProcessingStatus.completed },
      });

      return count;
    });

    return {
      path: file.path,
      outcome: StagingOutcome.Staged,
      inserted,
      duplicates: rows.length - inserted,
      missingColumns,
    };
  }

  // Alerts land in two places today: the pipeline_alerts table (served by
  // GET /tenants/:slug/alerts) and the application log. In production the
  // table would feed a Grafana panel or the client's dashboard, and the log
  // line would page whoever is on call.
  private async openAlert(
    tenantId: string,
    rawFileId: number,
    type: AlertType,
    details: Prisma.InputJsonValue,
  ) {
    this.logger.warn(
      `${type} in raw file ${rawFileId}: ${JSON.stringify(details)}`,
    );

    await this.prisma.pipelineAlert.create({
      data: { tenantId, rawFileId, type, details },
    });
  }
}
