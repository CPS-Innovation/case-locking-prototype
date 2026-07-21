Hi Gavin,

I wanted to respond to your two ideas about the review task list.

## Idea one: help users open up material in separate tabs/windows

I agree that users will likely want to open up material in separate tabs/windows, but I’m worried about the solutions.

### Solution 1: Just make each link open in a new tab

Opening links in a new tab/window has a bunch of downsides:

- Users may not realise what’s happened
- It breaks the back button
- It’s disruptive
- It’s difficult to get back to the original tab
- It clutters the browser tab bar
- It makes the tabs harder to use
- It slows the computer down

I’ve elaborated on these issues here:

https://adam-silver-2.kit.com/posts/why-i-avoid-opening-links-in-new-tabs-and-the-real-underlying-problem-you-need-to-solve

Ultimately, it breaks convention and takes control away from users - they can't do the default thing of opening it in the current tab, even if they wanted to.

### Solution 2: Give users a button to open them all at once

- This makes the above problems worse
- We don't know that users want to open everything at once
- We don't know that users want to open the pages in tabs or windows; and we can't easily control that - it's a user setting
- The more we open automatically, the more users have to wade through the tabs.

Also, I'm not sure it's technically possible - browsers may block this thinking it's a pop up. 

We’d have to investigate, but we have lots of other things to do, and I don’t think this should block research going ahead.

### Solution 3: For each piece of material offer an additional link to open in new tab

This is better in that it gives users control to open individual links in new tabs.

But there are several downsides such as:

- Users have to choose between two links
- Not all tasks will have the option of being opened in a new tab, so it’s inconsistent and potentially confusing
- For keyboard users there are twice the number of tab stops
- For screen readers, there are twice the number of links in the links list
- The tap target is now much smaller - the task list row is clickable by default but that would be lost

Ultimately, this breaks standard, tried and tested patterns.

We can do that, but it’s crucial that we test the standard pattern and see if it’s actually a problem and if so, to what extent. And then consider the trade offs deeply.

## Idea two: Show "5 notes" next to each piece of material in the task list

I agree that users will likely need to see all their annotations and the rest of their review in one place.

We have designed for this using a dedicated, standard check answers page to do that.

The proposed solution also has multiple issues:

- It’s not just about adding a line for “5 notes”. We would need to consider adding lines for disclosure, evidence, redaction, info request notes too.
- It will make the screen significantly busier, harder to scan and longer to scroll, which adds cognitive load and slows users down etc
- It only tells users that the material has notes, not what those notes are. So it wouldn’t actually allow users to see all their annotations in one place
- It breaks the principle of a page doing one thing - the task list is to help them see what they need to do, and their progress at a high level. The check answers page lets them see everything in one place. Two pages, two separate roles.

We also don’t know that users need to see the line.

Given we already have a standard way for users to see all their annotations, let’s test that and see if users struggle and if so, to what extent. Then go from there.

Standard patterns:

- https://design-system.service.gov.uk/patterns/complete-multiple-tasks/
- https://design-system.service.gov.uk/patterns/check-answers/