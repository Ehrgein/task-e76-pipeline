-- Drift is checked against the tenant's column mapping only. Unexpected
-- columns are logged, not stored, so the ignore list and its alert type go.
ALTER TABLE "tenants" DROP COLUMN "ignored_order_columns";

-- Postgres can't drop an enum value in place, so the enum is rebuilt without
-- it. The only alerts of that type were raised by earlier tests.
DELETE FROM "pipeline_alerts" WHERE "type" = 'unexpected_columns';
ALTER TYPE "AlertType" RENAME TO "AlertType_old";
CREATE TYPE "AlertType" AS ENUM ('missing_columns', 'duplicate_orders', 'dead_letter');
ALTER TABLE "pipeline_alerts" ALTER COLUMN "type" TYPE "AlertType" USING "type"::text::"AlertType";
DROP TYPE "AlertType_old";
