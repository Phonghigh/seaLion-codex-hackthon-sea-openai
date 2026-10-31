# Review of seaPilot preparation draft

Reviewed 31 October 2026 against the eight imported tabs, root `AGENTS.md`, the
three existing `prompts/` files, skill provenance, and local commit history.
The product story is consistent: retain one case across conversations and CS
agents, detect changed shipment facts, ask only the missing question, and require
approval for replies and actions. The issues below are proposed corrections,
not changes to the approved scope or evidence that the app already works.

## Resolve before implementation

| Priority | Gap / conflict | Proposed resolution | Affected work |
| --- | --- | --- | --- |
| Blocking | Reset starts with no case; the runtime explicitly never creates cases. T01–T10 never assigns a case-creation API or UI flow, though Demo 1 must create CS001. | Assign a backend create-case path and explicit CS confirmation. Persist/link CONV1 and attach pending evidence; keep model tools read-only. Define how the first-contact order is retrieved when no case exists. | T02, T03, T04, T05; Demo 1 |
| Blocking | T07 compares shipments against the last CS reply, but the minimum schema only stores current shipment status. No historical status or reply-time snapshot is specified. | Store the shipment facts used for each approved reply (or a complete status history). Compare with that baseline in the backend and expose `changes_since_last_contact`. | T02, T07 |
| Blocking | Final fixture expects assignee CS_B; linking only sets `conversation.case_id`, and the UI switcher is local state. | Specify and persist the approved handover to CS_B; record the actor in case events. Switching the UI identity alone must not silently reassign a case. | T05, T07, T10 |
| High | A photo may arrive before a case exists, but evidence requires `case_id`. Conversation creation, message persistence and first-contact case handling have no explicit API contract. | Define the owning task and routes for conversations/messages, and a pending attachment flow until a CS-approved case link exists. | T02, T05, T06 |
| High | `suggested_case_id` suggests a database ID, but T07's test expects the display code `CS001`. Tools return both `case_id` and `code`. | Decide whether IDs are fixture strings or generated database IDs. Make schemas and tests use the real ID; render the separate code in the UI. | T02, T03, T04, T07 |
| High | The model fallback adds an `error flag` that is absent from `AgentSuggestion`. The prompt also lacks a complete no-match/ambiguous-case/tool-failure output example. | Define an explicit API success/error envelope or a validated error variant, with safe empty draft and disabled approval controls. Specify order-only first-contact context. | T03, T04, T05 |
| High | The runtime forbids saying an action is done; R3 says it has been escalated, but only after action success. Reply and action approvals are separate. | Keep the pre-action draft conditional. After a successful escalation event, regenerate or edit the completion reply and require separate reply approval. Block completion claims while the action is pending or failed. | T04, T08; Demo 3 |
| High | T08 needs task creation, status change and result logging to agree. Retry behavior and duplicate approvals are unspecified. | Execute related writes atomically where possible and make approval retries idempotent. Test that failures don't leave a success state or duplicate tasks/messages. Preserve an auditable failure result. | T08, T10 |

## Demo and test consistency

- **Demo 2 shortcut:** the jump fixture leaves parcel B `in_transit`, but the
  emergency runbook says Reset → Start from Demo 2 → Demo 2/3. Add **Next day**
  after the jump, or agree on a different jump fixture. T07 already uses
  reset → jump → advance-day.
- **Team name:** fixtures use `Warehouse Ops`; T08 writes `operations`. Decide on
  an internal team identifier and display label, then assert the identifier in
  tests rather than depending on inconsistent wording.
- **Reset determinism:** timestamps are relative to reset, while T02 asks for
  identical rows after two resets. Freeze the test clock or compare stable
  business fields and explicitly validate relative timestamps.
- **Fixture chronology:** CONV1 starts at day -1 09:00 and parcel A becomes
  delivered at 10:00. R1's timestamp is unspecified even though it says A was
  delivered. Set a coherent reply time before using it as the snapshot baseline.
- **Reduced-scope fallback:** dropping real task creation from T08 conflicts
  with T10's required task row and the final-state demo. If that cut is used,
  update acceptance criteria and declarations to call it simulated; don't claim
  the full escalation workflow passed.
- **Evidence count:** the continuity test needs exactly two customer evidence
  rows. Define upload/attachment deduplication so retries or linking don't copy
  the first photo into a second row.
- **Response language:** English UI plus VI first-round / EN final-round customer
  messages is a proposal awaiting confirmation. The source contains both customer-message versions and Vietnamese example
  replies. This English edition retains the English customer messages and translates
  the reference replies; the execution fixtures remain bilingual. Check real English output
  against the same fact and approval constraints.
- **Time targets:** the agent budget is 30 seconds / six tool calls, while the
  rehearsal checklist targets under 15 seconds. Treat 15 seconds as a demo
  performance target and 30 seconds as a timeout, and measure both honestly.

## Submission and declaration review

1. **Prepared-versus-built claims need reconciliation.** The overview says no
   repository before the event and coding starts at 10:00. Local history shows
   the initial commit at 09:11:52 +07:00, skills at 09:40:13 +07:00, and prep
   documents at 09:27:06 +07:00 (stored as 02:27:06 UTC). These are commit
   timestamps, not proof of when work was authored or whether event rules were
   breached. Document what was actually prepared/imported and ask the owner to
   check organizer rules; do not assert an unverified compliance claim.
2. **Disclose the imported skills.** The declarations say no existing open-source
   project was used. This repository now vendors Matt Pocock's published skills
   (MIT) and Impeccable's Codex skill (Apache-2.0), including supporting scripts.
   Describe them accurately as development tooling and distinguish them from
   application code. Keep attribution and license records in `.agents/`.
3. **Do not certify unverified preparation history.** The stated 16–29 October
   authoring dates, pre-event photo capture, absence of prior product code, and
   on-site build claim need team confirmation. The two photos are referenced but
   are not currently present in this repository. Keep these statements as draft.
4. **Keep metrics as placeholders.** There is currently no application scaffold,
   test suite, deployment result, or measured handover latency in this checkout.
   Replace `[N]`, `[SECONDS]`, links, build times and working-feature lists only
   with observed evidence. Git and task logs alone cannot establish a reliable
   percentage of lines authored by Codex; omit that percentage without a method.
5. **Keep model and business claims bounded.** Don't claim low cost at scale or
   proven case-link accuracy without measurements. The draft's real-world value
   and Q&A claims are hypotheses; report the demo's measured behavior separately.
6. **Confirm logistics independently.** The 14:30 WIP, 16:45 target / 17:00 hard
   deadline, PDF requirements, venue and six-plus-two-minute format are source
   draft details, not independently verified organizer requirements.

## Readiness checklist

- [ ] Hoàng confirms the draft and the resolutions above.
- [ ] Model name and service credentials are configured server-side; commit no secrets.
- [ ] Two evidence images exist and their origin is declared.
- [ ] First-contact creation, handover, shipment baseline and error contracts are assigned.
- [ ] Demo 1 runs with the real model by the planned 12:30 milestone.
- [ ] Demo 2 and WIP are ready for the planned 14:30 milestone.
- [ ] Reset and the corrected Demo 2 shortcut rehearse consistently three times.
- [ ] Continuity, failure and approval behavior are tested; typecheck and lint pass.
- [ ] Feature freeze / test-work overlap is agreed: freeze is 15:30; T10 ends 16:00.
- [ ] Như fills the write-up with measured results and exports the planned PDFs.
- [ ] Hoàng verifies declarations, including preparation and third-party tooling.
- [ ] Repo/demo links and organizer submission requirements are checked before submission.

## Validation of this documentation task

Imported all eight named prep tabs; preserved source links, draft status, ownership,
timeboxes, fixture messages and submission placeholders. Root agent instructions
and execution prompts were left unchanged. No code or dependencies were added.
Application checks cannot establish runtime correctness until the scaffold exists.

## English edition

The imported prep documents were translated into English at the user's request.
Source links, task IDs, owners, times, technical identifiers and submission
placeholders were retained. The Vietnamese execution fixtures in `prompts/` were
not changed. Source-text equality from the original import applies to the earlier
snapshots; the current edition is a translation, not a verbatim transcription.
