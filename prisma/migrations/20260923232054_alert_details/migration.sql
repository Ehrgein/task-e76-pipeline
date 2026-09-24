-- New alert kind for orders that arrive again with different values.
ALTER TYPE "AlertKind" ADD VALUE 'conflicting_duplicates';

-- columns (text[]) becomes details (jsonb), so an alert can carry more than
-- column names. Existing alerts keep their column list as a JSON array.
ALTER TABLE "pipeline_alerts" ADD COLUMN "details" JSONB;
UPDATE "pipeline_alerts" SET "details" = to_jsonb("columns");
ALTER TABLE "pipeline_alerts" ALTER COLUMN "details" SET NOT NULL;
ALTER TABLE "pipeline_alerts" DROP COLUMN "columns";
