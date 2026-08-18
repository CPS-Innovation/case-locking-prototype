# Should "charged" live on the charge instead of the defendant?

## Problem

Right now `Defendant.status` is the only place a charging outcome is recorded. If a defendant has three charges and two are charged but one is discontinued, there is no way to represent that — `defendant.status` collapses to a single value for the whole defendant.

This is the same shape of problem as the case/defendant split already written up in `multiple-defendant-cases-problem.md` (a case isn't one status because it has multiple defendants at different stages) — just one level down (a defendant isn't one charging status because they can have multiple charges at different stages).

The schema already has a `Charge.status` field with real values defined in `app/data/charge-statuses.js` ("Charged", "Under review", "Proceeded", "Discontinued", "Amended"), and seed data populates it. But no application logic reads it — it's decorative. All eligibility checks, tags, and pipeline counts read `defendant.status` instead.

## `defendant.status` is doing two jobs

Looking at where it's set, it isn't just "charged or not" — it's the entire post-charge case journey for that defendant:

Charging outcome (4 of the 6 values actually defined in `app/data/case-statuses.js`):
- `Not charged`, `Charges pending`, `Charged`, `No further action`

Post-charge journey (defined inline as string literals — `statuses.NOT_GUILTY`, `statuses.SENTENCED` — plus a large set referenced across the hearing/trial/sentencing routes that are **not actually defined** in `case-statuses.js`: `PROSECUTOR_NEEDED`, `FIRST_HEARING_PENDING`, `FIRST_HEARING_OUTCOME_NEEDED`, `PTPH_HEARING_PENDING`, `PTPH_HEARING_OUTCOME_NEEDED`, `TRIAL_PREPARATION_NEEDED`, `TRIAL_PENDING`, `TRIAL_OUTCOME_NEEDED`, `SENTENCING_HEARING_PENDING`, `SENTENCE_NEEDED`).

That second group resolving to `undefined` (seen in `case--hearing-actions.js`, `case--mark-first-hearing-happened.js`, `case--record-first-hearing-outcome.js`, `case--mark-ptph-happened.js`, `case--mark-trial-concluded.js`, `case--mark-sentencing-hearing-started.js`, `case--record-sentence.js`, `case--mark-first-hearing-preparation-complete.js`, `case--mark-ptph-preparation-complete.js`, `case--mark-trial-preparation-complete.js`, `case--add-ptph-hearing.js`) is a separate pre-existing bug, not something to fix as part of this — flagging it because it shows the current status plumbing is already fragile, which is a point in favour of tightening this up rather than leaving it as is.

This split matters for scoping the change: hearings, trial, and sentencing genuinely happen to a person, not to an individual charge, so that part can reasonably stay defendant-level. Only the charging-outcome slice is the part that arguably belongs on the charge. (Real courts do track plea and disposal per count, and `Charge.plea` already exists unused in the schema — but that's a bigger question than this piece of work needs to answer now.)

## Proposed model

- Give `charge-statuses.js` real, meaningful values for the charging-outcome lifecycle, reusing/aligning with the charging-outcome subset of `case-statuses.js` where they mean the same thing (needs a decision — see open questions).
- Add a derivation helper, e.g. `getDefendantChargingStatus(defendant)`, that computes the charging-outcome part of a defendant's status from their charges, rather than reading a stored field.
- Keep `defendant.status` for the post-charge journey only (hearings/trial/sentencing) — or replace it with a derived value entirely once the rollup rule is settled. Don't decide this until the open question below is answered.

## What would need to change

Writes to `defendant.status` for a charging outcome:
- `case--review.js` (`decisionStatusMap`, submit review)
- `case--defendants.js` (`make-charging-decision/check`, `no-further-action`)
- `case--simulate-authorised-charges.js` (police confirms charges → `CHARGED`)

Reads of `defendant.status` for charging-outcome logic:
- `case--make-charging-decision.js`, `case--defendants.js`, `case--review.js` — eligibility filters (`d.status === statuses.NOT_CHARGED && d.needsReview`)
- `overview.js` — pipeline counts by status
- `cases.js` — distinct statuses used for case list filters
- `app/helpers/caseStatus.js` — rolls defendant statuses up to a case-level status
- Views: `defendants/show.html`, `defendants/index.html`, `overview/index.html` — status tags

Seed data setting `defendant.status` directly, which would need to set charge-level status instead and let defendant status derive: `bruce-cases.js`, `defendants.js`, `diverged-cases.js`, `kirsty-cases.js`, `rachael-cases.js`, `simon-cases.js`, `tony-cases.js`.

That's roughly 15 route/view/helper files plus every seed helper — which is what prompted "maybe this is a lot of work to do in one go."

## Phasing

Big bang — derive `defendant.status` from charges everywhere in one pass. Correct end state, but all ~15 call sites and every seed helper move together, so nothing is shippable until the whole thing is done.

Additive first — start setting `Charge.status` correctly wherever charges are created or change (add-offence, change-offence, charging decision, simulate-authorised-charges), while `defendant.status` stays authoritative for everything that reads it. Once charge-level data is trustworthy, swap read sites over one at a time (eligibility filters first, then tags, then pipeline counts), each swap shippable and testable on its own. This defers the rollup-rule decision until the specific read site that needs it is actually being changed.

Additive first is the lower-risk path given the size of the call-site list above.

## Open questions

- Rollup rule: if a defendant has one charge `Charged` and one `Discontinued`, what does "the defendant's charging status" mean at each of the read sites above (eligibility for charging decision, pipeline counts, tags)? This needs a product decision before any read site can be swapped over — same category of open question as section 5 of `multiple-defendant-cases-problem.md`.
- Do the existing `charge-statuses.js` values ("Charged", "Under review", "Proceeded", "Discontinued", "Amended") map cleanly onto the charging-outcome subset of `case-statuses.js` ("Not charged", "Charges pending", "Charged", "No further action"), or do some of them (e.g. "Amended", "Proceeded") mean something else entirely that hasn't been defined yet?
- This overlaps with two questions already raised and unanswered in `charging-decision-questions.md` (#3: should making a charging decision update `Charge.status`; #4: what should the non-charge/non-do-not-charge outcomes do to defendant/charge status) — worth resolving together rather than as two separate conversations.
