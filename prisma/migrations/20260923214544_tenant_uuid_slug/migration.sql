-- DropForeignKey
ALTER TABLE "raw_files" DROP CONSTRAINT "raw_files_tenant_id_fkey";

-- AlterTable
ALTER TABLE "raw_files" DROP COLUMN "tenant_id",
ADD COLUMN     "tenant_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "tenants" DROP CONSTRAINT "tenants_pkey",
ADD COLUMN     "slug" TEXT NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "raw_files_tenant_id_sha256_key" ON "raw_files"("tenant_id", "sha256");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- AddForeignKey
ALTER TABLE "raw_files" ADD CONSTRAINT "raw_files_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

