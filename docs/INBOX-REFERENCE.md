# Inbox reference adaptation

Reviewed the rendered [SpiralEdge CRM inbox](https://buddy-bound-base.lovable.app/TND4K2PZ1/inbox) on 2026-10-31. This is a UI reference, not a feature specification or a source of customer data. Its dark purple theme and CRM branding are not copied; seaPilot retains its approved Sea identity.

| Observed pattern | seaPilot decision |
| --- | --- |
| Compact rows with identity, time, preview and metadata | Adopted. Flat rows replace spaced cards; status and case reference share a compact metadata row. |
| Selected row and colored labels | Adopted with cobalt selection plus labeled amber/green/blue reply states. No invented unread or priority state. |
| Counted queue tabs | Adopted with actual All, Needs reply and Auto counts in API mode; fixtures expose only supported filters. |
| Sort control and result count | Adopted. Newest/oldest by conversation start time; the visible count reflects search/filter results. |
| Search above the list | Retained. Works with existing customer, title, conversation and order fields. |
| Separate inbox, conversation and context panes | Retained and refined. A wider desktop list, tighter thread header, neutral message canvas and compact composer prioritize reading. |
| Collapsible detail groups and hide-details control | Retained from the preceding refinement, with keyboard-accessible shadcn accordions and desktop hide/show. |
| Compact composer | Adapted spacing only. Explicit approval, draft protection and escalation prerequisites remain. |
| Contact/account/files/activity tabs | Case context, evidence and timeline already cover relevant information; duplicate tabs would add navigation without new value. |
| CRM Work/Build/Admin navigation, accounts, deals, reports | Excluded: outside the case workspace scope. |
| Team inboxes, assignments, saved views, mentions, starred, snoozed, scheduling | Excluded: unsupported workflows/data; no nonfunctional controls or fabricated counts. Existing routing facts remain read-only. |
| Bulk selection, closing, inline assignment edits, calling | Excluded: would add actions and approval semantics beyond scope. |
| AI search, assistant and insights panels | Existing Suggest/review flow remains the single grounded assistant entry point. |
| Resizable splitters | Deferred; current responsive widths and hide/show control meet the small demo's needs without another interaction system. |
| Decorative chat wallpaper and unrelated sample identities | Excluded; messages and sources remain the focal content. |

Implementation applies to API and fixture Customer Service workspaces. The customer-facing site is unaffected. No dependency, API endpoint, or backend behavior is added.
