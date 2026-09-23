import { PrismaClient } from '@prisma/client';

// Onboarding a client = adding an entry here (or inserting the row directly).
const tenants = [
  { id: 'lumen', name: 'Lumen', currency: 'EUR', timezone: 'UTC' },
  { id: 'northwind', name: 'Northwind', currency: 'USD', timezone: 'UTC' },
];

async function main() {
  const prisma = new PrismaClient();
  try {
    for (const t of tenants) {
      await prisma.tenant.upsert({ where: { id: t.id }, update: t, create: t });
    }
    console.log(`Seeded ${tenants.length} tenants`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
