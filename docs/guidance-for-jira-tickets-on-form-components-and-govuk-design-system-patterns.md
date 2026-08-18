# Common guidance for JIRA tickets

## Form components

Use the exact HTML, CSS and JavaScript for each component:

https://design-system.service.gov.uk/components/button/
https://design-system.service.gov.uk/components/character-count/
https://design-system.service.gov.uk/components/checkboxes/
https://design-system.service.gov.uk/components/date-input/
https://design-system.service.gov.uk/components/file-upload/
https://design-system.service.gov.uk/components/password-input/
https://design-system.service.gov.uk/components/radios/
https://design-system.service.gov.uk/components/select/
https://design-system.service.gov.uk/components/text-input/
https://design-system.service.gov.uk/components/textarea/

## Making labels and legends into h1 headings

Most forms will show one thing per page.

This means you will need to make labels and legends into h1 headings.

Follow this guidance:

https://design-system.service.gov.uk/get-started/labels-legends-headings/

## Check answers page and summary lists

Most forms will have a check answers page. The summary lists will have change links with visually hidden text.

The visually hidden text should be taken from the prototype or added to the ticket.

References:

- https://design-system.service.gov.uk/patterns/check-answers/
- https://design-system.service.gov.uk/components/summary-list/

## Form validation

When there are errors:

- The `<title>` element will be prefixed with "Error: "
- The error summary will appear at the top of the main section and be focused automatically as soon as it’s shown.
- Each error in the summary will link to the input. It’s different depending on the input type and error.
- Each field will be in the error state and show the same error message

References:

- https://design-system.service.gov.uk/patterns/validation/ 
- https://design-system.service.gov.uk/components/error-summary/
- https://design-system.service.gov.uk/components/error-message/

## Success banners

When the user completes a flow, they should be directed to another page with a green success banner appearing at the top.

When the user arrives on that page, the success banner should be focused.

If the user refreshes the page or navigates away, the success banner should disappear.

References:

https://design-system.service.gov.uk/components/notification-banner/

## Do not add any additional HTML attributes or elements to standard components

This is because the components inside the Design System have been extensively accessibility and usability tested.

## Something about focus management