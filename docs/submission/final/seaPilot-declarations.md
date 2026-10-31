# seaPilot — Declarations

**Team seaLion** · Sea x OpenAI Regional Codex Hackathon Vietnam · 31 Oct 2026

Repo: https://github.com/Phonghigh/seaLion-codex-hackthon-sea-openai (new public repository, first commit 31 Oct 2026 09:11, Asia/Saigon)

## 1. Existing projects

We did not build on any existing personal, company or open-source project. No product code was written before the event.

## 2. Prepared before the event (text only, no code)

- Product brief and demo story.
- `AGENTS.md`, the architecture notes, the build task prompts and the AI runtime prompt, as text files. They are in the repo under `AGENTS.md`, `docs/` and `prompts/`.
- Demo data described as text (customers, orders, parcels, messages) in `prompts/04-demo-data.md`.
- The preparation documents were drafted with the help of an AI assistant and reviewed by the team.

## 3. Built during the hackathon (31 Oct 2026, on site)

All of the following, with the commit history and `docs/codex-log.md` as evidence:

- application code, database schema, migration and seed;
- the AI tools, agent loop, triage and routing;
- both user interfaces and the API;
- tests;
- deployment to ChatGPT Sites;
- the backup demo video and the pitch materials.

## 4. AI tools used

- **OpenAI Codex** (primary): built the product from our task prompts and published the Sites. Codex usage is recorded by hooks in `docs/codex-usage-report.md`, and per-task entries are in `docs/codex-log.md`.
- **Claude Code** (Anthropic): used by one team member in the afternoon for a small set of changes, each in its own commit:
  - switching the demo data to English;
  - the product icon;
  - fixes for three UI bugs found in manual testing;
  - automatic refresh of an untouched AI draft;
  - one-click sample messages for the demo.

  It was also used to help draft this write-up, the pitch script and the demo narration, and to apply wording and layout fixes to the slides.
- **OpenAI API** (Responses API): the model used by the product at runtime.

## 5. Third-party services and libraries

Used as normal dependencies, not as a base project:

- Next.js, React, Tailwind CSS, shadcn/ui
- Hono, Drizzle ORM, PostgreSQL (Docker), Zod, Vitest
- ChatGPT Sites (hosting), Cloudflare Tunnel
- Canva (slides)

## 6. Data

All customer, order and shipment data is fictional.
