import { Controller, Get, NotFoundException, Post } from "@nestjs/common";
import { CurrentTenant } from "../current-tenant.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { IngestionService } from "./ingestion.service";

@Controller()
export class IngestionController {
  constructor(
    private readonly ingestionService: IngestionService,
    private readonly prisma: PrismaService,
  ) {}

  @Post("ingestions")
  async ingest(@CurrentTenant() slug: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) throw new NotFoundException(`Unknown tenant ${slug}`);
    return this.ingestionService.ingestTenantRawFiles(tenant);
  }

  @Get("files")
  async files(@CurrentTenant() slug: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) throw new NotFoundException(`Unknown tenant ${slug}`);

    return this.prisma.rawFile.findMany({
      where: { tenantId: tenant.id },
      select: {
        id: true,
        source: true,
        batch: true,
        path: true,
        sha256: true,
        loadedAt: true,
        processing: { select: { status: true, attempts: true, lastError: true } },
      },
      orderBy: [{ source: "asc" }, { batch: "asc" }],
    });
  }
}
