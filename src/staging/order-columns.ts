// For each staging column, the header that holds it in a tenant's order files.
// Every key is required, so a mapping with a column missing fails to compile.
export type StagingOrderColumns = {
  order_id: string;
  created_at: string;
  channel: string;
  gross: string;
  currency: string;
};
