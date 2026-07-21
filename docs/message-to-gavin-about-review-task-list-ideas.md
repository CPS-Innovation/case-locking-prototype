Hi Gavin,

I wanted to respond to your two ideas about the review task list.

## Idea #1: help users open up material in separate tabs/windows

Users can do this themselves by using standard, native browser behaviour that’s been around for a very long time:

- ctrl-click, cmd-click
- middle-click with mouse or trackpad
- right-click with mouse or trackpad (most common) → “open in new tab”

It might be that some users don’t know how to do this straight away.

But given are users are specialist, and using a repeat-use product, we can do other things like:

- When the lawyer first performs a review, we give them instructions
- We provide training (this should be a last resort)

Crucially, the proposed solutions have many issues:

### Solution #1: Just make each link open in a new tab

Opening links in a new tab/window has many downsides:

- Users may not realise what’s happened
- It breaks the browser back button
- It’s disruptive
- It’s difficult to get back to the original tab
- It clutters the browser tab bar
- It makes the tabs harder to use
- It slows the computer down

I’ve elaborated here:

https://adam-silver-2.kit.com/posts/why-i-avoid-opening-links-in-new-tabs-and-the-real-underlying-problem-you-need-to-solve

Ultimately, it breaks how links work by default, and takes control away from users - they can't open the link in the current tab, even if they wanted to.

### Solution #2: Give users a button to open them all at once

- This makes the above problems worse
- We don't know that users want to open everything at once
- We don't know that users want to open the pages in tabs or windows; and we can't easily control that - it's a user setting
- The more we open automatically, the more users have to wade through the tabs.

Also, browsers may block this thinking it's a pop up - I’m not sure about this by any means, we’d have to investigate it.

I think with everything we have to work on, I think this should be parked for now at least and not block the research going ahead.

### Solution #3: For each piece of material offer an additional link to open in new tab

This is better than the previous two options because it gives users control to open individual links in new tabs if they wish.

But there are several issues - for example:

- Users have to choose between two links
- Not all tasks will have the option of being opened in a new tab, so it’s inconsistent and potentially confusing
- For keyboard users there are twice the number of tab stops
- For screen readers, there are twice the number of links in the links list
- The tap target is now much smaller - the task list row is clickable by default but that would be lost

Ultimately, this breaks the standard task list pattern:

https://design-system.service.gov.uk/patterns/complete-multiple-tasks/

We can do that, but it’s crucial that we test the standard pattern and see if it’s actually a problem and if so, to what extent. 

And then consider the trade offs more deeply.

## Idea #2: Show "5 notes" next to each piece of material in the task list

I agree that users will likely need to see all their annotations and the rest of their review in one place.

We have addressed this using a dedicated, standard check answers page to do that.

The proposed solution has multiple issues:

- It’s not just about adding a line for “5 notes”. We would need to consider adding lines for disclosure, evidence, redaction, info request notes too.
- It will make the screen significantly busier, harder to scan and longer to scroll, which adds cognitive load and slows users down etc
- It only tells users that the material has notes, not what those notes are. So it wouldn’t actually allow users to see all their annotations in one place
- It breaks the principle of a page doing one thing - the task list is to help them see what they need to do, and their progress at a high level. The check answers page lets them see everything in one place. Two pages, two separate roles.

We also don’t know that users need to see "5 notes" next to each piece of material on _this_ page.

Given we already have a standard way for users to see all their annotations, let’s test that and see if users struggle and if so, to what extent. Then go from there.
