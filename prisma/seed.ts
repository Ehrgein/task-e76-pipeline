import { PrismaClient } from "@prisma/client";
import { OrderColumns } from "../src/staging/order-columns";

type TenantConfig = {
  slug: string; // must match the "tenant" value used in manifest.json
  name: string;
  currency: string; // ISO 4217 code, e.g. "EUR"
  timezone: string; // IANA zone, e.g. "UTC" or "Europe/London"
  orderColumns: OrderColumns; // header in their order files for each staging column
};

// Both current tenants happen to use the same order headers. A client whose
// file says "OrderNumber" instead of "order_id" just gets its own mapping.
const DEFAULT_ORDER_COLUMNS: OrderColumns = {
  order_id: "order_id",
  created_at: "created_at",
  channel: "channel",
  gross: "gross",
  currency: "currency",
};

// Every ISO 4217 code Node knows about. Rejects typos like "EUROS" without us
// maintaining a list, so a client in any real currency onboards unblocked.
const VALID_CURRENCIES = new Set(Intl.supportedValuesOf("currency"));

// Onboarding a client = adding an entry here and running `npm run db:seed`.
//
// In the interest of time, tenant configuration is a const in this file. The
// intended design is an admin endpoint (POST /admin/tenants, behind an admin
// key) that could be called from a specific UI, this avoids developer intervention for onboarding:
// it would validate the payload, and refuse to change slug or currency once the tenant
// has data. A YAML file would also do here.
// See TRADEOFFS.md.
const tenants: TenantConfig[] = [
  {
    slug: "lumen",
    name: "Lumen",
    currency: "EUR",
    timezone: "UTC",
    orderColumns: DEFAULT_ORDER_COLUMNS,
  },
  {
    slug: "northwind",
    name: "Northwind",
    currency: "USD",
    timezone: "UTC",
    orderColumns: DEFAULT_ORDER_COLUMNS,
  },
];

async function main() {
  const prisma = new PrismaClient();
  try {
    for (const t of tenants) {
      if (!VALID_CURRENCIES.has(t.currency)) {
        throw new Error(
          `Tenant ${t.slug}: "${t.currency}" is not an ISO 4217 currency code`,
        );
      }

      await prisma.tenant.upsert({
        where: { slug: t.slug },
        update: t,
        create: t,
      });
    }
    console.log(`Seeded ${tenants.length} tenants`);
  } finally {
    await prisma.$disconnect();
  }
}

// oprhan

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
