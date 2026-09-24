-- CreateEnum
CREATE TYPE "AlertKind" AS ENUM ('missing_columns', 'unexpected_columns');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "ignored_order_columns" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "pipeline_alerts" (
    "id" SERIAL NOT NULL,
    "tenant_id" UUID NOT NULL,
    "raw_file_id" INTEGER NOT NULL,
    "kind" "AlertKind" NOT NULL,
    "columns" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "pipeline_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_alerts_raw_file_id_kind_key" ON "pipeline_alerts"("raw_file_id", "kind");

-- AddForeignKey
ALTER TABLE "pipeline_alerts" ADD CONSTRAINT "pipeline_alerts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_alerts" ADD CONSTRAINT "pipeline_alerts_raw_file_id_fkey" FOREIGN KEY ("raw_file_id") REFERENCES "raw_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

