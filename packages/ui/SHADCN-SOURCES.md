# shadcn/ui source provenance

Imported 31 October 2026 from the official New York registry:
`https://ui.shadcn.com/r/styles/new-york/{name}.json`.

Components: button, badge, card, input, textarea, label, select, tabs, accordion,
avatar, sheet and alert. Each owned source file links its upstream registry URL.
Upstream MIT license is retained in [SHADCN-LICENSE.md](SHADCN-LICENSE.md).

Local adaptations: Badge renders an inline span so it can safely appear within
paragraphs/headings; utility imports resolve to `src/lib/utils.ts`; product wrappers
in `src/index.tsx` compose naming, colors, minimum targets and sheet focus return.
`src/styles.css` maps shadcn semantic tokens to the seaPilot brand system. Radix
Select, Tabs, Accordion, Avatar, Label and Dialog supply interaction behavior.

Manual registry installation avoids initializing or overwriting either Next.js
application. Future updates should review these owned sources and preserve the
product wrappers, semantic tokens and keyboard behavior.
