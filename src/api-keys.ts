// Fake token store standing in for real auth: API key -> tenant slug.
// In production the key would be a signed token (or a hashed key in the
// database) issued at onboarding; here it only needs to show where the tenant
// comes from: the caller's credentials, never the URL or the body.
export const API_KEYS: Record<string, string> = {
  "lumen-dev-key": "lumen",
  "northwind-dev-key": "northwind",
  "acme-dev-key": "acme",
};
