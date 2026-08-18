# First hearing prompt — identity bar and defendant-level strategy

*April 2026 | Internal Working Document*

---

## 1. The problem

When a charging decision has been made and the police have confirmed charges, a defendant enters the `Charged` status. At this point a first hearing needs to be scheduled, but nothing in the current UI prompts the caseworker to do so.

This document defines the rules for where and when the "Add first hearing" prompt should appear.

---

## 2. Where prompts live

There are two places an "Add first hearing" prompt can appear:

**Identity bar** — the persistent header shown on every case page. This is the highest-visibility location and is appropriate for case-level actions that apply to all (or most) defendants.

**Defendant details page** — the show page for an individual defendant. Actions here are scoped to that defendant only. There is no "which defendant?" question — you are already in that defendant's context.

There is no inline prompt on the case overview defendant list. To take action at the defendant level, the caseworker navigates into the defendant details page.

---

## 3. Rules by scenario

### 3.1 Single defendant — charged, no first hearing

Show "Add first hearing" in the identity bar and on the defendant details page.

Clicking from the identity bar goes straight into the add-first-hearing flow with no defendant selection step (there is only one defendant).

### 3.2 Multiple defendants — all charged, none have a first hearing

Show "Add first hearing" in the identity bar and on each defendant's details page.

Clicking from the identity bar triggers the add-first-hearing flow which includes a "Defendants" step. All defendants are pre-selected. The caseworker can deselect individuals if needed.

### 3.3 Diverged statuses — defendants at different stages

Do not show a prompt in the identity bar. The identity bar cannot represent a meaningful single action when defendants are at different stages.

Actions for each defendant are available on their individual defendant details pages only.

### 3.4 Multiple defendants — all charged, but hearing coverage is partial

For example: two defendants, both `Charged`, but only one has a first hearing scheduled.

**Current behaviour:** Show "Add first hearing" on the defendant details page for the defendant without a hearing. Do not show anything in the identity bar.

**Deferred:** The identity bar treatment for this scenario is more complex. Two actions may be relevant — creating a new hearing for the uncharged defendant, or adding them to the existing hearing. This is a separate design problem and has not been resolved. See section 5.

---

## 4. Flow differences: identity bar vs defendant details

| Entry point | Defendant selection step |
|---|---|
| Identity bar, single defendant | No — skip straight to date |
| Identity bar, multiple defendants (all charged) | Yes — "Defendants" step, all pre-selected |
| Defendant details page | No — always scoped to that defendant |

---

## 5. Deferred: partial hearing coverage and the identity bar

When a case has multiple defendants who are all `Charged` but only some have a first hearing, there are two possible actions a caseworker might want to take from the identity bar:

1. **Add a new first hearing** for the defendant(s) who do not have one
2. **Add the defendant(s) without a hearing to an existing first hearing**

These are different actions with different flows. It is not yet clear which should be surfaced, whether both should be offered, or how to present the choice without adding confusion.

This scenario should be handled at the defendant details page level only until the design is resolved.

---

## 6. The "Defendants" step in the add-first-hearing flow

When the add-first-hearing flow is triggered from the identity bar on a multi-defendant case, it includes a step asking which defendants the hearing applies to.

The current implementation uses checkboxes with all defendants pre-selected.

A future improvement would replace this with a conditional reveal pattern:

- **All defendants** (default, pre-selected)
- **Specific defendants** → reveals a checkbox list

This change has not yet been made and is out of scope for the current sprint.
