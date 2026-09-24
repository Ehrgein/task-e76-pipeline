-- Duplicates are now reported whenever an order id was already staged from
-- another file, not only when the values differ. Rename only; rows are kept.
ALTER TYPE "AlertType" RENAME VALUE 'conflicting_duplicates' TO 'duplicate_orders';
