# Questions

Each question says what we are assuming in the meantime, so the pipeline keeps running while you decide.

## 1. Is Lumen's finance export in EUR or USD?

Lumen's orders are in EUR; `finance_summary.csv` labels the same amounts USD. The amounts match exactly, so no conversion happened: one of the two labels is wrong.

**Assuming:** EUR, as the orders say.

## 2. How does finance calculate net revenue?

On some days `net_reported` is higher than `gross_reported`, which refunds alone can't explain. We also don't know whether a refund counts on the day of the refund or the day of the original order.

That is to say, over the month net is higher than gross for both brands (should be lower) so even though refunds are not applied to our calculations, net shouldnt be higher regardless. The math suggests that refunds are not the issue here either, my first hypothesis was that refunds were being counted as revenue, but thats not the case.

The daily gap between net and gross is small (about −65 to +100) and changes sign from day to day, while refunds run to hundreds per day. Adding or subtracting refunds, by refund date or order date, doesn't reproduce net on any day.

**Assuming:** we report gross only until this is clear.

## 3. When is a day "reported"?

Your board sees weekly numbers. We need to know when a week counts as reported, since from then on any late order for it is shown as an adjustment next to the reported number, never by changing it.

**Assuming:** nothing is frozen yet.

## 4. If the same order arrives twice with different values, which copy is right?

There are some duplicates on our file, and luckily, the values are the same. What happens however, when the numbers vary? Will this ever be the case?
**Assuming:** No assumption here, we are removing duplicates and treating the first one we see as accurate (we are alerting this, also)

## 5. How do your files reach us, and how long should we wait before calling one missing?

By upload, webhook, or on a schedule? Today we expect each batch within 24 hours of the last day it covers.
**Assuming:** 24 hours, checked daily at 02:00 UTC.

## 6. How do you want to hear about problems?

Missing files, changed columns and duplicate orders are recorded as alerts. They can be queried for a UI, for example, yet they don't do anything on their own. Should they reach you by Slack, email, or a dashboard? Additionally, how would we mark them as resolved, if dashboard is the answer?

**Assuming:** they are recorded and logged only.

## 7. Should channel names be unified across brands?

Lumen says `Meta` and `Newsletter` where Northwind says `facebook` and `email`.

**Assuming:** we group them as `paid_social` (Meta, facebook), `email` (Newsletter, email), `paid_search` (Google) and `direct`. An unknown name is stored as `unmapped` and the original is kept, so nothing is lost.

## 8. Do ad campaigns and email campaigns share IDs?

Lumen's ad and email campaign IDs never overlap; Northwind's do, but a Facebook ad receiving email opens suggests the overlap is a coincidence. For example:

```
lumen     ad spend:      2026-01-06, camp-400, Meta, 273.04
lumen     email events:  campaign_id is always cmp_100 ... cmp_111   (camp-400 never appears)

northwind ad spend:      2026-01-06, cmp_100, facebook, 341.92
northwind email events:  {"type": "open", "campaign_id": "cmp_100", ...}
```

The Northwind `cmp_100` is a Facebook ad, yet emails are recorded as opened from it.

**Assuming:** ad spend and email events are not linked by campaign ID.
