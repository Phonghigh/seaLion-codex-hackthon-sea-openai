# Frontend foundation validation — 31 October 2026

Scope: independent Customer and Customer Service Next.js previews with local
fixtures. Sites local-only workflow; no API discovery/integration or deployment.

## Automated checks

- `pnpm typecheck`: passes for both apps and three shared packages.
- `pnpm lint`: passes.
- `pnpm test`: six frontend transition tests and 30 existing recorder tests.
- `pnpm build`: both independent Next.js Webpack production builds pass.
- `git diff --check`: clean.

Frontend tests cover case continuity, evidence retention, explicit escalation,
idempotent task creation, original agent attribution, new conversations/reset,
blank-input and unlinked-reply rejection, stale approvals and reply-time shipment
baselines. Stale-approval regression was observed failing before the fix.

The recorder tests initially failed because macOS temporary paths had different
`/var` and `/private/var` spellings in subprocesses. Their fixture root now uses
`realpath`; all 30 pass without changing the production recorder.

## Rendered checks

Captured both apps at 375×812, 768×1000, 1024×1000 and 1440×1000, plus the mobile
case sheet. Verified no horizontal document overflow at these widths. Temporary
viewport overrides were reset afterward.

Exercised Customer message and sample-attachment sending; CS linking, suggested
reply approval, new evidence and separate escalation approval. Reproduced a
stale draft after new evidence: sending becomes disabled, text is preserved,
and the user can replace it or explicitly confirm review. Approving a current
reply updates the shipment baseline and removes the obsolete change banner.
Verified Escape closes the case sheet and restores focus to its trigger.
No warning/error console entries were observed in the inspected previews.

Full screen-reader testing, native mobile keyboards, 200% browser zoom, multiple
browser engines and live backend behavior were not verified. These remain
integration/release checks; this is a frontend foundation.

## Standards

Initial review found three issues: undersized compact controls, conversation
copy below the documented reading size, and case metadata missing provenance.
All three were fixed: 40px desktop/44px mobile controls, 16px conversation text,
System-labelled case metadata and Unverified team assignment. The independent
reviewer's targeted recheck found all three resolved.

## Spec

Initial review found two issues: shipment changes lacked a reply-time baseline,
and drafts could be approved after their context changed. Both are fixed using
stored baseline status and revision-checked approval, with a regression test and
browser verification. The independent reviewer's targeted recheck found both
resolved. Deferred API synchronization, real uploads and P2/P3 were excluded.

Review total: Standards 3 resolved, Spec 2 resolved; no remaining findings from
those targeted rechecks.

## Impeccable

The independent rendered review returned **ship** for the frontend foundation.
Its contrast finding was corrected: day dividers 5.15:1, inbox footer 5.00:1 and
selected case references 4.51:1. The reviewer checked all nine final captures.
DESIGN.md and `.impeccable/design.json` describe the resulting shared system.

The context/detector launcher failed with permission denied, so no automated
Impeccable detector result is claimed. Review used the Operate surface briefs and
DESIGN.md; no approved image comp, separate quality card or five-block direction
contract was supplied. Local screenshots are under ignored `.impeccable/review/`.


## shadcn and branding refinement

Replaced application controls with official New York shadcn components, retaining
semantic document structure. Applied the original connected-path identity and
navy/cobalt/cyan theme described in BRANDING.md. Registry sources and MIT license
are recorded in `packages/ui/SHADCN-SOURCES.md`.

Repeated typecheck, lint, all 36 tests and both production builds: all passed.
Reviewed both sites at 375, 768, 1024 and 1440px plus the mobile case sheet; no
horizontal document overflow or obstructed primary controls was observed.
Verified Select attachment selection and sending, Accordion history disclosure,
Tabs arrow-key navigation, and Sheet Escape/focus restoration. Browser review
caught a block-level Badge inside a paragraph; changed Badge to an inline span
and verified no new nesting warning after reload.

The independent Impeccable finish reviewer returned **ship**, with no material
fixes across all nine captures. The surface contracts now include direction and
quality guidance. No seed, automated detector result or approved image comp was
generated; the launcher limitation remains. Screenshots are locally available in
`.impeccable/review/branding/`. The broader release-check limits above still apply.
No API discovery, integration, cross-site synchronization or deployment was added.
