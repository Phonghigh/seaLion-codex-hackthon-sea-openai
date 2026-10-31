# Known bugs (found in manual testing, fix later)

Found by Hoang on the public Sites, 31 Oct 2026 (Asia/Saigon).

| # | Found | Area | Bug | Expected | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | 13:47 | Customer page | On first visit (or right after Reset) the message box is disabled with the placeholder "Start a new conversation first". The customer cannot type until they click New conversation, even though they have never chatted. | When the customer has no open conversation, the message box is enabled; sending the first message creates the conversation automatically. | Open |
| 2 | 13:52 | Customer page | After attaching an image (upload or demo sample) and sending, the customer's own message shows text only; the attached photo is not visible in the thread. | The sent message shows a thumbnail or labelled tile of the attached photo, as the CS page does. | Open |
| 3 | 13:52 | CS page, Suggested next step | After Suggest, the panel shows facts and a "Use suggested reply" button but not the draft text itself, so the agent cannot read the reply before using it. | The panel shows the suggested reply text above the button. | Open |
