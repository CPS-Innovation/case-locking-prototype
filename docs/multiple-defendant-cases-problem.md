# Case Management System
## Case Status & Defendant Tracking — Design Reference

*April 2026 | Internal Working Document*

---

## 1. The Core Problem

A case management system must track the status of cases as they move through the legal process. The fundamental challenge is that a case is not a single entity with a single status — it is a container for one or more defendants, each of whom may be at a different stage of the legal process at any given time.

For simple cases with a single defendant, a case-level status works perfectly well. However, a significant minority of cases involve multiple defendants. When those defendants are at different stages, a single case-level status becomes misleading, inaccurate, and potentially dangerous for case management.

### Illustrative Example

A case comes in with a single defendant. That defendant is triaged, a charging decision is made, and a first hearing is scheduled. The case status legitimately reflects this progress. Then a second defendant is identified and added to the case. This new defendant must begin the process from the start — they need to be triaged before any further action can be taken.

The case now has two defendants at entirely different stages. Any single case-level status would either misrepresent the first defendant's progress or obscure the fact that the second defendant still needs urgent attention.

---

## 2. The Case Lifecycle Shape

Through discussion, a clear lifecycle shape has emerged. The case moves through three broad phases:

### 2.1 Divergent Phase (Pre-Trial)

Everything that happens before the trial runs at the defendant level. Each defendant has their own independent track covering:

- Triage
- Charging decision
- First hearing
- Other pre-trial stages as applicable

### 2.2 Convergent Phase (Trial Onwards)

By the time the case reaches trial, all defendants have been brought up to speed. From this point, defendants move through the remaining stages together as a single unit. The case-level milestones (Trial Date Set, Trial, Verdict, Sentencing) are shared and singular — they apply to the whole case, not to individual defendants. There may be exceptions to this, but the convergence by trial is the normal expected pattern.

### 2.3 Early Exit

Individual defendants may conclude their involvement in the case before others — for example through a guilty plea, dropped charges, or acquittal. This means the system must support defendants concluding independently, while the case itself remains open for other defendants. Whether concluded defendants remain visible in the case view, or are archived, is an open question (see Section 5).

---

## 3. Proposed Mental Model — Two Layers

The proposed solution is to formally separate the case into two distinct layers, each with its own status concept:

### 3.1 Case-Level Milestones

These are the major shared gates that the entire case passes through. They are singular — there is one trial, one verdict, one sentencing. They apply to the case as a whole, not to individual defendants. Examples include:

- Trial Date Set
- Trial
- Verdict
- Sentencing

### 3.2 Defendant Tracks

Every pre-trial action happens at the defendant level. Each defendant on the case has their own independent track with their own status. This is where the work actually happens — triaging a defendant, making a charging decision, scheduling hearings. The defendant's track status is the ground truth for where that individual is in the process.

---

## 4. UI Design Options Considered

Four distinct approaches were identified for handling case status in the user interface. Each represents a different philosophy about how to surface complexity to caseworkers.

---

### Option 1 — Abolish Case Status, Replace with Defendant-Level Status

**Description**

In this approach, the case is treated purely as a container. There is no case-level status at all. Instead, status is always shown at the defendant level. Every view of a case — whether on the case detail page or in a pipeline list — shows statuses per defendant. The "case status" concept is replaced entirely with a derived summary such as:

> *"3 defendants — 2 active, 1 concluded"*

For simple cases with a single defendant, this looks and feels exactly the same as the current system — one defendant, one status. For complex cases, it is completely honest about the true state of affairs.

**Advantages**

- Completely accurate — no misleading single status
- Simple cases (single defendant) are unaffected
- Forces the UI to surface the true complexity rather than hiding it

**Disadvantages**

- Caseworkers accustomed to case-first thinking must adjust their mental model
- Pipeline and reporting views must be redesigned to work with defendant-level data
- May add cognitive load for users scanning many cases at once

---

### Option 2 — Keep Case Status as a Headline with a Warning Indicator

**Description**

In this approach, the existing case-level status concept is preserved for the vast majority of simple cases. When all defendants are at the same stage, the case status behaves exactly as it does today. However, when defendants diverge — i.e., when they are at different stages — the system displays a visual flag or badge alongside the status. For example:

> *"First Hearing ⚠ Mixed statuses"*

Clicking or expanding the warning indicator reveals the per-defendant breakdown. This keeps the common case simple and low-friction, while still surfacing complexity when it exists.

**Advantages**

- Lowest disruption to existing workflows — most users see no change
- Pipeline and reporting views remain largely the same
- Complexity is surfaced progressively — only shown when needed

**Disadvantages**

- Warning indicators can be ignored, especially in high-volume environments
- The headline status is still technically a lie when defendants are diverged
- Risk that caseworkers miss urgent triage needs on newly added defendants

---

### Option 3 — Case Status Auto-Derives from a Defined Rule

**Description**

In this approach, a business rule is defined that determines how to derive a single case-level status from the set of defendant statuses. The most natural rule is:

> *"Case status = the earliest (least-advanced) defendant status"*

This means the case is considered to be at the stage of the defendant who is furthest behind. So if one defendant is at First Hearing and a new defendant is added at Triage, the case status reverts to Triage. This approach is fully automated — no manual intervention is needed.

**Advantages**

- Fully automated — no manual status management required
- Predictable and consistent — users can learn and trust the rule
- A single case status is preserved, keeping pipeline views simple

**Disadvantages**

- The case appears to regress when a new defendant is added — this can alarm caseworkers and management who see the pipeline moving backwards
- Hides the progress of more advanced defendants
- Alternative rules (e.g. most advanced status) have different but equally problematic failure modes

---

### Option 4 — Split the Concept: Case Phase vs. Defendant Track

**Description**

This approach formally introduces two separate and distinct status concepts, each with a different owner and purpose:

- **Case Phase** — a high-level administrative phase set manually by a supervisor or legal manager. Examples: Investigation, Pre-Trial, Trial, Concluded. This is the macro view of where the case sits. It changes infrequently and by deliberate decision.
- **Defendant Track** — the detailed, system-driven workflow status for each individual defendant. This is where day-to-day casework is tracked: triage, charging, hearings, etc. It updates frequently and reflects the granular reality of the case.

This mirrors how some Crown Court and large prosecution systems are structured. The phase is the administrative truth; the tracks are the operational truth.

**Advantages**

- Cleanly separates two genuinely different concerns — administrative oversight vs. casework execution
- Legal managers can track cases at the phase level without needing to understand every defendant's track
- Caseworkers have full, honest, granular status at the defendant level

**Disadvantages**

- Introduces a two-tier status system that requires more user education and onboarding
- The phase requires manual maintenance — someone must remember to update it
- Risk of phase becoming stale or out of sync with the actual defendant tracks

---

## 5. Open Questions Not Yet Resolved

The following questions were raised in the design discussion and have not yet been answered. They will materially affect the data model and UI design and should be resolved before implementation begins.

### 5.1 What Triggers Convergence?

When defendants have been running on independent pre-trial tracks, something must bring them together at the point of trial. The question is whether this convergence is:

- A deliberate caseworker or manager action — e.g. an explicit "Set Trial Date for All Defendants" step that formally merges the tracks
- Automatic — i.e. the system automatically transitions to shared milestones when all defendants reach a certain stage

The answer affects how much manual overhead caseworkers carry, and whether the system can enforce that convergence has happened before trial-stage actions are permitted.

### 5.2 What Happens to Defendants Who Exit Early?

When a defendant concludes their involvement before the case ends — for example through a guilty plea, dropped charges, or a separate acquittal — three possible approaches exist for the UI:

- The defendant disappears from the active case view entirely
- The defendant remains visible within the case but is clearly marked as "Concluded" or "Closed" — their track is frozen and no further actions are available
- The defendant is archived and accessible via an expandable section or separate tab within the case

This decision affects case history, audit trails, and how prosecutors and legal managers review the complete picture of a case. It may also differ depending on the reason for early exit.

### 5.3 Who Sets Case-Level Milestones, and How?

For case-level milestones (Trial Date Set, Trial, Verdict, Sentencing), the question is whether these are:

- Manually set by a caseworker or legal manager as deliberate actions
- Automatically derived by the system — e.g. the case transitions to Trial when all defendants have reached a threshold pre-trial stage

A fully automated approach reduces manual overhead but may not reflect the reality of how prosecutions are scheduled and managed. A manual approach gives control to the appropriate people but requires discipline and carries the risk of being forgotten or delayed.

---

## 6. Users of the System

The following user roles have been identified as primary users of the case management system. Each has different needs in relation to case and defendant status:

- **Caseworkers** — day-to-day management of individual cases and defendant tracks
- **Case Work Assistants** — supporting caseworkers with administrative tasks
- **Prosecutors** — responsible for charging decisions and trial strategy
- **Paralegal Officers** — supporting legal and administrative functions
- **Legal Managers** — oversight of caseloads, pipeline management, and escalations

Legal Managers are likely to interact primarily at the case-phase level, while Caseworkers and Casework Assistants will work predominantly at the defendant-track level. Any UI solution should serve both audiences without forcing either group to navigate complexity that is irrelevant to their role.

---

## 7. Recommended Next Steps

- Resolve the three open questions in Section 5 with input from caseworkers and legal managers
- Select one of the four UI options in Section 4, or define a hybrid approach
- Formally define the full set of defendant track statuses and case-level milestones
- Define the data model: how cases, defendants, and statuses relate in the database
- Prototype the swim lane view for the case detail page and test with caseworkers
- Define how the pipeline/case list view handles multi-defendant diverged cases