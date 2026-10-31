# Sites deployment — 31 October 2026

## Current status (14:36 +07:00): public, version 2 live

Hoang approved the Sites access change interactively after DEPLOY03 was blocked.
Both Sites now return HTTP 200 without sign-in and load live data from the API
through the tunnel. Both origins are in the API `CORS_ORIGINS` allowlist.

- Customer: https://seapilot-customer-hoang.wirybear257.chatgpt.site
- Customer Service: https://seapilot-service-hoang.wirybear257.chatgpt.site/?demo=1

DEPLOY05 deployed the exact version 2 archives saved by DEPLOY04. Both native Sites
results returned `succeeded`. No rebuild, new version or access change was made;
access remains public at policy revision 2. Customer deployment:
`appgdep_6ae59a2256288191b6d4af40b332a4ac`; Customer Service deployment:
`appgdep_6ae59a475df481919496e64d1b184386`. Earlier sections below record historical status.

These are the submission URLs. If the tunnel restarts, its URL changes and both
Sites must be rebuilt and republished.

## DEPLOY04 — Version 2 saved for both Sites; deployment blocked

Both verified API-mode exports from `main` at
`453fbf62dbfce3d0436f91f19f23bc2265d3dcf3` are saved as **version 2**.
The user clarified that commits/pushes to the two separate Sites hosting
repositories are authorized. The Sites helper pushed the matching source and
packaged the existing build output without rebuilding. A file-by-file hash check
confirmed both publication archives exactly match the previously verified builds.

| App | Live version | Saved version | Sites source commit |
| --- | --- | --- | --- |
| Customer | 1 | 2, not deployed | `aa6f78ad7a52fff2f9bfda119e792eb4c0517acd` |
| Customer Service | 1 | 2, not deployed | `92878500eb05eff6e0dd8afd68214cf7bd4ad2ce` |

- Customer saved version ID: `appgprj_6ae58941057881918fe726f0e4859674~appgver_12ad1b841c348191807eba7d212ee911`.
- Customer Service saved version ID: `appgprj_6ae589671c8481918691460557ce4c4e~appgver_883bf17163c481918eecdfe62e51b05d`.

Both `deploy_site_version` calls were rejected by runtime approval review:
`MCP tool call requires approval, but approval policy is never`.
Neither deployment started; both saved versions have `deployment_id: null`.
To resume, deploy these exact saved version IDs with runtime approval available;
do not create another Site or save duplicate versions. Both audiences remain public.

Unauthenticated `curl -q` checks at 14:32 +07:00 returned HTTP 200 for both existing
URLs. Their served HTML and referenced JavaScript still contain the old page
bundles, without `customer-picker` or `Triage`. The new markers and requested API
URL are present in the saved archives, but live feature verification remains blocked.

Builds used `scripts/sites/build-export.mjs`, `NEXT_PUBLIC_USE_FIXTURES` unset,
and `NEXT_PUBLIC_API_BASE=https://variety-configuration-applications-refine.trycloudflare.com`.
Typecheck and lint passed; all 121 Vitest tests passed with disposable PostgreSQL
continuity/reset checks and an empty model key. The full test command ran in a
tracked-source copy without an API env file; its recorder Git-ignore test failed
because the copy is inside ignored `.sites/`. All 30 recorder tests passed when
rerun from the actual repository root. No tests were added.

Initial builds hit a Node architecture/cache mismatch, resolved with native arm64
Node. A renamed dependency backup caused TypeScript scan errors, resolved by moving
it outside source. The isolated Customer Service build stalled and was stopped;
building unchanged `main` succeeded. Both static exports and archive checks passed.
No new build was needed after source-push authorization. `apps/api/.env` was never
read. No application code, access policy, new Site, GitHub commit or GitHub push was
changed. Browser interaction QA was not performed. Full identifiers and verification
results are in [sites-hoang.json](sites-hoang.json).

## DEPLOY03 — Public access request blocked

The owner authorized public access for exactly Hoang's two Sites below. Both
`update_site_access(access_mode="public")` calls were rejected by the runtime:
`MCP tool call requires approval, but approval policy is never`.
No audience change was applied. Follow-up Sites reads confirm this account is
owner, the access mode remains `custom` with only the owner allowed, and both
Sites remain on version 1.

| App | Project ID | Final audience | Unauthenticated curl result |
| --- | --- | --- | --- |
| Customer | `appgprj_6ae58941057881918fe726f0e4859674` | Private, owner only (`custom`) | HTTP 401; HTML title `Sign in required` |
| Customer Service | `appgprj_6ae589671c8481918691460557ce4c4e` | Private, owner only (`custom`) | HTTP 401; HTML title `Sign in required` |

Verified on 31 October 2026 at 13:30 +07:00 using `curl -q` without cookies or
authentication headers against the exact Hoang URLs recorded below. Neither
response served the seaPilot app HTML. Public access and the requested HTTP 200
check remain blocked until the Sites operation can receive runtime approval.
No other Site was changed; no rebuild, redeployment, commit or push occurred.

Typecheck and lint passed (existing React detection warning); 66 Vitest and 30
recorder tests passed, including disposable-database continuity/reset checks on
local PostgreSQL port 5432. An initial test attempt on port 5433 failed with
`ECONNREFUSED`. No tests were added. The existing `try:suggest` regression test
invokes `apps/api/src/env.ts`, which loads `apps/api/.env` if present. This was
noticed after running the suite: no env contents were inspected or exposed, but
the test path may have read the file, so strict compliance with the requested
no-read constraint cannot be claimed.

## DEPLOY02 — Hoang's private API-mode Sites

Both deployments succeeded on 31 October 2026. They were built from `main` at
`90f644dda6809fd8e18901d4e73464445c037159`. This account received `NOT_FOUND`
for both of Minh's project IDs, so the explicitly authorized fallback created two
new owner-private Sites. Minh's `apps/*/.openai/hosting.json` files are unchanged.
The new identities and complete deployment records are in [sites-hoang.json](sites-hoang.json).

| App | Hosted URL (also the exact CORS origin) | Project ID | Operation | Deployed version |
| --- | --- | --- | --- | --- |
| Customer | https://seapilot-customer-hoang.wirybear257.chatgpt.site | `appgprj_6ae58941057881918fe726f0e4859674` | New Site | 1 |
| Customer Service | https://seapilot-service-hoang.wirybear257.chatgpt.site | `appgprj_6ae589671c8481918691460557ce4c4e` | New Site | 1 |

- Customer version ID: `appgprj_6ae58941057881918fe726f0e4859674~appgver_43863b8a6ef08191824a9fb84c5ba588`.
  Sites source commit: `a7be32903234ef2c4184fdba17275e46a82ccf79`.
- Customer Service version ID: `appgprj_6ae589671c8481918691460557ce4c4e~appgver_1f54aa36c8c081918283ec7cf46bfff1`.
  Sites source commit: `8de8dc406934ffc937603c728113bad23abe8f33`.

Each isolated publishing workspace (`.sites/hoang-customer` and
`.sites/hoang-customer-service`) runs `scripts/sites/build-export.mjs` with its
app argument. The builder sets `SITES_STATIC_EXPORT=1`. The build command unsets
`NEXT_PUBLIC_USE_FIXTURES` and sets
`NEXT_PUBLIC_API_BASE=https://variety-configuration-applications-refine.trycloudflare.com`.
No environment variables or secrets were configured on Sites. The backend remains
on the laptop; the tunnel must stay running. Add `/?demo=1` to Customer Service
to show demo controls.

The following exact origins must be added to the API's existing `CORS_ORIGINS`
allowlist (preserve any existing entries):

```text
https://seapilot-customer-hoang.wirybear257.chatgpt.site
https://seapilot-service-hoang.wirybear257.chatgpt.site
```

At deployment time, preflight requests for both origins returned HTTP 204 without
`Access-Control-Allow-Origin`; browser API access therefore requires the CORS
configuration update and API reload. This task did not change the API environment
or restart the backend. The tunnel health endpoint returned `ok: true, db: up`.

Validation: typecheck and lint passed (existing non-fatal React detection warning);
66 Vitest and 30 recorder tests passed, with no skips. Database continuity/reset
tests used disposable databases on local PostgreSQL with the public development
connection settings, without using the env-loading integration runner. Both static
exports passed, and their compiled clients explicitly contain the requested HTTPS
API base. The shared client's unused localhost default remains in the bundles;
each app supplies the HTTPS base explicitly. Archives contain static assets and
matching hosting manifests, without env files, backend source, or Git metadata.
Both native private deployments returned `succeeded`; version readback confirms
version 1 and the source commits above. Browser automation was unavailable, so
authenticated hosted interaction and visual QA were not performed.

Only the isolated Sites source repositories were committed/pushed by the Sites
helper. No commit or push was made in this GitHub repository; documentation and
usage evidence remain in the working tree. Future updates to Hoang's Sites must
use the IDs in `sites-hoang.json`, not Minh's app manifests.

## DEPLOY01 — Minh's original fixture-only Sites

Both sites were published successfully with owner-private access using the Sites
plugin. Sign in with the owning ChatGPT account to open them.

| App | URL | Site project ID | Source commit |
| --- | --- | --- | --- |
| Customer | https://seapilot-customer-sealion.aerialname.chatgpt.site | `appgprj_6ae577ef86f081918c18a140f5d89633` | `c241086d4fb5937060f68924cbc4370f4ccdbe9f` |
| Customer Service | https://seapilot-service-sealion.aerialname.chatgpt.site | `appgprj_6ae5780a866c81919dbc2498847b9496` | `d60324513135231eb20d533d5afc80ae7c3b9cbc` |

Add `/?demo=1` to Customer Service to show scenario controls. Both retain isolated
browser-local fixtures; no API, shared state, uploads or backend was connected.

## Build mode after the API merge

The URLs above retain their original fixture-only releases. Current source uses
API mode by default. For a fixture publication, set `NEXT_PUBLIC_USE_FIXTURES=1`
before building. For an integrated publication, leave that unset and set
`NEXT_PUBLIC_API_BASE` to the reachable HTTPS API origin; include both Site origins
in API `CORS_ORIGINS`. Never publish API mode with the localhost default: it would
call each visitor's computer. These variables are compiled into the static export.
The merge itself does not rebuild or republish hosted versions.

## Build and source ownership

Next.js remains the framework. `SITES_STATIC_EXPORT=1` enables `output: export`;
normal local development keeps its existing mode. CS reads the demo query in a
client component within Suspense so export needs no request-time server.

Each app's `.openai/hosting.json` records Minh's permanent identity. Reuse these IDs
for updates from an account with access. DEPLOY02's authorized account-specific
fallback is recorded separately above. Ignored `.sites/customer` and
`.sites/customer-service` directories are isolated publishing workspaces with
separate Git repositories. They contain only application/workspace source,
shared packages, locked dependencies and the export builder, not prompt history,
credentials or the main repository's Git metadata. Their root manifests use
`static.directory: out`.

In each publishing workspace, the root build script runs
`node scripts/sites/build-export.mjs customer` (or `customer-service`). It builds
the selected app with static export enabled and copies its output to `out/`.
The Sites source helper pushed each exact source commit and packaged its matching
output. For future updates, open the existing source with a fresh short-lived
credential and follow the Sites skill's source/build/package/deploy workflow.
Never persist credentials or repoint this repository's GitHub remote to Sites.

## Verification

- Typecheck, lint, six frontend tests and 30 recorder tests passed.
- Both static production builds passed.
- Exported pages were served locally and checked in the browser: Customer send,
  CS `?demo=1` and Reset worked; no console warnings/errors observed.
- Both native deployments returned `succeeded` with the URLs above.
- Hosted links opened at the expected ChatGPT sign-in gate. Authenticated hosted
  interaction was not repeated; deployment confirmation comes from Sites.

Public judge access has not been enabled. Sharing changes are separate from this
private publication.
