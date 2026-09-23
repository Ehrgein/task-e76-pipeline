import { Controller, Get, NotFoundException, Param, Post } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { IngestionService } from "./ingestion.service";

// TODO: the tenant id comes from the URL for now; it moves to the auth token
// once that exists, so a caller can only ever see its own tenant.
@Controller("tenants")
export class IngestionController {
  constructor(
    private readonly ingestion: IngestionService,
    private readonly prisma: PrismaService,
  ) {}

  @Post("/:id/ingestions")
  async ingest(@Param("id") id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException(`Unknown tenant ${id}`);

    return this.ingestion.ingestTenant(tenant);
  }

  @Get("/:id/files")
  async files(@Param("id") id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException(`Unknown tenant ${id}`);

    return this.prisma.rawFile.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, source: true, batch: true, path: true, sha256: true, loadedAt: true },
      orderBy: [{ source: "asc" }, { batch: "asc" }],
    });
  }
}
