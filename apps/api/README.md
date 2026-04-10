# @sc-site/api

Hono backend on Bun for the sc-site catalog. Reads ship data from the SQLite
DB at `<repo>/data/sc.db` via `@sc-site/db` (Drizzle). All responses use a
consistent `{ data, meta }` envelope; errors use `{ error, meta }`.

## Run

```bash
cd apps/api
bun run dev          # hot-reload on :3001
# or
bun run src/index.ts
```

Env vars (all optional in dev):

- `PORT` — default `3001`
- `SC_SITE_DB_PATH` — override the SQLite path (else `<repo>/data/sc.db`)
- `ADMIN_SECRET` — gates `POST /admin/*`; dev mode accepts any bearer
- `UEX_API_TOKEN` — forwarded to the refresh orchestrator (wave 2)

## Routes

- `GET /health` — liveness + DB row counts
- `GET /vehicles` — paged list, filters: `company`, `size`, `is_exploration`, `limit`, `offset`
- `GET /vehicles/:slug` — single ship with joined hardpoints + damage resistance
- `GET /vehicles/:slug/hardpoints` — hardpoints only
- `GET /manufacturers` — all manufacturers
- `POST /admin/refresh/vehicles` — bearer-gated UEX refresh trigger (stubbed until wave 2)

## Envelope

Success:

```json
{
  "data": { ... },
  "meta": { "updatedAt": "...", "source": "sc.db", "count": 0, "total": 0 }
}
```

Error:

```json
{
  "error": { "code": "NOT_FOUND", "message": "...", "requestId": "..." },
  "meta": { "updatedAt": "...", "requestId": "..." }
}
```

## RPC client

The typed app instance is exported for end-to-end type-safe calls from
apps/web:

```ts
import { hc } from "hono/client";
import type { AppType } from "@sc-site/api/types";

const api = hc<AppType>("http://localhost:3001");
const res = await api.vehicles.$get({ query: { limit: "50" } });
const body = await res.json();
//    ^? { data: ShipDto[]; meta: { ... } }
```
