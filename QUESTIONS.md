# Questions

Each question lists what we are assuming in the meantime, so the pipeline keeps running while you decide.

## 1. Should channel names be unified across brands?

The two brands name the same channels differently:

| Lumen | Northwind |
|---|---|
| Direct | direct |
| Google | google |
| Meta | facebook |
| Newsletter | email |

Capitalisation differences we treat as the same value. The real question is whether `Meta` and `facebook` are the same channel, and whether `Newsletter` and `email` are, so that channel numbers can be compared across brands.

**Assuming in the meantime:** we map every value, after lowercasing, onto one short list: `direct`, `paid_search` (google), `paid_social` (meta, facebook, fb), `email` (newsletter, email). A value we have not seen before, including a misspelling such as "Facaebook", is recorded as `unmapped` and raised as an alert, never guessed. The order still counts towards revenue, and the original value is kept alongside, so correcting a mapping later loses nothing.

**Please confirm** the groupings above, and tell us about any channel names your team uses that are not in this table.

## 2. Do ad campaigns and email campaigns share IDs?

Both the ad spend and the email events carry a `campaign_id`, but they do not line up consistently:

- **Lumen:** ad spend uses `camp-400` to `camp-402` (Meta, Google, Newsletter); email events use `cmp_100` to `cmp_111`. No ID appears in both.
- **Northwind:** ad spend uses `cmp_100` to `cmp_102`, and the same IDs appear in email events. But `cmp_100` is a facebook ad in the spend data, and email events record opens and clicks against it, which a facebook ad would not produce.

**Assuming in the meantime:** ad spend and email events are separate data. We do not join them on `campaign_id`, and we report no cost-per-click or cost-per-open by campaign.

**Please confirm** whether an ad campaign and an email campaign with the same ID are the same campaign, and if so, what links Lumen's `camp-4xx` IDs to its `cmp_1xx` IDs.
