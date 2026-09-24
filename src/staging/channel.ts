// The only channel values that exist after staging.
export type Channel = "direct" | "paid_search" | "paid_social" | "email" | "unmapped";

// Every spelling we've seen, after lowercasing. Add a line here when a new
// spelling turns up; never guess.
const CHANNEL_ALIASES: Record<string, Channel> = {
  direct: "direct",
  google: "paid_search",
  meta: "paid_social",
  facebook: "paid_social",
  fb: "paid_social",
  newsletter: "email",
  email: "email",
};

export function normalizeChannel(raw: string): Channel {
  return CHANNEL_ALIASES[raw.trim().toLowerCase()] ?? "unmapped";
}
