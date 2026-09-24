import { Source, Tenant } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// One file a tenant is expected to send, as listed in manifest.json.
export interface ManifestEntry {
  tenant: string; // the tenant's slug
  source: Source;
  batch: number;
  path: string;
  covers_from: string; // first day the batch covers
  covers_to: string; // last day the batch covers
}

// Every batch the manifest expects from this tenant. The manifest names
// tenants by slug, so that is what we match on. 
export function readManifest(fixturesDir: string, tenant: Tenant): ManifestEntry[] {
  const manifestPath = join(fixturesDir, "manifest.json");
  const manifest: { batches: ManifestEntry[] } = JSON.parse(readFileSync(manifestPath, "utf8"));

  return manifest.batches.filter((entry) => entry.tenant === tenant.slug);
}
