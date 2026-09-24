-- The mapping staging reads keeps its data under a clearer name.
ALTER TABLE "tenants" RENAME COLUMN "order_columns" TO "staging_order_columns";

-- Every column a tenant's order file contains. Existing tenants get the
-- headers their files have today; the default is then dropped so every new
-- tenant must state its own.
ALTER TABLE "tenants" ADD COLUMN "raw_order_columns" TEXT[] NOT NULL
  DEFAULT ARRAY['order_id', 'created_at', 'channel', 'gross', 'currency', 'customer_email'];
ALTER TABLE "tenants" ALTER COLUMN "raw_order_columns" DROP DEFAULT;

-- A column outside raw_order_columns is flagged again, now against config.
ALTER TYPE "AlertType" ADD VALUE 'unexpected_columns';
