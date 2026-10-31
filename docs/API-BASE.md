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

Database commands are delivered in T02. The API binds to `127.0.0.1:4000`.
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
