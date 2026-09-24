-- Rename only: "kind" becomes "type". Existing alerts are kept as they are.
ALTER TYPE "AlertKind" RENAME TO "AlertType";
ALTER TABLE "pipeline_alerts" RENAME COLUMN "kind" TO "type";
ALTER INDEX "pipeline_alerts_raw_file_id_kind_key" RENAME TO "pipeline_alerts_raw_file_id_type_key";
