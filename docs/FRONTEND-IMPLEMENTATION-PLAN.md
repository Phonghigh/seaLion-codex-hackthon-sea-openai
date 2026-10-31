# seaPilot frontend foundation — implementation plan

Current merged status: main adds the API and frontend clients described in
[FRONTEND-BASE.md](FRONTEND-BASE.md). The independent-fixture/deferred-integration
statements below record the earlier FE delivery scope, not the current default.
Existing Sites releases still serve their original fixture builds; no deployment
is performed by this merge.

Current integration update (31 October 2026): both apps now use the Hono API by
default; the original offline UI remains behind `NEXT_PUBLIC_USE_FIXTURES=1`.
The user's new integration request supersedes API deferral statements in the
historical foundation plan below. See [the current runbook](FRONTEND-BASE.md) for
configuration, completed client/database checks and outstanding visual QA.

Historical foundation status: frontend base and shadcn/branding refinement implemented, 31 October 2026.
Two independent Next.js sites run with **separate in-memory fixtures**. The user
explicitly deferred API discovery and integration: no shared HTTP mock service,
API client or cross-window synchronization is included in this phase. A subsequent
user request authorized private Sites deployment; see [SITES-DEPLOYMENT.md](SITES-DEPLOYMENT.md).
See [FRONTEND-BASE.md](FRONTEND-BASE.md) for run instructions and
[FRONTEND-QA.md](FRONTEND-QA.md) for verification and remaining limits.

## 1. Outcome and source of truth

Build two independently deployable Next.js sites in one repository: a Customer
site and a Customer Service site. Together they demonstrate the customer-to-CS workflow with
deterministic local fixtures. A future integration phase can connect them through
a shared backend adapter. The central experience is continuing one case across conversations and
agents, with visible evidence, changed facts, and explicit approvals.

Priority follows [PRODUCT-BRIEF.md](PRODUCT-BRIEF.md), especially sections 2, 4–6.
[AGENTS.md](../AGENTS.md) governs implementation rules and the stack.
[Build prompts](../prompts/02-build-tasks.md) and
[demo data](../prompts/04-demo-data.md) provide existing contracts and fixtures.
The incoming [architecture](Architecture.md) and [demo runbook](DEMO-RUNBOOK.md)
preserve backend integration targets. Their Vite/static scaffold and API port
assumptions must be adapted to the existing two-site Next.js/shadcn workspace.

Current checkout includes both Next.js applications, shared UI/contracts/demo
packages, workspace scripts, a pinned lockfile and the Codex usage recorder.

### Scope and cut line

| Stage | Frontend deliverable | Completion boundary |
| --- | --- | --- |
| P0 foundation | Routes, shared shell, design tokens, accessible primitives, typed fixtures and data adapter | Navigable and responsive without backend credentials |
| P0 demo | Customer chat, CS workspace, case linking, history, source badges, changed facts, editable replies, separate action approval, demo controls | Scenes 1–3 demonstrated locally; cross-site synchronization deferred |
| P2 extension | Triage card, routing reason, owner/shift display, Auto-handled tab, Scene 0 | Only after the core flow works and automatic-reply policy is reconciled |
| P3 extension | Ambiguous English request and fallback routing, Scene 4 | Only after P2; safe to omit from the core demo |

Exclude real authentication, live OpenAI/Supabase integration, real carrier APIs,
email/app channels, dashboards, vector search, manager configuration editors,
voice, and PDF/pitch generation from the frontend foundation. The mock case-create
and escalation flows are UI demonstrations, not completed backend integrations.

## 2. Next.js and Sites approach

Use **Next.js App Router + strict TypeScript + Tailwind CSS + shadcn/ui**, as
requested, in the current repository. Preserve its documentation, prompts,
configuration, recorder, and skill files when scaffolding. Use a pnpm workspace
with `apps/customer` and `apps/customer-service`, each with its own Next.js app,
package scripts, layout, environment configuration and independent build output.
Share UI primitives, schemas and API contracts through workspace packages.
This two-site requirement supersedes the earlier single-app route layout in
`AGENTS.md` and the build prompts; reconcile those paths during implementation.

Sites has been consulted through its skill and available tools. Its native tools
register, version and publish Sites; there is no separate planning/code-generation
request endpoint. The Sites skill directs local implementation. Its default
hosted server starter is Vinext on Cloudflare Workers, which differs from this
repository's Next.js/Vercel stack.

The implemented base uses the **Sites local-only workflow** in this
checkout and retain actual Next.js. Do not substitute Vinext or create a second
application repository. Deliver two local previews on separate origins (proposed ports 3000 and 3001).
Each app must build and run independently. Plan two deployment projects and URLs,
one per app, with shared backend access. Vercel remains
the deployment target specified by `AGENTS.md`; any future Sites hosting request
needs an explicit runtime/build compatibility decision first. If Sites hosting is
chosen later, register and track two separate Site identities and per-app hosting
configurations; never reuse one Site ID for both apps.

Use the existing required stack and Vitest. Select compatible versions and pin a
lockfile during scaffold work after checking current official documentation.
Do not add a state library, query library, animation library, component-testing
library, or browser-test framework without the dependency approval required by
`AGENTS.md`. Record scaffold dependencies before installation.

## 3. Routes and screen structure

| Site | Route on its own origin | Purpose and content |
| --- | --- | --- |
| Customer (`apps/customer`) | `/` | Customer chat, conversation history, composer, attachment preview and New conversation |
| Customer Service (`apps/customer-service`) | `/` | Agent inbox, active thread/composer, case and suggestion panel |
| Customer Service | `/?demo=1` | Same workspace with Reset, Next day, Start from Demo 2, demo clock and simulated agent switcher |

Each site has its own root page, title and layout. The Customer site is a simple,
mobile-first chat experience; the CS site is an operational workspace. Customers
never navigate to agent approval tools through a shared role switcher. Optional
cross-site shortcuts belong only in the CS demo controls and use configured URLs.
Separate origins do not replace backend authorization when live integration begins.

Selected conversation can be represented in a query parameter so refreshing or
using browser history restores the selection. A missing/deleted selection after
reset returns to the empty state rather than displaying stale case details.

### CS workspace

1. Header: seaPilot identity, current agent (An/Binh in P0), and demo context.
2. Left pane: conversations, customer name, latest message, time, case code or
   “No case”, and unread/selected state. P2 adds Human queue / Auto-handled tabs.
3. Center pane: selected conversation, sender labels, timestamps, attachments,
   and composer. A matching-case banner shows the proposed code and reason with
   **Link** and **Not this case** actions. No silent link.
4. Right pane: case code, status, owner, timeline, existing evidence, parcel/item
   status, and AI suggestion. Put **What changed** and **Still missing** ahead of
   secondary details. Group facts by customer / system / unverified.
5. Reply editor: editable suggestion, Reject and Approve and send. Escalation has
   a separate action summary, evidence references and Approve action control.

Before a case is linked, explicitly label the proposed match. Keep the full case
history/evidence transition visible after the agent confirms the link. A rejected
match retains the conversation and exposes a deliberate create/select-case path.

### Customer screen

Show one active chat at a time with a clear New conversation action. Creating a
new conversation preserves the previous conversation and its case evidence.
Show sending, sent, and failed message states, plus selected attachment name,
preview and remove action. P0 uses seeded evidence images; real uploads are a
later adapter responsibility. Missing fixture images must show an honest missing
asset state until the team supplies them.

## 4. Visual foundation and responsive behavior

### Required design workflow: Impeccable

Use [Impeccable](https://github.com/pbakaus/impeccable) for frontend design and
quality review on **both** sites. The repository already contains the
[Impeccable skill](../.agents/skills/impeccable/SKILL.md), pinned in
[skill provenance](../.agents/skills-sources.json). Use that installed version;
this request does not require reinstalling or upgrading it.

Sites provides the local website implementation workflow; Impeccable guides UX,
visual design, responsive behavior, accessibility and final refinement. Both
operate within the Next.js architecture and product scope in this plan.

During implementation:

1. Load Impeccable context and its applicable playbooks. Derive product context
   from `docs/PRODUCT-BRIEF.md`; if Impeccable needs `PRODUCT.md`, make it a concise
   derived context document that points to the canonical brief. Do not create
   competing product requirements.
2. Use `shape` to define each site's task flow before UI implementation. Treat
   both sites as **Operate** surfaces: Customer prioritizes simple messaging and
   attachment feedback; Customer Service prioritizes scanning, continuity,
   evidence and approval decisions. Record separate surface briefs.
3. Establish a shared `DESIGN.md` for tokens, typography, spacing, source/status
   badges and common component behavior. Allow different density and navigation
   for each audience. The approved visual direction below preserves these user workflows.
4. Read Impeccable's `craft-floor` guidance immediately before UI edits. Use the
   shared design system consistently across both Next.js applications.
5. After each site renders, run `critique` and `audit` against that site's actual
   preview. Address blocking usability, accessibility and responsive findings;
   use `adapt` and `harden` where those findings require them.
6. Finish with `polish`, then verify the changed surfaces at the planned viewport
   sizes. Record findings, fixes and remaining limitations per site. Source-only
   checks are not a substitute for reviewing rendered interfaces.

These steps belong to FE02, FE04/FE05 and FE07. FE07 is complete only after both
sites have received Impeccable-guided review and any unresolved limitations are
reported. Optional design-detector hooks are not installed by this planning task.
The context launcher currently returns permission denied; follow the skill's
documented direct-context fallback if that remains unavailable during development,
and report unavailable automated checks accurately.

### Approved branding and component direction — 31 October 2026

The user requested official shadcn/ui components and a new theme inspired by the
[Sea × OpenAI Codex Hackathon Vietnam](https://codexhackathon.sea.com/). Use the
**Continuity in blue** identity documented in [BRANDING.md](BRANDING.md), replacing
the earlier teal proposal. The original connected-path mark represents a case
continuing through conversations and agents; it is not an official event logo.

- Midnight navy `#101D3A`: Customer brand bar and CS rail.
- Cobalt `#2457D6`: primary actions, active states and focus.
- Signal cyan `#67E8F9`: restrained mark/pattern accents on navy.
- Cool canvas `#F4F7FC`, white task surfaces, ink `#17243E`, muted `#58677E`.
- Green remains success, amber waiting/attention and red error; always show text.
- Preserve 16px conversation copy and 40px desktop/44px mobile controls.
- Use the original path motif only in brand framing, not behind conversation data.

Use the official New York shadcn registry components installed under
`packages/ui/src/components`, composed by `@seapilot/ui`. All application-level
interactive controls must use these components: Button, Input, Textarea, Label,
Select, Tabs, Accordion, Avatar, Badge, Card, Sheet and Alert. Replace custom/native
select and details widgets, filter buttons, raw inputs and textareas. Preserve
native semantic landmarks, forms, headings and text; shadcn components themselves
render native HTML. Do not add meaningless wrappers around document structure.

Map the shared theme into shadcn background/foreground/card/popover/primary/
secondary/muted/accent/destructive/border/input/ring tokens. Use Radix interaction
behavior for keyboard navigation, selection, disclosure, focus trapping and
focus restoration. Keep the upstream license and registry provenance in
`packages/ui/SHADCN-SOURCES.md`. The required Radix dependencies are part of this
user-authorized component migration; unrelated libraries remain out of scope.

Deliver a reusable mark, pattern SVG, brand board, updated DESIGN.md and sidecar,
and browser verification of Select, Tabs, Accordion and Sheet on both sites.
The original independent-fixture scope and API deferral continue to apply.

| Viewport | Layout behavior |
| --- | --- |
| At least 1280px | Three panes: approximately 280px conversation list, flexible chat, 380px case panel; independent scroll regions |
| 768–1279px | Conversation list and chat; case details open in an accessible side sheet |
| Below 768px | One primary pane at a time: inbox → conversation; case details in a sheet with explicit return navigation |

Verify at 375px, 768px, 1024px and 1440px. Long messages, IDs and filenames wrap
without horizontal page overflow. Keep the composer reachable when the mobile
keyboard opens. Preserve draft text and selection when resizing or opening a
sheet. Avoid forcing scroll to the bottom while the agent reads earlier messages.

Accessibility acceptance: semantic headings and landmarks, labelled inputs,
keyboard-operable lists/tabs/dialogs, visible focus, dialog focus restoration,
non-color source labels, readable contrast, meaningful image descriptions,
announced pending/error outcomes, and reduced-motion support. Test 200% zoom.

## 5. Component and state boundaries

Implemented organization (future integration is explicitly marked):

| Location | Responsibility |
| --- | --- |
| `apps/customer/app/` | Customer site's routes, layout, metadata and loading/error states |
| `apps/customer/components/` | Customer chat, composer and attachment selection |
| `apps/customer-service/app/` | CS site's routes, layout, metadata and loading/error states |
| `apps/customer-service/components/workspace.tsx` | Agent header, inbox, thread, demo controls and responsive workspace |
| `apps/customer-service/components/case-panel.tsx` | Case context, evidence, facts, changes and approval controls |
| `packages/ui/` | Official shadcn components, semantic tokens and original brand assets; no agent business logic |
| `packages/contracts/` | Shared Zod schemas and inferred types; no server credentials |
| `packages/api-client/` (deferred, not created) | Future validated HTTP adapter and request/error handling |
| `packages/demo/` | Deterministic fixtures and local state transitions; one isolated store per site |
| App/package `tests/` | Vitest tests near each feature; local continuity transitions |
| Root workspace configuration | Shared lockfile and scripts to run/check/build both sites |

Keep route wrappers and noninteractive layout server-renderable. Add client
boundaries around chat, selection, sheets, draft editing and demo state. Do not
mark the whole application client-only or import server database/AI modules into
client components. Load independent data concurrently through the adapter; avoid
refetching the whole workspace on each keystroke.

Separate persisted domain records from transient UI state. Domain state includes
cases, conversations, messages, evidence, events, shipments, tasks, demo clock and
assignments. UI state includes selection, draft text, open sheets, pending
operations and inline errors. Store drafts by conversation so switching threads
does not leak one customer's reply into another conversation.

### Deferred shared-state architecture

The following is a future integration proposal, not implemented scope.
The two sites run on different origins, so localStorage events or BroadcastChannel
cannot synchronize their domain data. Use one development-only mock HTTP service
with deterministic fixtures and a revisioned state store, consumed by both sites
through their adapters. Lightweight polling is sufficient for the demo; preserve
IDs, reject stale mutations, and refresh after operations. This fixture service
is demo infrastructure, not the production backend or a third user-facing site.
Its process owns domain state; restarting/resetting it restores fixtures.

Keep drafts and pane selection local to each app. Reset increments a shared demo
generation so both sites clear stale local drafts and selections when they observe
it. Configure the mock service's two allowed local origins explicitly. Live API
integration later replaces the service URL/adapter and supplies proper access
control; neither site stores secrets or real customer records in browser storage.

## 6. Deferred data adapter and integration contracts

These are planning references from existing repository documents, not discovered
or verified endpoints. Do not implement or query them during the frontend phase.

UI components consume validated application data, not raw provider SDK objects.
Use an adapter backed by the shared mock HTTP service first; the live API later
implements the same operations. Both sites must reference the same demo session
and backend dataset. Customer-facing contracts expose only customer messages and
permitted status, never internal CS notes, suggestions, approvals or routing data.
Every async operation returns an explicit success/failure result. Responses carry
stable IDs and display codes separately, and timestamps with timezone information.

| Operation | UI result | Contract status |
| --- | --- | --- |
| List conversations / load thread | Inbox and messages | New backend read contract to agree |
| Create conversation / send message / attach evidence | Customer chat and immediate CS update | New backend write contracts to agree |
| Create case for first contact | CS001 linked to CONV1, pending evidence attached | Missing in original build tasks; requires explicit CS intent |
| Load case context | History, evidence, events, open tasks and changes | Existing `GET /api/cases/:id/context` proposal |
| Load shipments | Parcel-to-item mapping and current status | Existing `GET /api/orders/:id/shipments` proposal |
| Request suggestion | Validated facts, changes, missing info, draft and action | Existing `POST /api/agent/suggest` proposal |
| Link conversation | Confirmed link and updated case context | Existing `POST /api/cases/:id/link-conversation` proposal |
| Approve reply / action | Confirmed message or task plus resulting events | Existing `POST /api/cases/:id/approve` proposal |
| Reset / advance / jump | Fully refreshed demo state and clock | Existing `/api/demo/*` proposals; mock locally first |
| Request triage result | Route, reason, matched rule, team, agent and flags | P2 contract to agree; backend owns decision enforcement |

Expose suggestion success/error states outside the existing `AgentSuggestion`
payload, because its current schema does not define an error flag. Empty or
invalid suggestions cannot be approved. Preserve case/conversation IDs with the
request and discard a result that targets a different current selection or stale
case revision. Do not present a rejected or outdated suggestion as current.

The frontend displays backend-provided `changes_since_last_contact`; it does not
infer historical shipment status from the latest row. Mock fixtures must include
a reply-time baseline so the same contract is demonstrated before integration.

Backend integration must keep OpenAI, the Supabase service key and
`DEMO_RESET_TOKEN` server-only. The development-only mock service runs locally with fictional data; do not expose
its reset/mutation endpoints publicly as production APIs. In the real flow,
the browser invokes an approved server boundary; `?demo=1` only controls visibility
and must not be treated as authorization for destructive reset operations.

## 7. Required behavior and UI states

Current success/failure states are driven by local demo transitions. Shared reset,
network pending/error behavior and cross-site scene acceptance below remain
integration targets; they are not evidence of a working backend.

| Interaction | Pending state | Success state | Failure / recovery |
| --- | --- | --- | --- |
| Send message | Disable duplicate submission, retain typed text | Add confirmed message once | Inline error; preserve text and attachment for retry |
| Request suggestion | Skeleton/status, composer still usable | Display validated suggestion for the requested context | Retry; allow manual reply; no invented facts |
| Link case | Disable link controls | Case history and evidence appear; event shown | Remain unlinked, show reason and retry |
| Approve reply | Show Sending; prevent duplicate approval | Show Sent only on adapter confirmation | Keep edited draft; show failure |
| Approve escalation | Show Escalating | Task and `waiting_ops` appear after confirmation | No success badge/status transition; show failure |
| Reset / jump | Disable competing demo controls | Replace all demo state and refresh both screens | Retain last coherent state and show retry |

Also design empty inbox, no selected conversation, no linked case, no evidence,
no changes, no missing information, rejected suggestion, missing asset, malformed
response and unavailable backend states. A case remains open until a confirmed
operation changes it. Never auto-close or promise a refund/replacement.

### P0 scene acceptance

| Scene | Required visible behavior |
| --- | --- |
| 1 | Lan sends M1 + parcel A image; An creates/links CS001 explicitly, sees separate parcels and source-labelled facts, edits/approves R1 |
| Next day | Demo clock advances; B changes from `in_transit` to `delivered`; manual P0 agent switch to Binh is available |
| 2 | M2 is in a genuinely new conversation; Link to CS001 requires confirmation; old evidence remains; B's before/after status is visible; one question distinguishes non-delivery from missing contents |
| 3 | M3 + parcel B photo are retained with EV1; escalation requires its own approval; task/status success appears before a separately approved completion reply |
| Final | One case, two linked conversations, two customer evidence records, one operations task, CS_B/Binh owner and `waiting_ops` |

R3 may claim escalation completed only after action success. Before that, its
wording remains conditional. The mock shortcut **Start from Demo 2** should land
at a documented scene-ready state: CONV1/EV1/R1 present, parcel B delivered,
day-one clock, and Binh selected. This intentionally resolves the old fixture's
missing advance-day step in the adapter specification; agree on the same backend
jump behavior before integration rather than silently changing existing prompts.

## 8. P2/P3 triage extension

After the P0 scene gate passes, add a Triage card displaying handling mode,
category/confidence, `needs_human`, risk, language, matched rule, human-readable
reason, team, assignee and `no_match` fallback. Label values as demo data in the
mock phase. Keep fractional probability and 1–5 risk clearly distinguished.

Use [routing-policy.json](../config/routing-policy.json) and
[teams.json](../config/teams.json) as the configuration inputs. The production
frontend displays a backend routing decision; it does not allow a browser-side
threshold change to authorize automatic replies. The choice of Decisions API
versus Responses API belongs behind that contract and does not block P0 UI work.

Scene 0 uses DH002/customer Minh Tran and the Auto-handled tab only when the
approval exception is agreed. Scene 4 uses an ambiguous English request routed
to General Support/Carlos, with an understandable explanation. If triage misses
the brief's freeze, hide these extensions and keep the manual agent switcher.

## 9. Decisions and inconsistencies to resolve

These do not block the P0 visual foundation. Resolve each before its dependent
behavior is integrated; do not invent backend capabilities in the UI.

| Issue | Proposed planning treatment |
| --- | --- |
| Product principle 4 and `AGENTS.md` require human approval for every reply; brief §3.3 sends AI replies immediately | P0 always requires approval. Keep Scene 0 behind an unenabled extension until the owner confirms a precise policy exception and reconciles the source documents |
| `confirm_receipt` is in the routing allow-list but absent from the model category choices | Backend owner aligns the category schema and config before P2 |
| Routing uses `an` / `binh`; demo fixtures use `CS_A` / `CS_B` | Agree on an explicit ID mapping in shared schemas; never identify agents by display name alone |
| Payments team names Binh as lead while Binh belongs to Delivery | Confirm cross-team fallback semantics before showing a definitive routing result |
| Carlos has overnight New York shifts; demo clock uses Vietnam time and relative days | Backend defines timezone/day anchoring and overnight intervals. Do not guess availability from a local browser clock |
| First-case creation, evidence before linking and handover persistence are underspecified | Implement explicit mock transitions, document the proposed contracts, and agree with backend owners before HTTP integration |
| `operations` vs `Warehouse Ops` and internal case IDs vs `CS001` | Use separate stable identifiers and display labels |
| Old prep milestones differ from PRODUCT-BRIEF | Use the current brief: 11:00 empty deploy, 12:45 Scene 1, 14:30 Scene 2/WIP, 15:30 freeze; report missed milestones honestly rather than backdating work |

## 10. Delivery status and next steps

| Workstream | Status | Delivered or remaining |
| --- | --- | --- |
| Two-site foundation | Complete | Independent Next.js apps, shared UI/contracts/demo packages, ports 3000/3001, separate builds |
| Customer flow | Complete locally | Chat, new conversations, history, seeded attachment selection and preview |
| CS continuity workspace | Complete locally | Inbox, explicit linking, evidence, changes, editable replies and separate action approvals |
| Demo controls | Complete locally | Reset, advance day, Scene 2 shortcut and agent switching; isolated site state |
| shadcn and branding refinement | Complete | Official registry controls, cobalt/navy/cyan tokens, original mark/pattern, brand board and documented design system |
| Frontend verification | Complete within recorded limits | Typecheck, lint, 36 tests, both builds, four viewport sizes and keyboard interaction review |
| Shared state and API adapter | Deferred by user | Agree contracts and authorization, then implement synchronization across origins |
| Deployment | Complete, owner-private | Separate Customer and CS static Next.js exports on Sites; see SITES-DEPLOYMENT.md |
| P2/P3 triage and ambiguity | Deferred | Resolve policy/config decisions before implementation |

The next development phase should begin with an explicit integration scope.
Preserve the current local fixtures as a deterministic frontend demonstration.

## 11. Verification and definition of done

Run the repository's typecheck, lint and test commands after the scaffold exists,
plus separate Next.js production builds for Customer and Customer Service.
Root scripts must aggregate both apps without hiding failures in either one. Use Vitest for meaningful adapter/state tests:

- Reset restores a fixed fixture/clock and clears stale selections and drafts.
- New conversation preserves the existing case and evidence.
- Link rejection does not attach the case; confirmation attaches exactly once.
- Scene 2 displays the stored before/after change and never requests EV1 again.
- Failed approval preserves the draft and cannot display Sent/Escalated.
- Successful escalation creates one task and enables the completion reply;
  repeated clicks/retries cannot create duplicates.
- Stale suggestion results cannot overwrite a different conversation's draft.

Current checks verify each app independently. In the future integration phase,
run the two-site flow on different origins against the shared service. Verify that a customer message
appears in CS and an approved CS reply appears on the Customer site; reset must
clear both sites. Also verify keyboard access, sheet focus, long content,
missing images, slow/error adapter responses, 200% zoom and all planned viewports.
Do not equate mock-adapter tests with live model, upload or database verification.

Deliver two distinct local preview URLs, per-site build/run instructions, a
component/route inventory, a list of backend contracts
still needed, and honest test results. Update `docs/codex-log.md` and the Codex
usage evidence. Do not claim a deployment or real AI integration until verified.

## 12. Sites implementation handoff — completed locally

The authorized implementation followed the Sites local-only workflow using actual
Next.js App Router, TypeScript, Tailwind and shared shadcn components. Customer
and Customer Service remain separate apps and origins. No Sites registration,
hosted deployment, API discovery or integration was performed. Shared HTTP state
from the original planning handoff was superseded by the user's local-only scope.

Future UI changes should follow Impeccable, the approved [brand guide](BRANDING.md)
and root DESIGN.md, preserve explicit case linking and separate approvals, and
repeat the relevant checks for each changed surface.

## 13. Branding and shadcn refinement delivery

1. Import official registry sources with their MIT license and provenance.
2. Migrate both sites to shared components while preserving local demo behavior.
3. Apply cobalt/navy/cyan tokens and the original connected-path mark/pattern.
4. Update brand board, DESIGN.md and frontend runbook.
5. Verify component keyboard behavior, mobile layouts, contrast, typecheck, lint,
   tests and both production builds. No API discovery/integration or deployment.


## 14. Approved UX Package A — implemented locally

User approved Package A from [the UI/UX review](UI-UX-REVIEW.md): UX01–UX05.
Both API-mode sites now show connection/recovery feedback; CS preserves per-thread
in-memory drafts/titles, requires explicit replacement review, and exposes Suggest
beside the composer below 1280px. Existing stale-data and action approval gates
remain enforced. Reload persistence is intentionally outside this package.
Packages B/C and hosting updates remain unapproved. Browser workflow verification
used a disposable mock API at the available 522px width; the complete viewport,
zoom, screen-reader and mobile-keyboard matrix remains pending.

## 15. Sea visual refactor — implemented locally

The user approved a more expressive Sea identity. Both sites now share ocean-blue
controls, midnight framing, cool neutral work surfaces, and the existing seaPilot
mascot. The customer site has a cobalt welcome and a clearer conversation/order
layout. CS has labeled wide-screen navigation, stronger inbox selection, clearer
case sections, and a compact branded mobile header. Sparkle decoration and repeated
reassurance copy were removed. DESIGN.md records the current tokens and supersedes
the earlier visual specifications in section 13; historical deployment assets are
unchanged.

The refactor preserves shadcn controls, API integration, source attribution,
Package A draft/recovery behavior, and separate reply/action approvals. No new
dependencies or backend changes. Fixture-mode visual checks cover desktop and
375px responsive frames. Production builds use the default API-mode configuration.
Screen-reader, mobile-keyboard and full zoom testing remain pending. No redeploy.

## 16. CS workspace refinements

Removed the sidebar Customer service caption in both modes. Case sections now use
keyboard-accessible shadcn accordions; desktop agents can hide/show the entire
case panel. Inbox rows expose labeled Needs reply/Replied/Auto-handled colors and
a separate cobalt selection state. Existing approval controls and data flows remain.

## 17. Reference inbox adaptation

Applied the relevant patterns documented in [INBOX-REFERENCE.md](INBOX-REFERENCE.md):
compact flat queue rows, live filter counts, visible search-result count, start-time
sorting, wider desktop queue and compact composer. Both CS modes preserve case
linking, source labels, draft protection and separate approval controls. No unrelated
CRM navigation, unsupported actions, fabricated counts or customer-site changes.

## 18. Screenshot feedback implementation

Removed the CS rail and moved branding/help to the top header. The desktop case-panel
toggle is now an accessible icon beside conversation status. Case summary fields
use aligned rows. Both composers expand/collapse without clearing drafts; choosing
a suggested reply opens the composer. Approval handlers and warning visibility remain.
