import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { IngestionService } from "./ingestion.service";

// TODO: the tenant slug comes from the URL for now; it moves to the auth token
// once that exists, so a caller can only ever see its own tenant.
@Controller("tenants")
export class IngestionController {
  constructor(
    private readonly ingestionService: IngestionService,
    private readonly prisma: PrismaService,
  ) {}

  
  @Post("/:slug/ingestions")
  async ingest(@Param("slug") slug: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) throw new NotFoundException(`Unknown tenant ${slug}`);

    return this.ingestionService.ingestTenantRawFiles(tenant);
  }

  @Get("/:slug/files")
  async files(@Param("slug") slug: string) {
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
