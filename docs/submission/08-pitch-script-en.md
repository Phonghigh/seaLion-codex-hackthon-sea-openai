# 08 — Six-minute pitch script (English, final build)

Updated 31 Oct 15:30 (Asia/Saigon) for the build on the public Sites (version 4).
Replaces the timed script in 07 for the finals. Q&A answers in 07 still apply.

- Customer: https://seapilot-customer-hoang.wirybear257.chatgpt.site
- Customer Service: https://seapilot-service-hoang.wirybear257.chatgpt.site/?demo=1
- Click steps: [DEMO-SCRIPT.md](../DEMO-SCRIPT.md). Every customer message is a one-click sample button, then **Send**.

## Roles

| Who | Does |
| --- | --- |
| Nhu | Problem (0:00–0:40) |
| Minh | Solution (0:40–1:00), narrates the demo |
| Hoang | Clicks the demo, answers technical questions |
| Phong | How we built it with Codex, closing (4:45–6:00) |

Before the slot: Reset on the CS page, both windows open, CS window at least 1440 px wide.
Each Suggest takes about 15–25 seconds: keep talking while it loads.

## 0:00–0:40 · Problem (Nhu)

"Picture a customer who orders a T-shirt and a cap, and only the T-shirt arrives.
She reports it in chat and sends a photo. The next day she writes again, in a new
conversation, and a different agent picks it up. That agent starts from zero. The
customer has to explain everything again and send the same photo again. Every
handover loses context, and every repeated question costs trust."

## 0:40–1:00 · Solution (Minh)

"seaPilot makes the case, not the chat, the unit of work. AI handles the simple
questions on its own. Everything else goes to the right human, with the full case,
what changed since the last reply, and exactly one question still missing.
Humans approve every reply and every action."

## 1:00–1:40 · Scene 0: AI handles the easy one (Minh narrates, Hoang clicks)

Hoang: Customer = Minh Tran, "Scene 0" button, Send.

Minh: "Minh asks: where is my order? Triage reads the message: order status,
low risk, and the answer is in our shipment data. So the AI replies by itself."

Hoang: CS page, open Minh's conversation, point at the Triage card.

Minh: "This card is the decision, in plain words. Category, confidence, risk,
and why it went to AI. Only simple, low-risk, system-answerable questions are
auto-handled. That rule lives in a config file, not in the prompt."

## 1:40–2:40 · Scene 1: a human case (Minh narrates, Hoang clicks)

Hoang: Customer = Lan Nguyen, "Scene 1" button (photo attached), Send.

Minh: "Lan reports the missing cap with a photo. A photo and a missing item mean
a human decides. Triage routes it to An on the delivery team, who is on shift."

Hoang: CS page, open Lan, click **Suggest**.

Minh: "The agent asks for a suggestion. Every fact is labelled by source:
what the customer said, and what our system knows. The order shipped in two
parcels; the cap is still in transit. Delivered describes a parcel, not its
contents. The agent reads the suggested reply and approves it, and that creates
case CS001."

Hoang: case title "Cap not received", **Approve and send**.

## 2:40–3:50 · Scene 2: the core moment (slow down here)

Hoang: **Next day**, then Signed in as **Binh**.

Minh: "Next day. The carrier marks the second parcel as delivered, and An is off
shift. Binh takes over."

Hoang: Customer (Lan): **New conversation**, "Scene 2" button, Send. CS: open it, **Suggest**.

Minh: "Lan opens a brand-new conversation, and she is annoyed she has to explain
again. seaPilot finds the existing case and says why it matches."

Hoang: click **Link to CS001**.

Minh: "One click links it. Binh now sees the whole history and Lan's earlier photo.
And look at this block: what changed since the last reply. Parcel B went from in
transit to delivered. So the draft does not ask for the photo again. It asks
exactly one question: did the parcel not arrive, or did it arrive without the cap?"

Hoang: **Approve and send**.

## 3:50–4:30 · Scene 3: action with evidence

Hoang: Customer (Lan): "Scene 3" button (photo B attached), Send. CS: **Suggest**.

Minh: "Lan answers: the parcel came, but no cap inside, with a second photo.
Now the AI proposes an escalation to operations, with both photos as evidence."

Hoang: **Approve escalation**, then **Approve and send**.

Minh: "A human approves the action. Only after it succeeds does the reply say the
case has been forwarded. No promise of refunds or dates the AI cannot keep."

## 4:30–4:45 · Scene 4: the right human (skip if late)

Hoang: Customer = Sam Lee, "Scene 4" button, Send. CS: open Sam.

Minh: "A vague message, and triage is not confident. So it goes to a human:
Carlos on General Support, who is on shift and speaks English."

## 4:45–5:30 · How we built it with Codex (Phong)

"We wrote AGENTS.md, the architecture and the task prompts first, and Codex did
the building: the API, the Postgres schema and seed data, the agent with three
read-only tools, triage and routing, both web apps, the tests, and publishing to
ChatGPT Sites. Our Codex hooks recorded over a thousand events today, and every
task is logged in docs/codex-log.md. 121 automated tests and 30 tooling tests run
on every change, including an end-to-end test that replays this exact story and
checks there is one case and no repeated question."

## 5:30–6:00 · Closing (Phong)

"AI answers the easy questions. Humans make the decisions that matter, with the
full case in front of them. Any agent, on any shift, can pick up any case, and the
customer never has to start over. That is seaPilot. Thank you."

## If the demo breaks

- Lost mid-way: **Reset**, **Start from Demo 2**, **Next day**, continue at Scene 2.
- Model slow: keep narrating the screen; do not click twice.
- Site or tunnel down: play the backup video (`seapilot-demo.mov`).
