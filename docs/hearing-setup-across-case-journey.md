# How hearings should be set up across a case journey

When a criminal case moves through the system, there are several key court hearings along the way:

— first hearing
- PTPH (pre-trial preparation hearing)
- trial
- sentencing hearing

At the moment, the system doesn't have a consistent approach to when and how these hearings get scheduled. 

This document sets out a proposed approach and identifies the specific gaps that need to be addressed.

Each hearing follows the same process:

1. Create hearing - enter hearing date, time, venue
2. Prepare for hearing - warn witnesses, create bundles, carry out directions, etc
3. Wait for hearing to start
4. Record outcome of hearing and progress case

Creating the hearing could be treated:

- during the transition between phases, for example, when recording the outcome of the first hearing, you set up the PTPH before it moves to “PTPH prep needed”
- as a separate status, for example, “PTPH hearing needed”
- as one of the actions within “PTPH pre needed” - state would move on when the user completes all those tasks (which may include marking everything as done explicitly)

## Scenario 1. Charging decision → first hearing

When a charging decision is made and the case is being charged, it passes to the police to execute that charge. 

Once the police have done so and the charge is confirmed, the case enters a "first hearing preparation needed" stage.

At the moment, nothing in this stage prompts the caseworker to set up the first hearing. There is nowhere in the system that says "what is the date and venue of the first hearing?" as part of this stage. The caseworker would need to go out of their way to add it manually.

1. Should this happen as part of making the decision to charge? [No]
2. Should this happen once the police have sent authorised charges? [Yes]
3. Should this happen as part of the “First hearing prep” stage? [Maybe? Different people set up the hearing to prepare for hearing. If we had a “First hearing needed” status it could block the next phase or make the next phase useless coz by the time it could get into that state, it would skip it]
4. Can this happen before? [No]

[We believe that the police will have set up the first hearing and give us a date in CMO1 (Could DCF populate this in some way?). Then CPS will key it in separately.]

Given the status is “First hearing prep needed”
And a first hearing has been set up
But they have not clicked “Mark first hearing prep as complete”
When the first hearing starts
Then automatically go to “First hearing outcome needed”

Adjourned for another first hearing: The outcome of the first hearing could be that they need a new first hearing.

Updating an upcoming first hearing to a future date, would you need to change state? [Maybe]

Before a trial, you can have different defendants having different first hearings at different stages.


What happens if the first hearing has been recorded for defendant 1 [PTPH prep needed]
But defendant 2 has not done the first hearing [First hearing prep needed OR first hearing pending]
What is the status? []


Case stautus
[ ] 

Defendant status
[ ]




## Scenario 2. First hearing outcome → PTPH (when the case goes to crown court)

When the outcome of the first hearing is that the case is being sent to crown court, the case needs a PTPH. 

At the moment, the system asks the caseworker to set up the PTPH date and venue right there as part of recording the first hearing outcome — and then immediately moves the case to "Prosecution team needed" and once that’s done it moves to “PTPH hearing preparation needed”.

This assumes the PTPH details is always known at the exact moment the first hearing outcome is recorded.

1. Is that assumption correct?
2. Might it be that PTPH is set up before or after?

## Scenario 3. First hearing outcome → trial (when the case stays in the magistrates court)

When the outcome of the first hearing is that the case is going to trial in the magistrates court, the case currently moves straight into "trial preparation needed." 

There is nothing in the system that prompts the caseworker to set up the trial hearing — no date, no venue, nothing.

1. Should the trial hearing be captured when recording the first hearing outcome?
2. Or should it be another time?

## Scenario 4. PTPH outcome → trial (when the case goes to trial from crown court)

When the outcome of a PTPH is that the case is going to trial, the same gap applies. 

The case moves into "trial preparation needed" with no prompt to set up the trial hearing.

1. Should the trial details be entered as part of recording of the PTPH outcome?
2. Or should it be another time?

## Scenario 5. Trial outcome → sentencing hearing

When a trial outcome is a guilty verdict, the case needs a sentencing hearing. 

Currently, the case moves into "sentencing hearing pending" with no hearing having been set up and no preparation stage at all.

1. Should the sentencing hearing be entered as part of recording the trial outcome?
2. Or should it be another time?

## What if the hearing is already set up?

There may be situations where a caseworker sets up a hearing early — before the system would normally prompt them to. For example, perhaps they know the PTPH date before they record the outcome of the first hearing.

I do not think that the system should block this. 

Users should always be able to add a hearing at any point. 

If a hearing is already in place when the case reaches a stage that requires a hearing, the system just accounts for that, perhaps by skipping a state or not blocking the progression of the case.

## An open question

One thing we do not yet know is who actually sets the hearing date in practice — is it the caseworker entering a date they have been given, or does it come from an external court system? This matters because if the date is not always available at preparation time, it may not be appropriate to require it before marking preparation as complete.

We need to speak to users to understand this before deciding whether the system should enforce the presence of a hearing as a hard requirement. If dates often come late or from external sources, a softer approach — a warning rather than a block — may be more appropriate.
