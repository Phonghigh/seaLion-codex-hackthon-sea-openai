# Frontend runbook

Customer and Customer Service are independent Next.js App Router apps sharing the
existing shadcn components and design in `DESIGN.md`. By default both read and write
the Hono API; PostgreSQL owns the conversation, evidence, case and approval data.

## Configuration and run

Use Node 20.12+ (or the newer version required by the installed Next.js) and pnpm
10.28.2. Follow [API setup](../apps/api/README.md) for PostgreSQL and the server-only
model configuration. Copy each web app's `.env.example` to `.env.local` as needed:

- `NEXT_PUBLIC_API_BASE`: defaults to `http://127.0.0.1:4000` when empty.
- `NEXT_PUBLIC_USE_FIXTURES=1`: opt into the original independent offline previews.
  Leave unset for API mode. This never silently falls back after an API error.

Both variables are public build-time configuration; rebuild after changing them.
Never put `OPENAI_API_KEY` or `DEMO_RESET_TOKEN` in a web env variable. The demo token
comes from `apps/api/.env`; enter it into the CS demo controls when first prompted.
It is saved only in that origin/tab's `sessionStorage` and sent only to demo routes.
A rejected token is cleared so it can be corrected.

Run `pnpm install`, then `pnpm dev` (all three apps), or start individual apps with
`pnpm dev:customer`, `pnpm dev:cs`, and `pnpm dev:api`. Do not start another API on
4000 if one is already running.

- Customer: <http://127.0.0.1:3000>
- Customer Service: <http://127.0.0.1:3001>
- CS demo controls: <http://127.0.0.1:3001/?demo=1>

The two web origins must be in the API's exact `CORS_ORIGINS` allowlist (the local
3000/3001 origins are included by default). If Next dev fails with the sandbox
Turbopack FSEvent error, use `pnpm build` and the scripted check below. Do not restart
or terminate an existing API to work around a frontend sandbox issue.

## Three-scene walkthrough

1. CS demo bar → Reset; enter the demo token once. The inbox becomes empty.
2. Customer → New conversation; send the Scene 1 text from
   [demo data](../prompts/04-demo-data.md), with the Parcel A sample or an uploaded
   JPEG/PNG/WebP (up to 10 MiB). The CS inbox refreshes automatically.
3. CS → Signed in as An → select conversation → Suggest. Enter a new case title,
   use/edit the suggested reply, and Approve and send. This creates the case,
   attaches pending evidence and saves the reply. Customer sees it on refresh.
4. CS → Next day. Customer → New conversation → send Scene 2 text.
5. CS → Signed in as Binh → select new conversation → Suggest → Link to CS001.
   Run Suggest again to review the newly attached context, then use/edit the reply
   and Approve and send. The prior Parcel A evidence remains available.
6. Customer → send Scene 3 text and the Parcel B sample. CS → Suggest → Approve
   escalation. Only after it succeeds can the CS agent approve the reply.

An maps to `CS_A`, Binh to `CS_B`. Changing the switcher alone never changes case
ownership; link and approval operations carry that actor to the API. Replies and
escalations have separate approvals. The UI shows Sent/Escalated only after success;
failed model/approval requests disable approval until a fresh Suggest succeeds.
New conversation/evidence/shipment data invalidates the old suggestion. Polling
refreshes conversations every two seconds without overwriting an edited draft.

Start from Demo 2 loads the API's After Demo 1 state (CONV1, CS001, EV1, day 0).
Use Next day and create the returning conversation on Customer to continue Scene 2.
Reset/Next day/Start from Demo 2 affect shared data; they are not local UI controls.
Offline fixture mode retains the old local Reset and scene controls in each site.

## Checks and boundaries

Run from the repo root:

```sh
pnpm typecheck
pnpm lint
pnpm --filter @seapilot/api exec tsx scripts/test-isolated.ts
pnpm build
```

`test-isolated.ts` loads the existing API env without printing secrets, creates a
migrated disposable database, invokes `pnpm test` with the real API key forced empty,
and removes the database afterward. It leaves the configured demo database and
port 4000 alone. `apps/api/tests/web-client.test.ts` imports both apps' actual
`src/lib/api.ts` client factories, routes fetch into the Hono app, and runs all three
scenes three times after Reset using a mocked Responses client and real PostgreSQL.
It also covers malformed/error envelopes, token isolation, jump, multipart upload,
no-op assignment and event order. Plain `pnpm test` skips database tests when no
`DATABASE_URL` is supplied; use the isolated runner for full coverage.

Client/schema integration is verified by these tests, and both production bundles
build. Browser rendering, focus/keyboard behavior, responsive layouts, file picker,
token dialog/session persistence and visible cross-site polling/approval feedback
have not been visually verified for this integration. Live model behavior and
hosted deployment are also unverified. Existing visual tokens and layout classes
are preserved; no dependency, deployment, commit or push is part of this task.

## Implementation boundaries

- Each app's `src/lib/api.ts` configures the shared, browser-safe typed client in
  `packages/contracts/src/client.ts`; all successful payloads are Zod-validated.
- Workspace routes use `{ ok, data }`; suggest uses `{ ok, suggestion }`; context
  and shipments return their data directly. The client normalizes these into a
  discriminated `{ ok, data, error }` result and catches network/parse failures.
- `fixture-*` components are selected only by `NEXT_PUBLIC_USE_FIXTURES=1`.
  `packages/demo` is not consulted by API-backed components.
- Evidence bytes are served from the API; seeded JPEGs are labeled illustrations.
  The Customer site keeps the existing Lan scenario; CS lists all conversations.

## Existing Sites deployments

[Sites deployment records](SITES-DEPLOYMENT.md) retain both project IDs and the
earlier fixture-only releases. Static export is supported with
`SITES_STATIC_EXPORT=1`; CS resolves its query string in a client Suspense boundary
and retains `NEXT_PUBLIC_USE_FIXTURES`. A future API-mode publication needs a
reachable `NEXT_PUBLIC_API_BASE` and matching API CORS origins. This merge does
not publish or change the hosted versions.


## Draft recovery and connection feedback

CS draft text and new-case titles survive switching conversations within the current
page. Approval readiness does not: run Suggest again after returning to a thread.
Generating a different reply preserves existing text and asks whether to replace it
or keep the edited draft. Closing the comparison keeps approval blocked until that
choice is reviewed. Failed generation preserves text and disables approval.
Drafts are held in memory, not local storage; reload and local demo reset/jump clear
them. Advancing the day retains text and invalidates the suggestion.

The Demo badge is independent of connection status. Customer conversation and order
read errors have contextual Retry controls; stale orders remain visibly marked.
Successful polling clears read errors without clearing unrelated send errors.

### Sea visual refactor

The current visual specification is root `DESIGN.md`: cobalt customer welcome,
midnight CS navigation, cool work surfaces, existing mascot, and mobile CS branding.
The visual refactor applies to API and fixture components; the hosted fixture builds
are unchanged until explicitly redeployed. Local visual evidence is in
`.impeccable/review/sea-redesign/` (ignored review artifacts).
