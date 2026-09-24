-- Currency back to plain text: a client in a currency not in the enum should
-- not need a migration to onboard. Codes are validated at onboarding instead.
ALTER TABLE "tenants" ALTER COLUMN "currency" TYPE TEXT USING "currency"::text;

DROP TYPE "Currency";
