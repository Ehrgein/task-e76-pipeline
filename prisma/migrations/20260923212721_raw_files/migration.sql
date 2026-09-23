-- DropForeignKey
ALTER TABLE "ingested_files" DROP CONSTRAINT "ingested_files_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "raw_records" DROP CONSTRAINT "raw_records_file_id_fkey";

-- DropForeignKey
ALTER TABLE "raw_records" DROP CONSTRAINT "raw_records_tenant_id_fkey";

-- DropTable
DROP TABLE "ingested_files";

-- DropTable
DROP TABLE "raw_records";

-- CreateTable
CREATE TABLE "raw_files" (
    "id" SERIAL NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "source" "Source" NOT NULL,
    "batch" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "loaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raw_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "raw_files_tenant_id_sha256_key" ON "raw_files"("tenant_id", "sha256");

-- AddForeignKey
ALTER TABLE "raw_files" ADD CONSTRAINT "raw_files_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

