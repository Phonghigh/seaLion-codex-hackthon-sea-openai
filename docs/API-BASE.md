# API foundation

`apps/api` uses Hono on Node 20.12+ (Node 20's `loadEnvFile` is required),
PostgreSQL 16 and Drizzle. The frontend apps remain unchanged on 3000/3001.
Their integration contract is `NEXT_PUBLIC_API_BASE`, eventually set to the API
or tunnel origin at build time. No frontend wiring or model calls are included.

## Local startup

```sh
docker compose up -d db
pnpm db:migrate
pnpm db:reset
pnpm dev:api
```

The API binds to `127.0.0.1:4000`.
Postgres is loopback-only on **5433**, because 5432 was occupied on the development
machine. Override `POSTGRES_PORT` and `DATABASE_URL` together if needed. The
Compose password and matching URL default are local-demo-only values; set both
`POSTGRES_PASSWORD` and `DATABASE_URL` to override them. Root `.env` is loaded
without overwriting existing environment variables. `.env.example` lists names.

Set `CORS_ORIGINS` to comma-separated exact origins (no trailing slash), e.g.
`http://localhost:3000,http://localhost:3001`, adding hosted Sites origins when
integrating. Set a nonempty `DEMO_RESET_TOKEN` for HTTP mutations. There is no
default HTTP token. Public GET health/files do not require a token. CORS preflight
runs before authentication; origins not on the allowlist get no CORS grant.

`pnpm tunnel` runs `cloudflared tunnel --url http://127.0.0.1:4000` when
cloudflared is installed. Starting a public tunnel is not part of local validation.

## Files

`GET /files/parcel_a.svg` and `/files/parcel_b_open.svg` serve labelled sample
illustrations from `apps/api/public/demo`. The `.jpg` photos named in the original
fixture are absent; these assets are explicitly not customer photos. The seed
uses these sample paths until actual demo photos are supplied.

## Validation

`pnpm typecheck`, `pnpm lint`, `pnpm test`; API-only tests: `pnpm test:api`.
Use `curl http://127.0.0.1:4000/api/health` for the public liveness route.


## Demo contract

| Route | Authentication | Result |
| --- | --- | --- |
| `GET /api/health` | Public | Liveness and current server time (not database readiness) |
| `GET /files/*` | Public | Sample illustration or 404 |
| `POST /api/demo/reset` | `x-demo-token` | Atomically restore Start, day 0 09:00 Vietnam |
| `POST /api/demo/jump?to=demo2` | `x-demo-token` | Atomically restore After Demo 1; B is still in transit |
| `POST /api/demo/advance-day` | `x-demo-token` | Advance clock one day; deliver DH001 parcel B and record its transition once |

The jump deliberately follows `prompts/04-demo-data.md`: run advance-day separately
to start Demo 2. It does not fabricate CONV2 or reassign the case. Replies retain
`shipment_snapshot` and CS_A approval attribution. Reset/jump replace all demo
tables in one transaction; a shared PostgreSQL advisory lock serializes these
operations with advance-day across API processes. The clock lives in PostgreSQL.
All successful mutations return `{ ok: true, day, now, scene }` after commit.
Missing/wrong tokens return 401; absent server token disables mutations with 503;
invalid jump target returns 400; database failure returns generic 500, never success.

Seeds include CUST001/DH001, CUST002/DH002 and CUST003/DH003. Unspecified secondary
order timestamps/statuses and DH003 carrier/tracking use demo defaults; no unknown
DH003 line-item facts are invented. Original jpg evidence paths map to the labelled
SVG placeholders above. No actual customer photo, upload route, AI execution,
general conversation CRUD, approval or frontend synchronization is included.

## Verification commands

```sh
pnpm test:api:integration
node scripts/api/smoke.mjs
```

Integration tests create and remove a disposable database using the configured
Postgres role (requires CREATEDB); `TEST_DATABASE_URL` may select a dedicated
Postgres server. They exercise the real migration and store without resetting
the operator's database. Smoke checks use curl against the running API and the
root `.env` token, ending with a reset to Start. They validate health, files, CORS,
preflight, token guards, invalid jumps and each successful mutation. The token is
passed through curl stdin, not arguments or printed output.

Validated on 31 October: Docker startup, migration, CLI reset, 42 unit/tooling
checks, three real PostgreSQL integration tests and all curl checks passed.
Both frontend directories remain byte-for-byte unchanged from the pre-task commit.
Cloudflared is not installed on this computer; the configured `pnpm tunnel`
command requires installing that CLI before public tunnel use. No public API tunnel
was started or claimed as verified.

Implementation references: [Hono Node adapter](https://hono.dev/docs/getting-started/nodejs),
[Hono CORS](https://hono.dev/docs/middleware/builtin/cors), and
[Drizzle migrations](https://orm.drizzle.team/docs/migrations).
