-- AlterTable: existing tenants get the current default headers, then the
-- default is dropped so every new tenant must state its mapping explicitly.
ALTER TABLE "tenants" ADD COLUMN "order_columns" JSONB NOT NULL
  DEFAULT '{"order_id":"order_id","created_at":"created_at","channel":"channel","gross":"gross","currency":"currency"}';
ALTER TABLE "tenants" ALTER COLUMN "order_columns" DROP DEFAULT;
-- CreateTable
CREATE TABLE "staging_orders" (
    "id" SERIAL NOT NULL,
    "tenant_id" UUID NOT NULL,
    "order_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "channel_raw" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "gross" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "raw_file_id" INTEGER NOT NULL,

    CONSTRAINT "staging_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staging_orders_tenant_id_order_id_key" ON "staging_orders"("tenant_id", "order_id");

-- AddForeignKey
ALTER TABLE "staging_orders" ADD CONSTRAINT "staging_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staging_orders" ADD CONSTRAINT "staging_orders_raw_file_id_fkey" FOREIGN KEY ("raw_file_id") REFERENCES "raw_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

