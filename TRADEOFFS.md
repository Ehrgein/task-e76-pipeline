# Tradeoffs

## How a new client is onboarded

**Today:** add an entry to the `tenants` list in `prisma/seed.ts` and run `npm run db:seed`. No new tables, models or code paths are needed; every query is scoped by the tenant row, and nothing in the code branches on a tenant's name.

**Why a const and not an admin endpoint:** time. The const is the smallest thing that satisfies "configuration only", and it gets code review and git history for free.

**What it should become:** an admin endpoint, `POST /admin/tenants`, protected by an admin key, so whoever onboards client three never has to touch the repository, it can also be done by a non developer or any marketing person. It would:

- validate the payload and reject it if a required field is missing;
- refuse to change `slug` or `currency` once the tenant has data, because changing currency after the fact would silently put every reported number in the wrong currency;
- record who changed what, since a database row does not get git history the way a file does.
