-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('pending', 'processing', 'completed', 'failed', 'dead_letter', 'quarantined');

-- AlterEnum
ALTER TYPE "AlertType" ADD VALUE 'dead_letter';

-- CreateTable
CREATE TABLE "file_processing" (
    "raw_file_id" INTEGER NOT NULL,
    "tenant_id" UUID NOT NULL,
    "status" "ProcessingStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_processing_pkey" PRIMARY KEY ("raw_file_id")
);

-- CreateIndex
CREATE INDEX "file_processing_tenant_id_status_idx" ON "file_processing"("tenant_id", "status");

-- AddForeignKey
ALTER TABLE "file_processing" ADD CONSTRAINT "file_processing_raw_file_id_fkey" FOREIGN KEY ("raw_file_id") REFERENCES "raw_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Backfill: every raw file stored before this table existed gets a status.
-- They start as pending; the next staging run moves them on.
INSERT INTO "file_processing" ("raw_file_id", "tenant_id", "status", "attempts", "updated_at")
SELECT "id", "tenant_id", 'pending', 0, CURRENT_TIMESTAMP FROM "raw_files";
