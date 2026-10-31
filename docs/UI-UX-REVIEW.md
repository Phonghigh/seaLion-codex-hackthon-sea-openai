# seaPilot UX/UI review and proposed updates

Date: 31 October 2026. Source baseline: `031ff6e`.

**Status: Package A (UX01–UX05) approved and implemented locally on 31 October 2026. Packages B and C still await approval.**

The findings below describe the pre-change baseline. See the delivery notes at the end for current behavior and verification.

## Scope and method

Reviewed both current API-backed Next.js interfaces, shared styles and components, product brief, frontend documentation and brand tokens. Installed UI/UX Pro Max into `.agents/skills/ui-ux-pro-max` from upstream revision `9a3f14f7423037ccb8feeb4fee7482291b9c820e`; provenance is in `.agents/skills-sources.json` and the MIT license in `.agents/licenses/nextlevelbuilder`.

Applied its web accessibility, feedback, state preservation, responsive layout and shadcn guidance. Searches: `error recovery feedback` (UX) and `accessible forms dialog` (shadcn) produced relevant guidance. `state preservation drafts` and the retry `form autosave` did not retrieve useful draft guidance; used the skill's quick-reference `form-autosave` and `state-preservation` rules instead. Native mobile platform rules were not treated as web requirements.

This is a **source-based review**, not a browser usability study or accessibility certification. No live customer interactions, model requests, database resets, deployment changes or interface edits were performed for the review. Visual balance, keyboard flow, screen-reader announcements, actual overflow and mobile keyboard behavior require the browser acceptance pass below. Existing hosted releases must be evaluated against their own recorded versions, not assumed to match this commit.

## Overall assessment

The foundation fits the product: Customer has a focused conversation and order view; Customer Service has an inbox, conversation and case context. The navy/cobalt/cyan branding is cohesive, and shared shadcn controls reduce inconsistency. The next iteration should improve continuity and trustworthy feedback before adding decoration or changing the theme.

Keep these strengths:

- Explicit approval before sending replies and escalating; stale suggestions and read errors block approval.
- Source labels on facts and evidence, shipment changes and an event timeline support case continuity.
- Customer send logic clears successfully saved text independently of failed attachments, reducing duplicate sends.
- Shared focus styles, skip-link styling, reduced-motion handling and mobile composer text at 16px already exist. Verify rendered behavior rather than rebuilding these patterns.
- Separate demo controls and explicit fixture mode support the hackathon without silently substituting fake data when the API fails.

## Current limitations and suggested updates

P1 means high impact on the core demo workflow; P2 means usability or clarity improvement. Evidence paths and line numbers refer to the baseline above. Proposed behavior is not implemented.

| ID / priority | Current behavior and impact | Proposed update | Acceptance condition |
| --- | --- | --- | --- |
| UX01 / P1 | CS `workspace.tsx:53,145` calls `clearReview` when selecting a conversation, erasing the edited reply and case title. Returning to a case loses work. | Keep draft/title state per conversation. If replacement discards edits, show an explicit confirmation. Preserve text separately from whether it is safe to approve. | Edit A, visit B and return: A's text remains; stale data still blocks approval. |
| UX02 / P1 | CS `workspace.tsx:109,120` clears the draft before suggestion/regeneration finishes. A failed request can erase an agent's work. | Retain the previous text during loading/failure. Present regenerated text for explicit replacement when the agent has edited it. | A failed Suggest keeps edited text; successful regeneration cannot silently overwrite edits; escalation ordering stays enforced. |
| UX03 / P1 | Customer `customer-chat.tsx:76` and CS `workspace.tsx:141` display “Connected demo” unconditionally. Customer refresh failures and shipment failures do not drive this label. | Separate “Demo” from actual connection state. Show loading, connected, reconnecting or unavailable, plus last successful refresh when useful. | Simulated failure changes the status; recovery restores it; stale order data is visibly marked. |
| UX04 / P1 | Customer `customer-chat.tsx:29–38,97` ignores shipment errors and does not clear read errors after successful polling. Order context can remain “Loading order…” with zero parcels, or show stale data without explanation. | Give order and conversation independent loading/error states, contextual Retry actions and recovery clearing. Keep send errors separate from read errors. | Failed order fetch never implies an empty order; a later successful fetch clears only the corresponding read error. |
| UX05 / P1 | Below 1280px, CSS `styles.css:198` hides the case pane behind an icon-only details button. Suggest lives inside that pane (`case-panel.tsx`). The reply composer asks the agent to run Suggest without a visible named Suggest action beside it. | Expose a labeled “Suggest reply” action near the composer on compact screens; keep detailed evidence/context in the sheet. | At 375px and 1024px an agent can discover Suggest, inspect evidence, approve escalation, then send without guessing the panel icon. |
| UX06 / P2 | Both message lists scroll independently; neither component contains logic to follow new messages or signal unread messages below the current position. Polling can add content out of view. | Follow incoming messages only when already near the bottom; otherwise show “New messages” with a jump action. | Reading older content is not interrupted; new content remains discoverable; keyboard users can reach the jump control. |
| UX07 / P2 | CS `workspace.tsx:146` uses the same non-search empty message for filtered tabs. “No conversations here yet” can mean no items need a reply, not an empty workspace. | Distinguish initial empty, no search results, all caught up, loading and failed reads. Offer Clear filters or Retry where relevant. | Each state names what happened and gives an appropriate next step. |
| UX08 / P2 | Demo `demo-controls.tsx` executes Reset immediately when a token is already stored. A nearby routine control can replace shared demo state with one click. | Confirm reset using the established shadcn dialog pattern, explaining shared-state impact. Keep cancellation safe. | Cancel performs no request; confirmation executes once; completion is shown only after success. |
| UX09 / P2 | Customer history labels are conversation IDs and timestamps (`customer-chat.tsx:99`). Case timelines display normalized event codes (`case-panel.tsx`). These demand interpretation. | Add meaningful conversation previews and customer-facing event descriptions while retaining IDs as secondary metadata. | An agent/customer can identify the right prior contact without opening every item; technical identifiers remain available. |
| UX10 / P2 | Conversation selection is local React state in both sites. Reload and browser navigation do not preserve the selected conversation as a shareable address. | Consider an authorized conversation query parameter and stable back behavior, with a safe unavailable-state fallback. | Reload/back restores a valid selection; invalid or inaccessible IDs reveal no additional data. |

### UI hierarchy and visual refinement proposals

These are design hypotheses for browser validation, not measured defects:

- **Customer:** keep chat as the primary task. Make order-fetch failure distinct from empty conversation state. Give attachment selection a clear selected-file summary and early format/size feedback. Do not mix illustrative sample evidence with actual uploads without visible labels.
- **Customer Service:** order the decision flow as “What changed → evidence → suggested reply → approval.” Put the next permitted action near the composer and explain disabled approval in plain language. Keep the successful-escalation requirement visible.
- **Typography:** many metadata, source badges and helper labels use 10–12px (`packages/ui/src/styles.css`). Trial 12–13px for important metadata and 14px for operational instructions. Preserve the existing 16px message/mobile-input styling. Check resulting density at 200% zoom before adopting.
- **Status vocabulary:** map raw values such as `waiting_ops` to “Waiting for Warehouse Ops,” and use consistent text/icon/color semantics. Do not use color as the sole indicator.
- **Brand:** retain the documented navy, cobalt and cyan palette. Use cyan for limited brand accents; prioritize readable content, consistent spacing and restrained surfaces. No new font, animation library or component system is proposed.

## Deliberate scope limits versus defects

- Customer identity/order are fixed demo values (`CUST001`, `DH001`); CS identity selection is a demo actor selector. Production authentication, customer accounts and multi-order selection require separate scope approval.
- The current approval flow requires a valid AI suggestion. A manual reply fallback could be useful during model failure, but changes product behavior and needs a separate decision; never bypass stale-data or action-approval checks as a visual fix.
- CS refresh loads every conversation detail after listing conversations (`workspace.tsx:59`). This is suitable for small fixtures but grows with inbox size. Pagination/incremental updates are a future scale decision; this review did not measure performance or prove a latency issue.
- Browser storage persistence for draft text needs a retention/privacy decision. Phase 1 can preserve drafts in memory across conversation changes without adding durable local storage.
- No dark theme, analytics dashboard, new roles, new dependencies or frontend replacement is included in this proposal.

## Proposed delivery packages — approval required

| Package | Scope | Intended outcome |
| --- | --- | --- |
| **A — Workflow reliability (recommended first)** | UX01–UX05; preserve edited text, trustworthy connection/recovery states, visible compact-screen Suggest | The core demo remains understandable and recoverable when switching cases or encountering API/model failures. |
| B — Navigation and clarity | UX06–UX09; message-follow behavior, precise empty states, reset confirmation and meaningful labels | Fewer hidden updates, accidental resets and interpretation steps. |
| C — Refinement | UX10 if approved; typography/spacing and status vocabulary after browser validation | More readable, navigable interfaces while retaining current branding. |

Each approved package should remain small and use existing shadcn components. If a missing primitive requires a dependency, request approval under the repository rules. No package is approved by this document.

## Browser acceptance pass for approved work

Test both sites at 375, 768, 1024 and 1440px, plus 200% zoom. Use controlled fixtures or a disposable test API, not shared demo resets. Cover all three product scenes, empty inbox, long content, delayed reads, failed Suggest, failed upload, successful recovery and changed shipments while editing. Check keyboard navigation, visible focus, sheet focus restoration, screen-reader errors/status, mobile keyboard access to Send, and no horizontal overflow. Preserve explicit approval, source labels and escalation-before-reply invariants.

## Verification of this review-only change

The installed skill's Python searches ran successfully. Repository typecheck passed. Standard lint included pre-existing generated `apps/*/out` bundles and failed; source-only lint passed. Tests passed: 50 Vitest tests and 30 recorder tests; 16 database-dependent tests were skipped. Details are recorded in the task log. No new application tests are needed for installing reference data and writing an audit. Browser usability and live hosted behavior remain unverified.


## Package A delivery

- CS keeps draft text and new-case titles per conversation in memory. Switching threads invalidates approval readiness but preserves text; reload is not durable storage. Local reset/jump clears drafts, while advancing the day preserves them.
- Suggest and post-link/escalation regeneration retain existing text on failure. A different generated reply opens a shadcn comparison sheet with explicit Replace/Keep choices. Closing it leaves approval blocked until the agent reviews the choice. The new reply still requires separate send approval; stale data, errors and pending escalation continue to block it.
- Both sites separate the Demo label from Connecting/Connected/Reconnecting/Unavailable status. A last-sync timestamp reflects successful reads. Customer order/conversation read failures have separate recovery notices and Retry controls; successful reads clear their own errors without hiding send failures.
- Compact CS layouts expose Suggest reply beside the composer. Badge forwards accessibility attributes for live status announcements. The comparison sheet returns focus to the draft input.
- ESLint now ignores generated `out` bundles so the normal lint command checks source consistently.

Browser checks used a disposable mock API, without model calls or shared database writes. Verified draft/title restoration across two conversations, replacement and keep choices, failed Suggest retaining text and blocking Send, stale-order feedback and automatic recovery clearing that feedback. The available browser rendered at 522 CSS pixels with no horizontal overflow; requested viewport overrides did not change its measured width, so 375/768/1024/1440 and 200% zoom remain unverified. Full screen-reader and mobile keyboard testing remain outstanding. Existing database continuity/reset tests passed against a separate disposable PostgreSQL container (66 Vitest + 30 recorder tests, no skips). No hosted deployment was changed.
