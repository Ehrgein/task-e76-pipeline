-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'EUR', 'GBP', 'CAD', 'AUD');

-- AlterTable: convert existing values in place instead of dropping the column
ALTER TABLE "tenants" ALTER COLUMN "currency" TYPE "Currency" USING "currency"::"Currency";
