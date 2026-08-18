# Units versus courts

When a case comes in it’s always assigned to a mags unit.

Dorset mags
Hampshire mags
Wiltshire mags

During triage, CPS (OD?) check the charges, will decide if it needs to move to a different unit (team). For example:

- Wessex RASSO
- Wessex CCU
- Wessex Crown Court (indictable will definitely go here, for example)

## Main scenario as cucumber

Given the case is in the mags unit e.g. Dorset mags
And it’s being sent for trial in crown court e.g. Wessex Crown Court (the court)
Then CPS need to transfer the unit from the mags unit to Wessex RASSO, Wessex CCU or Wessex Crown Court (the unit)
And set up a PTPH in the crown court

Note: Only ask the user if they want to change unit if it’s in mags and going to crown court.

## Do we need to change unit at any time?

Yes