# Customer Service site
Mode: Operate. Audience: an agent taking over an existing case.
Primary task: connect a returning conversation, understand the changed shipment fact, approve a focused reply, and escalate only with evidence and approval.
Composition: narrow identity rail, inbox, active conversation, case/suggestion pane. The focal point is What changed and one missing question.
States: selected/unselected inbox, unlinked/linked case, source badges, timeline/evidence, draft/reject/approve, operations success, reset and scene controls. Mobile uses inbox navigation and a details sheet.
Constraint: demo only; no actual AI, service calls or cross-site synchronization.

## Direction contract
THESIS: One continuous case, expressed as connected moments; preserve the existing task flow.
OWN-WORLD: Cobalt #2457d6 actions, midnight #101d3a navigation, cyan #67e8f9 signal accents, cool white working surfaces. Official shadcn/ui components form the interaction language.
STORY: Recognize the same support identity across conversations and trust explicitly sourced, approved next steps.
FIRST VIEWPORT: Preserve existing chat/inbox composition; navy brand framing, readable light conversation panes, cobalt primary actions and a small connected-path mark.
FORM: Code-led Operate adaptation of the user-supplied hackathon reference. User delegated palette selection. Seed unavailable (launcher permission denied); no image comp.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Quality bar
Official shadcn controls, accessible keyboard interactions, 40px desktop/44px mobile targets, 16px messages, no horizontal overflow at 375/768/1024/1440, no loss of local fixture behavior.
