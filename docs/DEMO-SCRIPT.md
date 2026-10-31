# seaPilot demo script (operator: Hoang)

Two windows side by side, CS window at least 1440 px wide:
- Customer: https://seapilot-customer-hoang.wirybear257.chatgpt.site
- Customer Service: https://seapilot-service-hoang.wirybear257.chatgpt.site/?demo=1

Every customer message has a **sample-message button** above the message box. Click it,
then click **Send** (Enter does not send). Photos are attached automatically.
Each Suggest takes about 15-25 s with the real model.

## Before the slot
1. CS page: **Reset** (demo token from the API `.env`, ask Hoang). "Signed in as" becomes An.
2. API, Postgres and the Cloudflare tunnel must be running on Hoang's laptop.

## Scene 0 - AI handles a simple question (0:40)
1. Customer: pick **Minh Tran**. Click **Scene 0 · where is my order**, Send.
2. Wait ~20 s. Minh gets an answer from "AI · Support" without any agent.
3. CS: open Minh's conversation (tab **Auto-handled**). Show the **Triage** card:
   decision AI, order_status, risk 1/5, plain-English reason.
   Say: "Simple, low-risk, answered from system data: the AI replies. Everything else goes to a human."

## Scene 1 - Missing item, human decides (1:10)
1. Customer: pick **Lan Nguyen**. Click **Scene 1 · missing cap + photo A**, Send.
2. CS: open Lan's conversation. Triage card: Human, routed to **An** (has a photo).
3. Click **Suggest**. Show facts with sources (Customer / System) and the **Suggested reply**.
4. Type a case title (e.g. "Cap not received"), click **Approve and send**. Case **CS001** is created.

## Next day
1. CS: click **Next day**. Timeline shows parcel B now delivered.
2. Switch **Signed in as** to **Binh** (An is off shift).

## Scene 2 - New conversation, same case (core, 2:10)
1. Customer (Lan): click **New conversation**, then **Scene 2 · follow-up next day**, Send.
2. CS: open the new conversation, click **Suggest**. Banner suggests **Link to CS001** with a reason.
3. Click **Link to CS001**. History and the old photo appear; the draft updates by itself.
4. Point at: "parcel B in transit -> delivered", exactly one question, no request to resend the photo.
5. Click **Approve and send**.

## Scene 3 - Escalate with evidence (3:40)
1. Customer (Lan, same conversation): click **Scene 3 · opened parcel B + photo**, Send.
2. CS: click **Suggest**. Both photos, no question, proposed escalation to operations.
3. Click **Approve escalation**. Status "Escalated"; the draft updates to past tense
   ("has been forwarded to the operations team"), no refund or date promised.
4. Click **Approve and send**.

## Scene 4 - Unclear request goes to the right human (4:30, skip if late)
1. Customer: pick **Sam Lee**. Click **Scene 4 · vague problem**, Send.
2. CS: open Sam's conversation. Triage: Human, low confidence, routed to **Carlos, General Support** (English, on shift).

## Expected end state
CS001 waiting on ops, assignee Binh, 2 conversations, 2 customer photos, 1 operations task with both photos.

## If something breaks
- Lost mid-way: **Reset** -> **Start from Demo 2** -> **Next day** -> continue at Scene 2.
- CS stuck on "Loading": reload the page; make sure the window is visible and wide.
- Draft did not update: click **Use suggested reply** in the right panel.
