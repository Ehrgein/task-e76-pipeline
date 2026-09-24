import { Controller, Get, NotFoundException } from "@nestjs/common";
import { CurrentTenant } from "../current-tenant.decorator";
import { PrismaService } from "../prisma/prisma.service";

@Controller()
export class AlertsController {
  constructor(private readonly prisma: PrismaService) {}

  // Open alerts only: resolved ones stay in the table as history.
  @Get("alerts")
  async openAlerts(@CurrentTenant() slug: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) throw new NotFoundException(`Unknown tenant ${slug}`);

    return this.prisma.pipelineAlert.findMany({
      where: { tenantId: tenant.id, resolvedAt: null },
      select: {
        type: true,
        details: true,
        createdAt: true,
        rawFile: { select: { path: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }
}
