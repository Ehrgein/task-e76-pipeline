-- The business day each order counts towards, in its tenant's timezone.
-- Existing orders get it from created_at; new ones are set at staging.
ALTER TABLE "staging_orders" ADD COLUMN "order_date" DATE;

UPDATE "staging_orders" so
SET "order_date" = (so."created_at" AT TIME ZONE t."timezone")::date
FROM "tenants" t
WHERE t."id" = so."tenant_id";

ALTER TABLE "staging_orders" ALTER COLUMN "order_date" SET NOT NULL;

CREATE INDEX "staging_orders_tenant_id_order_date_idx" ON "staging_orders"("tenant_id", "order_date");
