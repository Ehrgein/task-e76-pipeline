# Ingestion pipeline

Ingests each tenant's exports (orders, refunds, email events, ad spend) into Postgres, turns orders into daily revenue, and serves it through an API. One codebase for every tenant; a new tenant is configuration only.

## Requirements

- Node 20+
- Docker (Postgres runs in a container on port 5433)

## Install

```bash
npm install
cp .env.example .env              # PowerShell: copy .env.example .env
docker compose up -d --wait       # or: npm run db:up
npm run db:deploy                 # migrations
npm run db:seed                   # tenants
```

## Run

```bash
npm run start                     # http://localhost:3000
```

Every request needs an `x-api-key` header: `lumen-dev-key`, `northwind-dev-key` or `acme-dev-key`.

```bash
curl -X POST -H "x-api-key: lumen-dev-key" localhost:3000/ingestions   # load the fixture files
curl -H "x-api-key: lumen-dev-key" localhost:3000/revenue              # daily gross revenue
curl -H "x-api-key: lumen-dev-key" localhost:3000/files                # stored files and their status
curl -H "x-api-key: lumen-dev-key" localhost:3000/alerts               # problems found
```

## Status

**Done:** raw storage for all four sources, orders → daily revenue (matches `finance_summary.csv` to the cent), safe re-runs, schema-drift and duplicate alerts for orders, missing file alerts, tenants by configuration (`acme` is a demo tenant we added).

**Not done:** late arrivals / never restating reported days, staging for refunds, email events and ad spend. Details in [TRADEOFFS.md](TRADEOFFS.md) and [QUESTIONS.md](QUESTIONS.md).
