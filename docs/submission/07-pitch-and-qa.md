# 07 — Six-minute pitch and Q&A

> Source (English translation): [07 — Six-minute pitch and Q&A](https://docs.google.com/document/d/1iIN2QEa0cxI_5_xbRE3vugApgIfFUR_lxfgfxBI2qkg/edit?tab=t.ojt7hyfrjivt)
> Retrieved: 2026-10-31 (Asia/Ho_Chi_Minh). Draft; statements below are source material, not verified implementation or event rules.
> The earlier prep review was retired during documentation consolidation. Check current implementation evidence in [FRONTEND-QA.md](../FRONTEND-QA.md) and [codex-log.md](../codex-log.md) before using these draft claims.

Usage: the draft specifies six minutes for the demo/pitch and two minutes for
Q&A in both rounds. Cover the problem, solution, and use of Codex. Judges assess
the working product rather than polished slides, so spend more than half the
presentation on the demo. Round one may be delivered in Vietnamese using the
same points; use the English script for the finals.

## Speakers

- Minh: problem and solution (0:00–1:00), and narration during the demo.
- Hoàng: operates the demo and gives short technical explanations when asked.
- Như: plays the customer and types the messages.
- Phong: Codex contribution and closing (4:45–6:00).

## Slides (six slides, used only at the beginning and end)

- Slide 1: seaPilot, team seaLion, and one sentence: "Customers change conversations. Agents change shifts. The case keeps going."
- Slide 2: problem. Show a customer returning to a different CS agent and having to repeat the story and resend photos.
- Slide 3: solution in four points: link the case, show what changed, ask exactly one question, and require CS approval for every action.
- Live demo, without slides.
- Slide 4: one architecture diagram with the customer screen, CS workspace, backend, three tools, Postgres, OpenAI Responses API, and approval flow.
- Slide 5: how we built with Codex. Use task, commit, and test counts from `docs/codex-log.md`, plus one concrete example.
- Slide 6: who benefits and the next steps.

## Timed script

- 0:00–0:40 (Minh), problem: "A customer reports a missing item in chat. The next day she writes again, in a new conversation, to a different agent. Today that agent starts from zero, and the customer has to explain and send photos again."
- 0:40–1:00 (Minh), solution: "seaPilot makes the case the unit of work. It links the new conversation to the right case, shows what changed since last time, and asks only the one question still missing. The agent approves every step."
- 1:00–4:45 (Minh narrates, Hoàng operates, Như types): run Demos 1–3 using tab 04. In Demo 2, slow down and point to the case-link banner, the "What changed" block, and the single question.
- 4:45–5:30 (Phong), Codex: "We prepared AGENTS.md and task prompts before the event. Today Codex built [N] tasks, [N] commits and [N] tests, including an end-to-end test that replays this exact story and checks there is one case and no repeated question."
- 5:30–6:00 (Phong), closing: "Any agent, on any shift, can pick up any case. Customers stop repeating themselves. That is what an AI-native support operation looks like."

## Anticipated judge questions (two-minute Q&A)

- **Problem & Solution Fit — "Is this a real problem?"** Describe the specific returning-customer and agent-handover scenario; Shopee judges will recognize it. Do not cite figures without a source.
- **Build Quality — "What happens if the AI links the wrong case?"** The AI only proposes a link with a reason. The CS agent must confirm it. If several cases match, the AI explains the ambiguity instead of choosing one.
- **Build Quality — "Does it hold up if the model fails?"** Validate the model output against a schema, retry once if invalid, and return a safe fallback if it still fails. No action runs without approval.
- **Insight & Originality — "Isn't this just a helpdesk with a chatbot?"** Helpdesks typically attach AI to individual tickets. seaPilot centers the case, connects conversations, detects changes since the previous reply, and asks only for the missing fact.
- **Insight & Originality — "Why label facts by source?"** "Delivered" does not mean every item was inside, and a customer photo is not a final conclusion. CS agents need to know what has been verified before considering refunds or replacements.
- **Real-World Value — "Who benefits and how much?"** Customers stop repeating themselves, new CS agents can understand the case quickly, and businesses avoid duplicate tickets. Cite only measurements actually taken during the demo, such as CS B's time to understand the case.
- **Real-World Value — "How would you measure it in production?"** Measure case-link accuracy, repeated questions, duplicate tickets, and handover time.
- **Alignment — "Why AI-Native and not just automation?"** Without AI, a person must reread everything at every handover. seaPilot enables the case itself to retain context and identify changes.
- **Use of Codex — "What did Codex do, and what did you do?"** The team wrote `AGENTS.md` and divided the tasks. Codex wrote code, tests, and task logs; the team reviewed and integrated the work. Open `docs/codex-log.md` if asked for detail.
- **Scaling — "How does this scale to Shopee volume?"** Cases are stored in the database and tools are internal APIs. Email and app channels can be added. The draft argues that a few tool calls per suggestion keep model costs low and manageable; the review flags this as unmeasured.
