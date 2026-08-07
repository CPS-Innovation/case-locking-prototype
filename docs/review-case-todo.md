Not for Shiv, just reminders for Adam from the walkthrough with John.

- Selecting "anticipated issue" should conditionally reveal the optional reason box in the same way "evidence" does. It currently doesn't. Fix this.
- "Not assessed" shouldn't still be selectable as an option once an element has already been assessed as strong, moderate or weak. Come back to this.
- No redact option currently exists for photo, audio or video material. Consider adding if there's time.
- Audio annotation only captures a single start timestamp, not a range. Explore this another time.
- Double check the Marcus Web case's URN stays static and doesn't change each time the prototype is rebuilt, before research starts.
- On the combined "Material" review page (review-variant-2), each document section currently has its own `.app-document-area` full-bleed grey background, rather than one shared container wrapping the whole list. This means per-section CSS (like the toggle-all link's first-of-type padding and the last-of-type bottom padding) is duct-taped on rather than living in one place. Refactor so the full-bleed background/negative-margin trick lives on a single outer wrapper, with per-section divs only handling padding/spacing.
