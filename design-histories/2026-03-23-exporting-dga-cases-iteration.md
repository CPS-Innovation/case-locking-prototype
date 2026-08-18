---
title: Exporting DGA cases iteration
date: 2026-03-23
---

We previously [designed a page for exporting DGA cases](https://cps-new-design-history-2189687bc35a.herokuapp.com/manage-cases/exporting-dga-cases/).

We’ve added a question to stop users from accidentally sharing personal or sensitive information outside of CPS.

## What we changed

### Added a question about sharing outside the CPS

Area performance managers (APMs) sometimes share the export with police forces. The ‘reason for outcome’ column can contain sensitive or personal information that should not be shared outside the CPS.

We added a "Are you sharing this export outside the CPS?" question with ‘Yes’ and ‘No’ options. 

Choosing ‘Yes’ removes the ‘reason for outcome’ column from the exported spreadsheet. 

The hint text on the ‘Yes’ option says “The ‘reason for outcome’ column will be removed because it may contain sensitive or personal information.”

![The export page for February 2026 - Metropolitan Police. The heading reads "Export cases that had a DGA". Below is the new question "Are you sharing this export outside the CPS?" with Yes and No radios. Yes has hint text explaining the reason for outcome column will be removed. Below that is the existing "Time period" section with week checkboxes.](exporting-dga-cases-iteration/export.png)

### Deciding not to always remove the 'reason for outcome' column

We considered removing the column for all exports, regardless of who the recipient is.

We decided against this because APMs who share the export within CPS need to see the information. 

For example, a note identifying a police officer who is not performing well gives managers the information they need to arrange training or handle the issue sensitively. Removing it by default would hide this information from the people who need it.

We also did not want to discourage users from entering sensitive information in the first place. The value of the field depends on users being clear about the problem. Making the field feel risky — by implying its contents might always be shared — could prevent users from entering the informaton clearly.

Asking users lets them choose based on who they are sharing with, keeping the column available for internal use while protecting it from external recipients.

## Error messages

### Are you sharing this export outside the CPS?

- Nothing selected: "Select yes if you are sharing this export outside the CPS"

### Time period

- Nothing selected: "Select a time period"
