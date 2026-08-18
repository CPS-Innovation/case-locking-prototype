---
title: Recording a DGA dispute outcome iteration
date: 2026-03-23
---

We previously [designed a flow for recording a dispute outcome](https://cps-new-design-history-2189687bc35a.herokuapp.com/manage-cases/recording-a-dispute-outcome/).

We've made changes to this based on user research.

## What we changed

### Entry and exit points

Previously, users reached the flow from the dedicated DGA case list within the DGA reporting area, and returned to it after completing each outcome.

The flow now starts from the [DGA reporting page for a case](../2026-03-20-viewing-dga-details-for-a-case/) and returns there on completion.

### Added failure details to the inset

The previous design showed the failure reason category in the inset — for example, "Evidential failure - Medical evidence". This did not give legal managers enough information to accurately answer the questions without leaving the flow and looking for the details behind the failure.

So we added a "Details" section to the inset, which explains the failure in more detail.

This is shown on every page of the flow so users do not have to navigate away.

## How it works

Users reach the flow from the [DGA reporting tab on a case](../2026-03-20-viewing-dga-details-for-a-case/), by selecting "Record dispute outcome" for a specific failure reason.

The first question asks whether the police disputed the failure.

![The "Did the police dispute this failure?" page. The caption reads "88D289230/3 - Record dispute outcome". An inset shows the failure reason "Evidential failure - Medical evidence" and its details. Below is a Yes/No radio question.](recording-a-dga-dispute-outcome-iteration/step-1-did-police-dispute.png)

### If the police did not dispute the failure

If the user selects 'No', they go straight to a check page. Only the dispute question is shown in the summary, since no further details are needed.

![The check page showing "Did the police dispute this failure? No" in a summary list with a Change link. The button reads "Record dispute outcome".](recording-a-dga-dispute-outcome-iteration/not-disputed-check.png)

### If the police disputed the failure

If the user selects 'Yes', they are asked three further questions:

Firstly, they're asked 'Did CPS accept the dispute?':

![The "Did CPS accept the dispute?" page, showing the same failure reason inset and a Yes/No radio.](recording-a-dga-dispute-outcome-iteration/disputed-cps-accepted.png)

Next, they need to enter a 'Reason for outcome'. This is a character count field for the legal manager to explain the basis for the decision.

![The "Reason for outcome" page, showing the failure reason inset and a character count text area.](recording-a-dga-dispute-outcome-iteration/disputed-reason.png)

Next, they're asked 'How did you discuss this dispute with the police?' with checkboxes for:

- Email
- Meeting
- Phone call

![The "How did you discuss this dispute with the police?" page, showing the failure reason inset and checkboxes for Email, Meeting, and Phone call.](recording-a-dga-dispute-outcome-iteration/disputed-method.png)

Then they're taken to a check answers page.

![The check page showing all four rows: "Did the police dispute this failure? Yes", "Did CPS accept the dispute? Yes", "Reason for outcome", and "How did you discuss this dispute with the police?" with Change links for each. The button reads "Record dispute outcome".](recording-a-dga-dispute-outcome-iteration/disputed-check.png)

### After recording

After confirming, the user is returned to the case's DGA reporting tab with a "DGA dispute outcome recorded" success banner.

![The DGA reporting tab with a green success banner reading "DGA dispute outcome recorded". The failure reason that was updated now shows a summary list with the recorded answers.](recording-a-dga-dispute-outcome-iteration/success.png)

### Activity log

The action is recorded in the activity log as "DGA dispute outcome recorded", showing the failure reason, police force, reporting month, and all answers given in the flow.

![The case activity log showing a "DGA dispute outcome recorded" entry by Natasha Rogers. A summary list shows the failure reason, police force, reporting month, whether the police disputed the failure, whether CPS accepted the dispute, the reason for outcome, and how the dispute was discussed. A "View outcome" link appears below.](recording-a-dga-dispute-outcome-iteration/activity-log.png)

The entry also appears in the global activity log, which shows events across all cases. It includes the case URN so users can identify which case the outcome relates to.

![The global activity log showing a "DGA dispute outcome recorded" entry at the top, alongside other event types from different cases.](recording-a-dga-dispute-outcome-iteration/activity-log-global.png)

## Error messages

### Did the police dispute this failure?

- Nothing selected: "Select yes if the police disputed this failure"

### Did CPS accept the dispute?

- Nothing selected: "Select yes if CPS accepted the dispute"

### Reason for outcome

- Empty: "Enter a reason for outcome"
- Too long: "Reason for outcome must be 200 characters or fewer"

### How did you discuss this dispute with the police?

- Nothing selected: "Select how you discussed this dispute with the police"
