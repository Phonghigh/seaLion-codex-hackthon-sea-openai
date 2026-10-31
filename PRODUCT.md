# Product
<!-- impeccable:product-schema 1 -->
## Platform
web
## Stack
Two independent Next.js App Router sites in a pnpm workspace; strict TypeScript, Tailwind CSS and shadcn/ui.
## Users and purpose
Customers contact support about a missing item. CS agents continue the same case across shifts and conversations, using existing evidence and changed facts.
## Canonical context
See [PRODUCT-BRIEF.md](docs/PRODUCT-BRIEF.md) for product truth and [frontend plan](docs/FRONTEND-IMPLEMENTATION-PLAN.md) for the approved two-site architecture.
## Current scope
Both sites integrate with the Hono API through NEXT_PUBLIC_API_BASE. The API uses PostgreSQL and Drizzle through CaseStore, with server-side OpenAI Responses API suggestions. Independent in-memory fixtures remain a UI-development fallback. AGENTS.md and docs/Architecture.md define the current backend and demo scope. Human approval is required before every reply or action.
## Principles
Retain case context, label fact sources, ask only the missing fact, and require distinct human approvals for replies and actions. Evidence fixtures are illustrative, not verified customer photos.
## Accessibility
Keyboard access, responsive task layouts, labelled controls, clear focus and status announcements.
