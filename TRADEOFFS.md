# Tradeoffs

## How a new client is onboarded

**Today:** add an entry to the `tenants` list in `prisma/seed.ts` and run `npm run db:seed`. No new tables, models or code paths are needed; every query is scoped by the tenant row, and nothing in the code branches on a tenant's name.

**Why the seed file and not an admin endpoint:** time. The seed file is the smallest thing that satisfies "configuration only", and it gets code review and git history for free.

**What it should become:** an admin endpoint, `POST /admin/tenants`, protected by an admin key, so whoever onboards client three never has to touch the repository, it can also be done by a non developer or any marketing person. It would:

- validate the payload and reject it if a required field is missing;
- refuse to change `slug` or `currency` once the tenant has data, because changing currency after the fact would silently put every reported number in the wrong currency;
- record who changed what, since a database row does not get git history the way a file does.

## Only orders are staged

The main reason for this is time. Email Events have a different configuration than a simple csv file (they are .ndjson) so adapting the whole format to it would take more time. After implementing it we could clearly get important business information such as, example:

Email Campaign (cmp_102, hypothetically)

- Is our Email campaign (say cmp_102) succesful for tthe last 30 days?
- When was it the most succesful?
- How many subscribers did we lose?
- How many opened it?

The information is all there and business inteligence can be reasoned easily, it just didn't match the scope for me. Revenue felt like it would be more important to show at this stage as it can be audited, campaigns are something to be analyzed rather than reported.

## Gross Revenue only

Net revenue would need refund, but we would also need to know how net is calculated by Finance, so I deferred it (also, time). Gross is easily calculated by orders, so it would be a quick business view.

## Missing Files

Missing files are designed, but the only thing that it currently does is create an alert on the alerts table. Why? We do not know exactly how the client would prefer to see this. Should it trigger an alert on a Slack channel? Email? Should it be resolved automatically? Should a human be in the loop? Most of this is unclear, so I opted for simply logging it, and then ask clarification to the client.

Additionally, the grace period for a file tto be considered missing is 24 hours. This is to the client's discretion and it could, again, be auto resolved. This just solves the problem with a quick solution (again, time).

## Adding a third client

Adding a third client is quite simple. The only changes that are required are to update the `manifest.json` file for the files that SHOULD arrive via ingestion, with the following template:

    {
      "tenant": "northwind",
      "source": "orders",
      "batch": 2,
      "path": "northwind/orders/batch_02.csv",
      "covers_from": "2026-01-12",
      "covers_to": "2026-01-17"
    },

Importantly, all values here are required. A path to the file (in this case its a local file, but it would likely be a cloud service, or just a URL in general), a tenant name (potentially best id, kept simple intentionally given its not a real production environment), batch number (order matters), and days where its covered.

The covers_to specially is important here as it dictates when a file is considered missing (24 hours after covers_to).

It also requires to add the tenant under the `seed.ts` file following this example:

{
slug: "lumen",
name: "Lumen",
currency: "EUR",
timezone: "UTC",
rawOrderColumns: DEFAULT_RAW_ORDER_COLUMNS,
stagingOrderColumns: DEFAULT_STAGING_ORDER_COLUMNS,
},

Raw order columns are the columns that the client considers that a source (in this case orders) should have. This would, however, need updates when adding ad_events, for example, should the structure diverge.

It was done like so in the interest of time, but we are aware of the required changes when adding other sources.

## No event queue

There's no event queue in the application due to time, and ingesting a file automatically stages it. There's code comments for it, but in general you would likely create a pipeline/event queue to dispatch this to a staging area.

## Late Arrivals

Intentionally not done due to time. When a day is reported, its total is saved in a ReportedDays table and never changed (immutable, never restate, a ledger). An order whose day is already there, goes to OrderAdjustments instead, and both are shown side by side:

```
{
    Reported: $100
    Adjustments: $50
}
```

This gives us transparency, it never restates a total. We could also include an alert or log to determine what the cause of late arrivals is.

## Potential Improvements if I had more time

- Event queue for staging files

- Properly including telemetry/observability. The application currently just adds an entry for most errors (missing file, duplicate orders found), but in reality you would set up something like Sentry, Grafana to track these kinds of things. If notifying the client/paging is important for things such as missing files, a Slack integration/Email could be set up as well for proper followups.

- There's no retry scheduler right now, if a file fails 3 times during ingestion, it gets marked as dead letter. This would ideally trigger an alert on Sentry if used, or a notification of some sort to developers/clients.

- Admin endpoint/ui for setting up users. Developers might not be available to add a new tenant, so adding a marketing/sales/owner endpoint where an onboarding step could add tenants eliminates the need for a developer to exist and focus on more important tasks instead.

- Tenant Isolation is not using RLS currently, which would be the ideal way to do things. Had I had more time, I probably would have set up a Supabase service with proper RLS (also, auth for free) rather than query filtering by tenant. We could also simply just set it up on Postgres if a secondary service just for RLS/Auth wasnt needed.

- Auth/API key generation. Currently, the auth is a "fake" store lookup of tenants. You pass a secret key, and it returns your tenant. While this works, its not ideal. Either an API key endpoint, or an auth system where decoding a JWT would give you your workspace directly. Fortunately, the key store at least satisfies the requirementt of "A URL shouldnt show other client's data", as its a "secret key" (very guessable for demo purposes)

## Hardest thing from the brief

To decide what not to build. There's many different things that work, but might not be efficient. And the most difficult part to me was to decide if how ingestion should be approached. Not because there's a bad way to do it, but we would need to know several things.

- Does the client send us the files manually through their admin/inner tool dashboard?
- Do we listen to a webhook?
- Is it time based? Should we build a cron job for it?

Many of these questions require domain knowledge and for us to understand how the client operates, and all of themn have tradeoffs. Choosing one architecture over the other has conventions that must be followed by adjacent services.

Deciding the schema model for tenants (the columns, staging, etc) had its complexity for all of the reasons above, as we do not want to risk schema drift.
