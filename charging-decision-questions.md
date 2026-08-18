# Questions on the "Making a charging decision" spec

Before we start building this, here are some questions and gaps to talk through.

## Confirming police charges

1. Confirming police charges by default (no separate confirmation step when the charge sheet matches and no new evidence arrived) is the biggest change from how things work now. Let's have a dedicated conversation about this before any state machine work starts.

## Data model gaps

2. "Action plans" (= information requests) and disclosure material tagged to a specific charge - right now nothing in the prototype links evidence, disclosure, or information requests to a specific charge. They're only linked to the case as a whole. Is tagging material to a charge a prerequisite for this feature, or can charging decisions ship first and tagging come later?
3. Charges already have a status field with values "Under review", "Charged", "Proceeded", "Discontinued", "Amended". Should making a charging decision update this? For example, does "Reject charge" move a charge to "Discontinued"?
4. Defendant/case status: today there are only two outcomes wired up ("Charge" moves the defendant to "Charges pending", "Do not charge" moves them to "No further action"). What should "Issue caution", "Defer decision", "Reject charge", and "Take charge into consideration" actually do to defendant/charge status? Is this something you have half-formed ideas about, or a blank page?

## Conditions for showing options

5. "Issue caution" - what determines whether it's appropriate for the charge? Is that based on charge type/offence, something else, or not yet defined?
6. "Defer decision" - shown only if a information request (action plan) exists for the charge, or always available on the assumption enquiries happen through another route? These lead to different UI.

## Deriving the overall decision

7. "The overall answer comes out of the separate answers" - what's the actual rule? For example, is it "charge if any charge is accepted, otherwise do not charge"? What happens when charges are split across multiple outcomes (some accepted, some rejected, some deferred) - does that change what's shown on the final check-and-submit page, or notified to police?

## Scenarios and wording

8. DWP/HMRC as a referring agency doesn't exist anywhere in the prototype today (no field, no data). Is scenario 2 realistic for this iteration, or is it further out?
9. Scenario 3 (police already charged, all accepted) - the prototype already has a distinct "case arrives pre-charged, no CPS decision needed" path with its own message on the final check-and-submit page. Is that the same situation you're describing, or something new?
10. "Further scenarios to follow" - any sense of timing/shape, since it affects whether the check-and-submit wording should be built as hardcoded conditionals (fine for 2-3 scenarios) or something more structured?

## Duplicate charging-decision flows

11. There are currently three separate places a lawyer can make a charging decision: from the case review task list, from a defendant's own page, and inline in review submission. Did you know about all three, and should the redesign consolidate them into one, or is having multiple entry points intentional?

## Flow placement

12. You floated moving charging decision out of the task list into its own flow step (task list, check answers, charging decision, check answers). We're planning to keep it as a task for the first iteration - do you want to revisit that placement as a separate follow-up conversation, or is "keep as a task" settled for now?
