# Case status naming convention

## Principles

- Clarity > brevity — "Ready to make charging decision" or "Needs charging decision" is better than "Charging decision" (see explanation below)
- Status names should not sound like actions — "Make charging decision" as a status sounds like the action users take (or have taken) "Make charging decision"
- Make it clear if a user can/should do something versus waiting for something
- Where possible, the end of the status should relate to the primary action

| Status | Action |
|---|---|
| Triage needed | Accept / Reject |
| Prosecution team needed | Assign prosecution team |
| Charging decision needed | Make charging decision |
| First hearing preparation needed | Add first hearing |
| First hearing outcome needed | Record outcome of first hearing |
| Trial preparation needed | Mark trial preparation as complete |
| Trial outcome needed | Record trial outcome |
| Waiting for resubmission | — |
| Waiting for police to charge | — |
| Waiting for first hearing | — |

## Noun phrases are ambiguous

"Charging decision" doesn't tell you whether:

- The work to make a charging decision is yet to be started
- You are waiting for something in order to be able to make a charging decision
- The work to make a charging decision is in progress
- A charging decision has been made

When a user has to work out what a label means, cognitive load goes up. 

Shorter labels only reduce cognitive load when the meaning is immediately clear.

## “‘Ready to make charging decision’ is still ambiguous”

It depends on whether some of the steps to make a charing decision have already been done.

But this is still a problem with a noun-phrase like "Charging decision" because it doesn't tell you whether the decision is pending, in progress, or complete.

To fix this problem we need more granular statuses such as:

- Ready to make charging decision
- Making charging decision OR Charging decision in progress
- Charging decision made

## Recommendation

Use "Ready to..." (or similar) for statuses where a user action is required and has not been started. 
Use "Waiting for..." (or similar) where the case is blocked on an external dependency.
