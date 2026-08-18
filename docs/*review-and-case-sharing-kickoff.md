# Epic: Helping reviewing lawyers review a case and share it with the relevant parties as early as possible

## Problems

1. At the moment, multiple users and multiple separate tasks have to be performed between a case and it's material coming in and the case being shared to advocates, defence, defendant, court etc. For example, a case work assistant opens a case, tidies it (housekeeping), may raise a task for a reviewing lawyer, reviewing lawyer eventually opens that task, then reviews the case, then raises another task for others users to prepare a bundle, warn a witness, and whatever else may be needed before it gets shared. This is long-winded and unnecessary adminstration. [Solution: Lawyer opens case, reviews it, the act of reviewing will send off the right notifcations/bundles/whatever those things are to the right people.]

[The act of sharing materials to common platform is long winded and error prone - manually adding materials, organising materials and collating the materials into a PDF.....tbc]

2. Reviews are either not done or done badly, and information, evidence or elements are not captured. As a result, the advocate can't do their job properly. It also means advocates have to start early on the day of the hearing to get a grip on the case, effectively doing a review from scratch. That means they're doing multiple jobs at once, one of which should already have been done. [Shiv to expand on this another time]

3. Defendants don't receive the case ahead of first hearing, which doesn't comply with the rules. [Shiv to explain why] and it's unnecessary. It's also crucial because if the prosecution case is clear to the defence, they won't fight it, and the defendant will plead guilty more quickly - meaning fewer hearings, shorter hearings, and fewer adjournments. [Solution: build a service that gives the defendant access to their own case and updates them whenever CPS updates the case.]

4. Advocates do the review during court quickly, as a result of the problems above. In an ideal world we'd solve the problems above, but we probably have to account for the early stages not being done perfectly and the case still making its way to advocates in court. For example, perhaps there are too many cases for laywers to handle so some unfortunately make their way into court for the advocate to deal with last minute. So we should make it easy for advocates to review in court, by making structured annotations that can be recorded and maintained later. [We know that reviewing lawyers are doing unnecessary shit 40% of the time. So if we get rid of the 40% there's a much better chance that a review can be done before court, BUT that doesn't guarantee that]

## What gets shared

- Crown Advocate (internal) - every document with relevant evidence (the bundle, currently one big PDF) - via CMS
- Crown Advocate (external) - as above - via PROSAPP?
- Defence lawyer - as above - via Common Platform
- Court - as above - via [platform unknown]

## What IDPC is

1. A summary of the circumstances of the offence
2. The defendant's interview, if there is one
3. Any evidence we consider material to the plea, to the allocation of the case for trial, or to sentence
4. Previous convictions
5. Victim impact statements, if they exist

## Scope

1. Update the review flow so annotations take into account things like charges, elements, points to prove and disclosure more realistically; handle action plans etc
2. Design for the 3 “Routes into CPS” scenarios below
3. Update the review flow so it clearly explains what will happen as a result of submitting the review - for example, that it will notify the advocate the case has been reviewed, with a link to go and look at it
4. Design a first stab mock-up of what a defendant service might look like
5. Design a first stab mock-up of what an advocate view might look like
6. Design a first stab mock-up of what the case looks like after a review has been submitted (use Rebekah’s Claude mock-up as inspo)

## Routes into CPS

These are the three ways a case currently reaches CPS, and what review happens at each step. 

CPS never charges a defendant - charging is always done by the police or by the referring agency (for example, the NCA). 

A defendant's status only becomes Charged when that body sends back authorised charges; CPS's own review never moves a defendant into Charged by itself.

### Route 1: Police case, CPS pre-charge advice

1. Police create the case.
2. CPS reviews it and states what the charges should be, back to the police. The defendant stays Not charged - CPS has stated charges, it hasn't charged anyone.
3. Later, police send back authorised charges (the formal MG04), which also carries the first hearing details. This is new material that triggers a second review.
4. The defendant becomes Charged at this point, as a fact reported by the police - not as a result of anything CPS decides in this second review. This second review isn't a charging decision (the charges are already decided); it's CPS reconciling what came back against what it stated:
   - Match: the authorised charges (MG04 structured data via DCF) match what CPS stated. This is a quick, lightweight, happy path review.
   - Mismatch: the authorised charges don't match (MG03?). This needs a fuller review by CPS. Open question: if the police try to send an MG04 via DCF that doesn't match the captured charges in CMS, can we stop them sending it, like we do with auto-triage? If we can't, we'd need to flag it in CPS instead, for a case work assistant or reviewing lawyer to act on manually.

### Route 2: Police-charged case

1. Police charge a defendant on their own authority, without seeking CPS pre-charge advice first.
2. The case arrives at CPS already Charged, with authorised charges and first hearing details attached from the start.
3. CPS does a first review of it, but is never asked to decide a charge, because one's already been made.
4. What CPS does after this review isn't settled yet - see Research question 7 below, which already covers this exact situation.

### Route 3: Offline case (for example, the NCA)

1. A non-integrated agency sends material by email or post - there's no system integration.
2. CPS creates the case and double-keys the material in. Review happens immediately after creation, rather than as part of creating the case.
3. CPS reviews it and states what the charges should be, back to the agency. The defendant stays Not charged.
4. The agency sends back authorised charges offline. It's not confirmed whether first hearing details are ever included this way, since there's no structured feed, unlike Route 1's DCF/TWIF integration with the police.
5. As with Route 1, the defendant only becomes Charged once those authorised charges are received - not as a result of a CPS decision. The same match/mismatch reconciliation applies in principle, but since everything arrives offline rather than via a structured feed, there's no automated check either way - CPS always has to compare what came back against what it stated by hand.

## Assumptions

1. Even if the police send back a matching MG04, the MG04, alongside any other new material, should still be reviewed
2. Finishing the review is what triggers the "Case X has been updated" email notification (see Research question 5 for whether the charging decision itself could also trigger automatic sharing)
3. A review isn't just the initial review - it's any time something comes in that requires somebody to review it. This can happen at any point; what differs is the content of that review, depending on the state of the system (we need to work out those states)
4. Common platform can only accept documents in a certain structure, it cannot show any additional structured data tied to documents

## Open questions

### Technical

1. When the police send authorised charges, the first hearing date comes with them. Is that part of the structured data we receive via DCF? We want to know whether, once authorised charges are received, a CMS user still has to touch the case to update the hearing date details. [The date comes in via twif and DCF as structured data that we can use to populate/suggest for filling out the hearing date for first hearing] [Nicola, Kirsty]

### Research

1. When do defendants first need to be notified of the case details by CPS, and what should they have access to? [Rebekah, Shiv]
2. When do advocates first need to be notified of the case details by CPS, and what should they have access to? [Rebekah, Shiv]
3. When do defence lawyers first need to be notified of the case details by CPS, and what should they have access to? [Rebekah, Shiv]
4. When does the court first need to be notified of the case details by CPS, and what should they have access to? [Rebekah, Shiv]

According to the criminal procedure rules, everyone needs access to the case as early as possible.

- If a case needs a review (not been charged yet) at the moment most cases are not reviewed for 9 months. They just don't have time to look. Might also be about how the current system (task list) is designed.
- If a case comes in charged, at the moment, cases are not reviewed until it's in court, so it's done by the advocate.
[Make things better in general so that their general workload is drastically reduced. The new interface should make it really easy to see cases that need a review in order to nudge them to actually review them as soon as possible. Everything should be reviewed before court.]


5. Is there a scenario where the reviewing lawyer makes a decision to charge, but the case isn't ready to share yet? In an ideal world, selecting Decision: Charge is itself the signal that, once the police agree and send back authorised charges, the case is automatically shared with the right people. [Rebekah, Shiv, Kirsty]
6. Could the police ever disagree with the prosecutor's charging decision and send back authorised charges that differ from what the prosecutor stated? Probably yes. [Rebekah, Shiv, Kirsty]
7. If a police-charged case comes in already charged, and the reviewing lawyer disagrees with the charges on review, what should happen? [Rebekah, Shiv, Kirsty]
8. Should the review task list (specifically the Charging decision step) always be the same, regardless of what triggered the review? It's only relevant when CPS is the one deciding (the first review in Routes 1 and 3). When a review is triggered by authorised charges coming back (the second review in Routes 1 and 3, and the only review in Route 2), there's no decision to make - the charges are already set by the police or agency. [Adam]
9. Does first hearing details ever need manual entry, or only when the incoming channel isn't structured? Route 1 (police, via DCF/TWIF) may carry structured hearing data that could pre-fill the field. Route 3 (NCA, offline) likely has no structured feed at all, so may always need manual entry - worth confirming with the team whether NCA ever sends structured data, or whether it's always extracted by hand from whatever they send. [Adam, Kirsty]
10. Assumption 1 above (that review can never be skipped, even on a matching MG04) is currently just an assumption, not a confirmed decision. It needs explicit sign-off from the team, since it directly determines whether a police-charged case can ever skip CPS review before being shared externally with advocates, defendants, defence lawyers and the court. [Rebekah, Shiv, Kirsty]
11. Could paralegal officers do the review or some of the review, or some types of reviews to reduce the amount of work reviewing lawyers have to do? [Shiv, Kirsty]

## Design notes to consider

- If cases are assessed early and often, every one of those assessments would trigger a notification to the defendant. They'd need at least a clear sentence saying something like "these charges are still being reviewed and may change" - or we decide that's too much information, and only tell defendants once things have settled at specific points (in which case we need to define those points). [Adam, John]
- "Prosecutor" is an ambiguous term. Could we use "Reviewing lawyer" and "Advocate" instead (or similar)? [Adam, John, Kirsty]
- Do we hold an attribute against a case for which police force/agency created the case? [Knowing this would let us seed realistic scenarios into the proto. Related: is it possible for a DCF/TWIF case via the police to come in with an MG04 but without the first hearing details?] [Kirsty]
- What are some realistic file names for the material, so we can decide whether we need a rename feature, and how to seed the db? [Kirsty, Adam]

## Todo

[ ] Reinstate "waiting on authorised charges" status inbetween Not charged and Charged