---
title: Updating a DGA dispute outcome iteration
date: 2026-03-24
---

Legal managers can update a DGA dispute outcome before the deadline by clicking change on the [DGA reporting page for a case](../2026-03-20-viewing-dga-details-for-a-case/).

## How it works

The update flow is similar to the flow for [recording a dispute outcome](../2026-03-23-recording-a-dga-dispute-outcome-iteration/). 

The difference is that each page is pre-populated with the previously recorded answers and the content says ‘Update dispute outcome’ where it would have said ‘Record dispute outcome’.

![The "Did the police dispute this failure?" page with "Yes" already selected. The caption reads "88D289230/3 - update dispute outcome".](updating-a-dga-dispute-outcome/prepopulated.png)

### Changing an answer

When the user clicks ‘Change’, they’re taken to that question. 

After answering, they return straight to the check answers page rather than continuing through every subsequent step.

This works well when the answer being changed does not affect later questions — for example, updating the reason for outcome without needing to revisit the CPS acceptance or discussion method questions.

![The "Reason for outcome" page with the existing answer already filled in the text area.](updating-a-dga-dispute-outcome/change-reason.png)

If the user changes "Did the police dispute this failure?" from ‘No’ to ‘Yes’, they are not returned to the check answers page immediately. Because additional questions then must be answered.

### Check answers page

The check page shows all answers with change links.

![The check page showing "Did the police dispute this failure? Yes", "Did CPS accept the dispute? Yes", "Reason for outcome", and "How did you discuss this dispute with the police?" with Change links for each. The button reads "Update dispute outcome".](updating-a-dga-dispute-outcome/check.png)

After confirming, the user is returned to the case’s DGA reporting tab with a "DGA dispute outcome updated" success banner.

### Activity log

The action is recorded in the activity log as "DGA dispute outcome updated", showing the same fields as when an outcome is first recorded.

![The case activity log showing a "DGA dispute outcome updated" entry followed by the earlier "DGA dispute outcome recorded" entry, both by Natasha Rogers. Each entry shows a summary list with the failure reason, police force, reporting month, and all recorded answers.](updating-a-dga-dispute-outcome/activity-log.png)

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
