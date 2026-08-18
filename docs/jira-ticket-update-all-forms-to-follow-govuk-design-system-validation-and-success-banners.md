# Update all forms to follow GOV.UK Design System guidance for validation errors and success banners

## Summary

Many of our forms do not currently follow the GOV.UK Design System guidance for displaying validation errors or success banners. This ticket covers updating every form flow in the service to follow the standard patterns described below.

---

## 1. Form validation

Reference: https://design-system.service.gov.uk/patterns/validation/

### When to validate

- Validate when the user submits the form (clicks "Continue") — not as they type or leave individual fields.
- Server-side validation is mandatory, even if client-side validation is also used.
- Disable HTML5 validation by adding `novalidate` to the `<form>` element. Do not use the `required` attribute on inputs.

### What must happen when there are errors

When a form submission has validation errors, 4 things must happen:

1. **Prefix the page title with "Error: "** — so that screen readers announce the error as soon as possible. For example: `<title>Error: What is your name? - Service name - GOV.UK</title>`

2. **Show an error summary at the top of the page** — this must appear at the top of the main content area (below any back link, above the `<h1>`). Keyboard focus must move to the error summary automatically when the page loads.

3. **Each error in the summary must link to the field that has the error** — the link target depends on the input type:

   - Text inputs, textareas, selects: link to the input's `id`
   - Radios and checkboxes: link to the `id` of the **first** item in the group
   - Date inputs: link to the first field that has an error, or the day field if the whole date is missing

4. **Each field with an error must show an inline error message** — the message text must match the corresponding error in the summary. The field's containing group must have a red left border.

### Preserving user input

When redisplaying the form with errors, the user's previously entered values must be preserved — do not clear the fields.

### Error summary HTML

Reference: https://design-system.service.gov.uk/components/error-summary/

Always show an error summary when there is a validation error, even if there is only one.

```html
<div class="govuk-error-summary" data-module="govuk-error-summary">
  <div role="alert">
    <h2 class="govuk-error-summary__title">
      There’s a problem
    </h2>
    <div class="govuk-error-summary__body">
      <ul class="govuk-list govuk-error-summary__list">
        <li>
          <a href="#date-of-birth-day">Date of birth must include a year</a>
        </li>
        <li>
          <a href="#postcode">Enter a postcode, like AA1 1AA</a>
        </li>
      </ul>
    </div>
  </div>
</div>
```

The `data-module="govuk-error-summary"` attribute triggers the GOV.UK Frontend JavaScript to focus the error summary on page load. You may need custom JS if using OutSystems

### Inline error message HTML

Reference: https://design-system.service.gov.uk/components/error-message/

Each field with an error must display an error message. The message includes a visually hidden "Error:" prefix for screen readers.

```html
<p id="postcode-error" class="govuk-error-message">
  <span class="govuk-visually-hidden">Error:</span> Enter a postcode, like AA1 1AA
</p>
```

The containing form group must have the `govuk-form-group--error` class, which adds the red left border.

---

## 2. Success banners

Reference: https://design-system.service.gov.uk/components/notification-banner/

When the user completes a form flow, they are redirected to another page with a green success banner at the top.

### Current problems

Our success banners currently:
- Appear as an overlay/toast that auto-dismisses after a few seconds
- Have a close button in the top right corner

Both of these are non-standard. The GOV.UK Design System success banner must:
- Appear inline at the top of the page content (not as an overlay)
- Be focused automatically when the page loads (so screen readers announce it)
- Stay visible until the user navigates to another page or refreshes
- **Not** auto-dismiss or fade out
- **Not** have a close button

### Success banner HTML

```html
<div class="govuk-notification-banner govuk-notification-banner--success"
     role="alert"
     aria-labelledby="govuk-notification-banner-title"
     data-module="govuk-notification-banner">
  <div class="govuk-notification-banner__header">
    <h2 class="govuk-notification-banner__title" id="govuk-notification-banner-title">
      Success
    </h2>
  </div>
  <div class="govuk-notification-banner__content">
    <p class="govuk-notification-banner__heading">
      Prosecutor assigned
    </p>
  </div>
</div>
```

Key attributes:
- `role="alert"` — tells screen readers to announce the content immediately
- `data-module="govuk-notification-banner"` — triggers GOV.UK Frontend JavaScript to move keyboard focus to the banner on page load
- `govuk-notification-banner--success` — applies the green styling

### How it should work

1. User completes a form flow and submits
2. Page redirects the user to the destination page
3. The success banner appears at the top of the page content
4. Focus moves to the banner automatically
5. If the user refreshes or navigates away, the banner is no longer shown
