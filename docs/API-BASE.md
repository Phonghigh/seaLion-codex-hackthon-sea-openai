# API foundation — merged implementation

The active API is main's integrated implementation, documented in
[apps/api/README.md](../apps/api/README.md). It includes the foundation routes,
CaseStore, model tools, conversation/upload/link/approval routes, and both frontend
API clients.

The competing T01b/T02 scaffold was consolidated into this implementation during
the merge. Use `apps/api/src/index.ts`, `src/env.ts`, `src/demo/service.ts` and the
`0000_messy_shotgun` migration with its matching Drizzle journal/snapshot.
The alternate server, narrow store and second initial migration were removed to
avoid incompatible entry points and duplicate table creation.

Use `apps/api/.env` for API credentials, `pnpm db:up`, `pnpm db:migrate`, and
`pnpm db:reset`. Compose retains main's existing `seapilot_db` volume and port 5432;
the older feature-branch volume on 5433 is not modified or deleted by this merge.
Do not point the main migrator at a database initialized by the alternate branch:
the schemas differ. Use a separate database or an explicit reviewed data migration.

Main's demo clock remains process-local and its controls are serialized per server
process. The branch's durable clock/advisory lock design is not silently combined
with the integrated store. Treat this as a single-process demo, and use HTTP reset
when the server is running.

`pnpm test:api:integration` runs the full suite in a disposable database.
`pnpm test:api:curl` exercises real HTTP continuity with a mocked model, also in a
disposable database. Both retain main's tested contracts and protect existing demo
data. No live model call or hosted deployment is implied by these checks.
