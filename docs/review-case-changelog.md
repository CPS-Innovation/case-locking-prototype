# Review a case: what's changed (24 to 31 July)

A summary of the product changes made to the review flow prototype over the last 10 days, for anyone catching up after watching the walkthrough video in the design channel.

Here’s a few things we've changed over the last 10 days or so:

## Annotating documents feels faster and fixes means the user doesn’t have to scroll back down to where they were in a long doc

Saving, editing or converting a note, piece of evidence or anticipated issue used to reload the whole page. It now saves over AJAX (without a page refresh) and just swaps in the updated sidebar (and document text, where relevant), so your scroll position and focus stay put. Redacting text works the same way now too.

## Consistent naming: "anticipated issue"

Early on this was called "disclosure" and used purple. It's now "anticipated issue" everywhere - in the annotation menu, sidebar, case overview, check answers page, and the underlying code - and shown in red, alongside evidence.

## Comments on evidence and issues

The optional box for explaining why you've linked something to an element is back, and we renamed it from "Reason"/"Lawyer note" to "Comment"/"Lawyer’s comment", which reads more naturally.

## Redacting text

You can now delete a redaction from the check answers page, the same way you can delete evidence or an anticipated issue - with a confirmation step first.

## Element strength assessment

- Simplified how linked evidence displays - dropped the repeated offence/element labels and bullet list in favour of a plain "Comment" label and text
- Strength assessment and information request pages now group everything by material, with a heading per document, rather than one long mixed list

## Case overview

- Witnesses now show up under each element, alongside its evidence and anticipated issues, so you can see who's linked to what in one place
- Added an activity log entry for "Authorised charges received", matching the existing "Case added" entry
- Added breadcrumbs (URN > Material > [name]) on document, photo, audio and video pages when you get there via Materials, replacing the plain back link

## Materials tab

The Materials tab now stays hidden until a case has actually been reviewed, matching the same rule already used for the Hearings tab. (Did this mostly to simplify the research process as to not distract participants from the review)

## Always-visible annotation link

Previously, the "add evidence, anticipated issue or note" link only showed on documents with nothing tagged yet, and disappeared once you'd added something. It's now always there, directly under the document heading, and reworded to spell out the three things it leads to rather than "Add annotation".

## Other things

- Selected text excerpts in annotation cards now expand/collapse instead of being truncated
- Reworked the check and submit page copy to explicitly describe the IDPC and what goes into it
- Moved the "Simulate..." buttons out of a floating overlay and into the page footer, so they stop sitting over page content during testing
- Added an offences summary to the case overview
