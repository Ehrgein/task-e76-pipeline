import { Controller, Get, NotFoundException, Query } from "@nestjs/common";
import { CurrentTenant } from "../current-tenant.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { ReportingService } from "./reporting.service";

@Controller()
export class ReportingController {
  constructor(
    private readonly reportingService: ReportingService,
    private readonly prisma: PrismaService,
  ) {}

  // e.g. GET /revenue?from=2026-01-06&to=2026-01-12
  // this would be a lot more detailed with a proper DTO, response types and whatnot, time's sake, we keep it short.
  @Get("revenue")
  async revenue(
    @CurrentTenant() slug: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) throw new NotFoundException(`Unknown tenant ${slug}`);

    return this.reportingService.dailyRevenue(tenant, from, to);
  }

  @Get("reconciliation")
  async reconciliation(@CurrentTenant() slug: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) throw new NotFoundException(`Unknown tenant ${slug}`);

    return this.reportingService.reconcile(tenant);
  }
}
