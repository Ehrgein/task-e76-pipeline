import { PrismaClient } from "@prisma/client";
import { StagingOrderColumns } from "../src/staging/order-columns";

type TenantConfig = {
  slug: string; // must match the "tenant" value used in manifest.json
  name: string;
  currency: string; // ISO 4217 code, e.g. "EUR"
  timezone: string; // IANA zone, e.g. "UTC" or "Europe/London"
  rawOrderColumns: string[]; // every column their order files contain
  stagingOrderColumns: StagingOrderColumns; // the header staging reads for each staging column
};

// Both current tenants happen to use the same order headers. A client whose
// file says "OrderNumber" instead of "order_id" just gets its own mapping.
const DEFAULT_STAGING_ORDER_COLUMNS: StagingOrderColumns = {
  order_id: "order_id",
  created_at: "created_at",
  channel: "channel",
  gross: "gross",
  currency: "currency",
};

// The header of the order files as they arrive, written out rather than
// derived from the staging mapping, so the check in main() compares two
// independent lists. customer_email is in the file but not staged: it is
// personal data and not needed for revenue.
const DEFAULT_RAW_ORDER_COLUMNS = [
  "order_id",
  "created_at",
  "channel",
  "gross",
  "currency",
  "customer_email",
];

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
    rawOrderColumns: DEFAULT_RAW_ORDER_COLUMNS,
    stagingOrderColumns: DEFAULT_STAGING_ORDER_COLUMNS,
  },
  {
    slug: "northwind",
    name: "Northwind",
    currency: "USD",
    timezone: "UTC",
    rawOrderColumns: DEFAULT_RAW_ORDER_COLUMNS,
    stagingOrderColumns: DEFAULT_STAGING_ORDER_COLUMNS,
  },
  // Demo tenant, not part of the provided fixtures: its order files use
  // different header names, to show a new client is onboarded by config only.
  {
    slug: "acme",
    name: "Acme",
    currency: "GBP",
    timezone: "UTC",
    rawOrderColumns: ["OrderNumber", "Date", "Source", "Total", "Curr"],
    stagingOrderColumns: {
      order_id: "OrderNumber",
      created_at: "Date",
      channel: "Source",
      gross: "Total",
      currency: "Curr",
    },
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

      // Staging can only read columns the file actually has. A typo here
      // would otherwise quarantine every file with a confusing error.
      const stagingHeaders = Object.values(t.stagingOrderColumns);
      const missingFromRaw = stagingHeaders.filter(
        (header) => !t.rawOrderColumns.includes(header),
      );

      if (missingFromRaw.length > 0) {
        throw new Error(
          `Tenant ${t.slug}: stagingOrderColumns references headers not in rawOrderColumns: ${missingFromRaw.join(", ")}`,
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
