import { Injectable } from "@nestjs/common";
import { Prisma, Tenant } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface DailyRevenue {
  date: string; // YYYY-MM-DD, in the tenant's timezone
  currency: string;
  orders: number;
  gross: string; // a string, so cents survive JSON exactly
}

@Injectable()
export class ReportingService {
  constructor(private readonly prisma: PrismaService) {}

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
}
