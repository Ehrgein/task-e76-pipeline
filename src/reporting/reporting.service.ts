import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma, Tenant } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaService } from "../prisma/prisma.service";

export interface DailyRevenue {
  date: string; // YYYY-MM-DD, in the tenant's timezone
  currency: string;
  orders: number;
  gross: string; // a string, so cents survive JSON exactly
}

@Injectable()
export class ReportingService {
  private readonly fixturesDir: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.fixturesDir = config.get("FIXTURES_DIR", "./fixtures");
  }

  // Gross revenue per day, computed from staged orders at read time. Each
  // order's business day (orderDate) was set at staging, in the tenant's
  // timezone, so from/to and the grouping use it directly.
  async dailyRevenue(tenant: Tenant, from?: string, to?: string): Promise<DailyRevenue[]> {
    const days = await this.prisma.stagingOrder.groupBy({
      by: ["orderDate", "currency"],
      where: {
        tenantId: tenant.id,
        orderDate: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        },
      },
      _count: { _all: true },
      _sum: { gross: true },
      orderBy: { orderDate: "asc" },
    });

    return days.map((day) => ({
      date: day.orderDate.toISOString().slice(0, 10),
      currency: day.currency,
      orders: day._count._all,
      gross: (day._sum.gross ?? new Prisma.Decimal(0)).toFixed(2),
    }));
  }

  // Our daily gross next to the client's finance export, day by day. Any
  // difference is shown rather than hidden: the client treats one as a bug.
  async reconcile(tenant: Tenant) {
    const financePath = join(this.fixturesDir, tenant.slug, "finance_summary.csv");

    if (!existsSync(financePath)) {
      return { financeExport: null, days: [] };
    }

    const financeRows: Record<string, string>[] = parse(readFileSync(financePath, "utf8"), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const ours = new Map((await this.dailyRevenue(tenant)).map((day) => [day.date, day]));

    const days = financeRows.map((finance) => {
      const our = ours.get(finance.date);
      const ourGross = new Prisma.Decimal(our?.gross ?? 0);
      const financeGross = new Prisma.Decimal(finance.gross_reported);

      return {
        date: finance.date,
        ourGross: ourGross.toFixed(2),
        financeGross: financeGross.toFixed(2),
        difference: ourGross.minus(financeGross).toFixed(2),
        matches: ourGross.equals(financeGross),
        ourCurrency: our?.currency ?? tenant.currency,
        financeCurrency: finance.currency,
      };
    });

    return {
      financeExport: `${tenant.slug}/finance_summary.csv`,
      daysCompared: days.length,
      daysMatching: days.filter((day) => day.matches).length,
      // Same amounts under different currency labels can't be reconciled by
      // us: it's an open question for the client (see QUESTIONS.md).
      currencyLabelsDiffer: days.some((day) => day.ourCurrency !== day.financeCurrency),
      days,
    };
  }
}
