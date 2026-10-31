# 06 – Declarations (draft)

> Source (English translation): [06 – Declarations (draft)](https://docs.google.com/document/d/1iIN2QEa0cxI_5_xbRE3vugApgIfFUR_lxfgfxBI2qkg/edit?tab=t.52msdt7qsq0q)
> Retrieved: 2026-10-31 (Asia/Ho_Chi_Minh). Draft; statements below are source material, not verified implementation or event rules.
> Review findings and proposed corrections: [review.md](review.md). Existing repository prompts remain the execution copies.

Usage: submit this document as a PDF through the Google Form. The briefing asks teams to identify any existing projects used and the work completed on event day. Hoàng approves it; Như exports the PDF on event day.
## Decisions to confirm
- Whether to disclose AI assistance in drafting preparation documents. The author recommends disclosure for completeness; these documents are not product code.
- Declare the evidence photos taken by Như before the event as prepared data.
seaPilot - Declarations
Team seaLion | Sea x OpenAI Regional Codex Hackathon Vietnam | 31 Oct 2026
Repo: [GITHUB LINK] (new public repository created on 31 Oct 2026)

1. Existing projects
We did not build on any existing personal or open-source project.
No product code was written before the event.

2. Prepared before the event (no code)
- Product brief and demo story (written by the team, 16-29 Oct 2026).
- AGENTS.md, build task prompts and the AI runtime prompt, as text files.
  They are in the repo under AGENTS.md and prompts/ exactly as prepared.
- Demo data described as text (customer, order, parcels, messages) in
  prompts/04-demo-data.md.
- Two photos of a real parcel taken by the team, used as demo evidence
  (public/demo/).
- [OPTIONAL] The preparation documents were drafted with the help of an AI
  assistant and reviewed by the team.

3. Built during the hackathon (31 Oct 2026, on-site)
All application code, database schema and seed scripts, AI tools and agent
loop, user interfaces, tests, and deployment. See the commit history
(first commit at [TIME]) and docs/codex-log.md.

4. Third-party services and libraries
Used as normal dependencies, not as a base project: Next.js, React,
Tailwind CSS, shadcn/ui, Zod, Vitest, Supabase (Postgres, Storage),
OpenAI API (Responses API), Vercel hosting. Code generation: OpenAI Codex.

5. Data
All customer, order and shipment data is fictional.

