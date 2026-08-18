---
title: DGA reporting page iteration
date: 2026-03-18
---

We previously [designed a page for DGA reporting](https://cps-new-design-history-2189687bc35a.herokuapp.com/manage-cases/reporting-on-cases-that-failed-dga/).

We’ve iterated the page as part of a wider redesign of DGA reporting.

## What we changed

### Removed status tags

The previous design showed a status tag next to each police unit. They were:

- Not started
- In progress
- Completed"

We removed the tags because they did not add value. A status of "Not started" or "In progress" is already implicit in the deadline message. A status of "Completed" is implicit when no deadline message appears.

### Replaced status tags with a deadline message

Instead of a tag, months with outstanding outcomes now show a sentence describing how many cases need outcomes recorded and when the deadline is.

For example: "Outcomes for 1 case must be recorded by 10 April 2026 at 11:59pm."

This is clearer than a status label as it tells the user what needs doing and when, without them having to interpret what "In progress" means.

Months where all outcomes have been recorded - or where there are no non-compliant cases - appear as plain links with no additional text.

![The DGA reporting page showing four months listed as links. February 2026 has a message: "Outcomes for 1 case must be recorded by 10 April 2026 at 11:59pm." January 2026, December 2025, and November 2025 appear as plain links with no additional text.](dga-reporting-page-iteration/dga-reporting-page.png)
