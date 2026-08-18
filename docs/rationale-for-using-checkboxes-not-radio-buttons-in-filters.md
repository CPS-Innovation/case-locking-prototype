# Rationale for using checkboxes over radio buttons in filters

Regarding the point about checkboxes versus radio buttons.

I did provide rationale in the meeting but let me share it here for everyone to see:

First thing to say is that I get the concern: that some checkbox groups feel redundant. For example, "DGA dispute outcome" has only two options (waiting outcome / outcome recorded), and selecting both is equivalent to selecting neither.

But I think checkboxes are still the right choice in this context.

The filters work on a specific logical model: selections within a category are OR — show items that match option A or option B. Selections across categories are AND — show items that match the category 1 filter and the category 2 filter.

Checkboxes map directly to OR logic. You're building an inclusion set within a category, and any item matching any checked option is included. That's exactly what users need when filtering — the ability to say "show me cases that are waiting or recorded".

And remember selecting those filters the full list of cases by those that have DGA outcomes involved effectively filtering all those that don't. So there's a practical example of selecting both.

Not selecting any option in a category means "show everything in this category" — which is the natural default. That's an important part of the model too: users shouldn't have to actively opt in to seeing all items.

Radio buttons imply mutual exclusivity enforced by the system — pick one, and the others are ruled out. It would prevent users from ever seeing results that match multiple values within a category. It would also be inconsistent with every other category, which can have many options selected at once.

Radio buttons also can't be deselected once chosen, so you'd need an explicit "show all" or "none" option in every category. That adds noise and is less intuitive than simply having nothing selected.

But even more importantly is that the two-option case is simply what OR logic looks like when a category is exhaustive: selecting both options includes everything in that category, which is the same result as selecting neither. Which is also the same as selecting all checkboxes within another filter that has more than two options. It’s not so much a flaw — it's the intended outcome of the underlying logic. If a user does select both, they'll immediately see the same results as if they'd selected nothing, which is self-correcting. No data is hidden, no error occurs, and no user gets stuck.

In practice I wouldn’t expect users will do that though.

We could theoretically use radio buttons only for two-option categories, but then users would face two different interaction models within the same filter panel. That inconsistency would be harder to learn than the harmless edge case we're trying to avoid.

Categories with two options may not stay as two options. Designing for two now doesn't mean there will only ever be two. Checkboxes continue to work if/as we scale up.

Hope this helps.
