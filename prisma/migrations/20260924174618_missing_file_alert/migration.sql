-- AlterEnum
ALTER TYPE "AlertType" ADD VALUE 'missing_file';

-- DropForeignKey
ALTER TABLE "pipeline_alerts" DROP CONSTRAINT "pipeline_alerts_raw_file_id_fkey";

-- AlterTable
ALTER TABLE "pipeline_alerts" ADD COLUMN     "expected_path" TEXT,
ALTER COLUMN "raw_file_id" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_alerts_tenant_id_type_expected_path_key" ON "pipeline_alerts"("tenant_id", "type", "expected_path");

-- AddForeignKey
ALTER TABLE "pipeline_alerts" ADD CONSTRAINT "pipeline_alerts_raw_file_id_fkey" FOREIGN KEY ("raw_file_id") REFERENCES "raw_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

