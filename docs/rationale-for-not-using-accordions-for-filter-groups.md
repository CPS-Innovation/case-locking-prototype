Here's a quick breakdown of the rationale for avoiding accordions for the filter groups.

Just to say again: I totally acknowledge that scrollable areas should be avoided - I wouldn't normally use them of the downsides.

But as mentioned I think it’s the right trade-off to make.

While accordions would avoid the scrollable areas, they introduce their own set of problems:

- This is a repeat-use specialist tool. Users work with these filters for hours a day. Hiding options behind toggles means they'd have to open a section, scan the options, make a selection, then open the next section - over and over. At that frequency, the extra effort adds up quickly.
- There's a cognitive accessibility issue. With the current design, users can see the filter label (e.g. "Prosecutor") alongside the options (e.g. "Rachel Harvey") at a glance. That gives sighted users the context they need to quickly scan and understand the state of their filters. An accordion strips that away - you'd only see the category labels, losing the at-a-glance clarity. And you’d only get that once you open the accordion but that’s too late.
- The GOV.UK Design System accordion guidance (https://design-system.service.gov.uk/components/accordion/) reflects this too - accordions work best when users don't need to see multiple sections at once, which isn't the case here.
- The GOV.UK Design System details guidance (https://design-system.service.gov.uk/components/details/) reflects this too - “do not use the details component to hide information that the majority of your users will need.”
- Accordions also wouldn't solve the problem of having lots of checkboxes to navigate through. Once a section is open, you'd still need arrow keys or tabbing to move through them

On balance: accordions would negatively impact every user, every time they use the filters. The scrollable areas only impact Dragon users, and with the mitigations we've added (search box, keyboard-focusable container, arrow key navigation, etc), we’ve done a fair amount to mitigate any issues.