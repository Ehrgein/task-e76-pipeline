-- CreateEnum
CREATE TYPE "Source" AS ENUM ('orders', 'refunds', 'email_events', 'ad_spend');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingested_files" (
    "id" SERIAL NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "source" "Source" NOT NULL,
    "batch" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "columns" TEXT[],
    "row_count" INTEGER NOT NULL,
    "loaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingested_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_records" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "file_id" INTEGER NOT NULL,
    "source" "Source" NOT NULL,
    "line_number" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "raw_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ingested_files_tenant_id_sha256_key" ON "ingested_files"("tenant_id", "sha256");

-- CreateIndex
CREATE INDEX "raw_records_tenant_id_source_idx" ON "raw_records"("tenant_id", "source");

-- CreateIndex
CREATE UNIQUE INDEX "raw_records_file_id_line_number_key" ON "raw_records"("file_id", "line_number");

-- AddForeignKey
ALTER TABLE "ingested_files" ADD CONSTRAINT "ingested_files_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_records" ADD CONSTRAINT "raw_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_records" ADD CONSTRAINT "raw_records_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "ingested_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
