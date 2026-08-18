# Meeting response: filter accessibility points

Points raised in the meeting and my responses. Work through each one.

---

## 1. “Why does focus move to the top of the page?”

This is standard web page behaviour when you click a link or submit a form.

I wouldn’t want to break convention without being sure that it’s a better experience.

In this case, keyboard users will have immediate access to the skip links (a standard approach in gov services) that allow the user to go where they like. 

This is important because we don't know where they want to go. They might want to:

- search
- sort
- add or remove filters as a result of understanding the results (perhaps just by the count)
- perform bulk actions
- clear all filters
- browse the list

Moving focus to an arbitrary location — the results heading, the first result, the h1 — assumes we know what they want to do next, and we don't. Sending focus to the top of the page gives users a standard, predictable starting point and lets them decide where to go.

The skip links at the top of the page help here: a keyboard user can go straight to the filters, the search, or the results without having to tab through everything.

This is an implementation problem - because the skip links are missing.

## 2. “Add visually hidden text next to the item count”

The suggestion was to add visually hidden text alongside the result count — for example:

<h1>Tasks (89 <span class="govuk-visually-hidden"> results </span>)</h1>

"Results" is just a more ambiguous version of "Tasks" so reall content wise we’d want to do this:

<h1>Tasks (89 <span class="govuk-visually-hidden"> tasks </span>)</h1>

The problem is that the label already precedes the number: "Tasks (89)". Screen readers would hear "Tasks (89) tasks".

You could replace “tasks” with “results” with another word to avoid the repetition, but it’s not adding anything.

## 3. “Making users scroll up to the top of the filters to submit is long winded”

If a user is partway down a long filter, having to navigate all the way back up to click ‘Apply’ is painful. 

But there's no great solution to this that I’m aware of.

Placing a button at the bottom only works if there are one or two categories. With more, many situations still leave you in the middle with no nearby button. The filters should be ordered by most used, meaning the least used filter is at the bottom.

You could placing buttons between every filter group - but then it looks like each button applies only the filters above it, not all of them. That's misleading and could cause users to submit multiple times when they don’t need to.

It adds cognitive load as well, and means more scrolling.

One mitigation is implicit submission — pressing Enter anywhere inside the form submits it without needing to reach the button.

We could consider sticky positioning of the submit button, that helps users with a pointing device, but leaves keyboard users wanting.

## 4. “Copy Amazon and submit instantly”

Amazon has many usability and accessibility pitfalls.

While I get the instinct to submit immediately there are problems with it:

(1) It breaks convention - checkboxes don’t submit when you tick them

(2) If results update the moment a user clicks a checkbox, you've removed the ability to compose a set of filters before seeing the outcome. Katie Sherwin describes this well with a restaurant analogy:

> Think about how you might order appetizers at a restaurant. Say you want to order three appetizers for the table, but as soon as you name the first one, the waiter snatches the menu out of your hands and walks back to the kitchen to get the chefs started on cooking that dish. Instead, a good waiter understands that you're still in the process of ordering and knows to give you more time before taking away the menu. A good waiter allows you time to make a batch decision, even if that might slightly delay the delivery of the first item ordered.

(3) This raises the question of where do you focus. Do you keep focus on the checkbox? How does the user move to the results or somewhere else?

Or you move focus to the top of the page and let users decide (good) but that's painful when they wanted to select multiple filters.

(4) Additionally:

- Screen reader users get a full page announcement between every selection — three checkboxes means three rounds of page announcements before they can make sense of the results
- Repeated page reloads for power users who filter throughout the day would be noticeably slow and disruptive

So we’re avoiding all those issues and allowing users to decide what filters to apply and submit.

## 5. “You have to use arrows to navigate the checkboxes which breaks convention”

I agree with this concern.

I hate breaking convention.

But without it keyboard users have to tab many times to get beyond the control.

This feels like the right trade off to make.

So we’ve copied the radio button convention which is standard within composite controls. 

## 6. “Add hint text to tell users how to operate the checkboxes with arrows”

We want to avoid having instructions sprinkled throughout the interface.

We could do that, but I’d like to first see real users struggling and to find out what extent.

Adding instructions to a page telling users how to operate an interface is a design fail, I’d like to understand before doing that.

You never know, it might not be a problem or it might be a problem that users overcome quite easily.

To soften the potential issue:

We are following radio button conventions (arrow keys cycle within the group, Tab moves to the next control).

And composite controls more broadly use arrow-keys so is often expected or tried if the tab key doesn't work in the way users expect. 

## 7. “Use a separate H2 heading for the number of items in the results”

I put the result count in the TITLE and h1 heading as a result of a DAC audit.

If you put it in the h2 or somewhere else on the page, it requires using traversing the page to find it.

They'd have to move past the page title, the navigation, the search, and potentially the filters before reaching the result count. 

That's long winded.

Using the page title and the h1 heading for the result count means it's the first thing announced when the page loads or refreshes. Screen readers read the title on load and the h1 is at the top of the main content — there's nothing more prominent. 

## 8. “Tabbing into a checkbox for the first time doesn't read the legend”

This is a bug.

Let’s investigate.

## 9. “Put the number at the start of the h1 heading”

"Fruits 89" is front-loaded: you hear the category first, then the count. That's the natural reading order and it matches how sighted users scan the panel.

It also handles edge cases cleanly:

- "Fruits 0" works without any conditional logic
- No pluralisation needed — "89 results" vs "1 result" vs "0 results" is not a problem we have to solve
- The label provides the context; the number provides the count; the combination is self-explanatory