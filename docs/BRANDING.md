# seaPilot brand system

Direction: **Continuity in blue**. One case connects every conversation, agent
and next step. The original mark and line pattern use a continuous path with
three nodes to express that mechanism.

Reference: [Sea × OpenAI Codex Hackathon Vietnam](https://codexhackathon.sea.com/),
visually reviewed on 31 October 2026. Its midnight background and blue/cyan
accents informed this direction. These seaPilot assets are original product
branding, not an official Sea or OpenAI identity or endorsement.

| Token | Value | Use |
| --- | --- | --- |
| Midnight | `#101D3A` | Customer brand bar, CS navigation rail |
| Cobalt | `#2457D6` | Primary actions, selection and focus |
| Signal cyan | `#67E8F9` | Small brand accents on navy; never body text on white |
| Canvas | `#F4F7FC` | Page background |
| Ink | `#17243E` | Main text |
| Muted | `#58677E` | Secondary text on light surfaces |
| White | `#FFFFFF` | Chat, case and form surfaces |

Keep success green, attention amber and errors red semantically separate from
brand colors. Use 16px conversation copy, 40px desktop controls and 44px mobile
targets. The working screens retain familiar sans-serif typography and light
panes for sustained reading; the event's display effects are not copied into
conversation content.

## Assets and pattern rules

- [Brand board](brand/seaPilot-brand-board.svg): portable vector palette/identity reference.
- `packages/ui/src/brand.tsx`: reusable original BrandMark.
- `packages/ui/src/brand-pattern.svg`: repeatable connected-path header motif.
- Use the mark in the Customer header and CS rail; maintain at least 8px clear space.
- Keep the pattern in brand framing at low opacity, away from messages and data.
- The three nodes represent continuity, not status or a progress indicator.
- Avoid gradients, neon text, decorative dashboard grids and copied partner logos.

## Component contract

Official shadcn/ui New York registry components live in
`packages/ui/src/components`. The shared export composes product defaults from
these components. Use Button, Input, Textarea, Label, Select, Tabs, Accordion,
Avatar, Badge, Card, Alert and Sheet for their corresponding UI patterns.
Keep native controls inside the owned shadcn implementations. Application
screens use their components rather than raw button/input/textarea/select/details
controls. Semantic main/header/nav/section/form/headings/text remain appropriate:
shadcn itself renders native HTML and does not replace document semantics.

Registry provenance and license: [shadcn source record](../packages/ui/SHADCN-SOURCES.md).
See [DESIGN.md](../DESIGN.md) for implementation tokens and component recipes.
