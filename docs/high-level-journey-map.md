
# High level journey map

0. No state

Actions:
- Create a case (add manually)
- Receive a case (by police)

1. "Ready for triage"

Actions:
- Accept case
- Reject case (goes back to police for them to have a chance to sort out why it was rejected)

2. "Ready to assign"

Actions:
- Assign prosecutor

3. "Ready to review"

Actions:
- Review and charge
- Review and request further info (sent back after further info added and back to "ready for review")
- Review and decide no further action (not charging/finalising)

4. "Waiting for police to charge" 

Actions:
- Chase offline????????
- Mark as charges received (MG4 doc received and first hearing details provided)

5. "Authorised charges received" (MG4 is the doc with those charges, police has charged the defendant with X and Y)

Actions:
- Add the first hearing date/details
- Create bundles e.g. disclosure and initial disclosure prosecution case
- Dispatch bundles to court, defence if known

6. “Waiting for first hearing”

Do nothing until day of first hearing where state changes to:

During the hearing or just after advocate records outcome of hearing in their system (PROSApp) and that creates a new PDF doc that appears in CMS. And then OD will do the actual recording in CMS

7. “Waiting for outcome of first hearing”

Actions: 
- Record outcome of hearing - defendant pleads guilty and goes for sentencing
- Record outcome of hearing - sent to crown court (complex journey)
- Record outcome of hearing - goes to trial in mags court

GBH (not guilty) - tried in crown court
Affray (plead guilty) - can be split as can be dealt with in mags

8. "Trial preparation"

Actions:
- Prepare for trial
- warn witnesses
- make applications
- Review further evidence if applicable
- Book an advocate for who will present in court
- Dispatch the material/bundle to advocate so they know what they’re presenting (trial bundle) 

9. "Waiting for outcome of trial"

Actions:
- Mark as pleads guilty - goes for sentencing (which means add a sentencing hearing)
- Found guilty - goes for sentencing (which means add a sentencing hearing)
- Found not guilty - finalised
- Provide victim personal statement to the court if you have a victim
- Provide up to date previous convictions to the defendant
- Send instructions to the advocate

10. "Waiting for sentencing hearing"

11. "Waiting for outcome of sentencing hearing"

Actions:
- Record the sentence
- Finalise the case

12. "Case finalised"

Nothing to do.



=====

When you record the outcome of the first hearing, depending on the case it needs to go to crown court.

When you send to crown court, you will as part of that set up a pre-trial prep hearing within crown court.

When sent to crown court the assigned prosecutor is removed.


When just mags: First hearing outcome needed > Trial preparation needed

When it goes to crown: First hearing outcome needed > PTPH needed > Waiting for PTPH hearing > PTPH hearing outcome needed > Trial preparation needed


1. Prosecution not set up => Assign prosecutor / Assign paralegal officer

  * 2. Pre-trial preparation hearing (PTPH) needed => Bundle and stuff, legal review, draft indictment [Mark prep done]
  
  * 3. Waiting for PTPH hearing
  
  * 4. PTPH hearing outcome needed => Record PTPH hearing outcome

If as part of (4) it goes to trial:

- Add directions (Serve case)

Note: are directions a status ?????

9. Trial preparation needed => Draft and serve any applications

=====

As a user
I need to keep track of when the police or defence or someone external sends information to me
So that I can respond in a timely fasion

Comms: generic task "look at your email"

Potential solutions:
- Notifications (UI/Email)
- Case list filter "has received blah"

=====

Advocates (booking one)
Action plans tab
Hearings tab
Directions tab (done)
