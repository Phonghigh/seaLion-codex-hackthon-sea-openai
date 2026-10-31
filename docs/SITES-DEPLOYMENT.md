# Sites deployment — 31 October 2026

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

Each app's `.openai/hosting.json` records its permanent identity. Reuse these IDs
for updates; do not create replacement Sites. Ignored `.sites/customer` and
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
