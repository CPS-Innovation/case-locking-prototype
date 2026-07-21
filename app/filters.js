//
// For guidance on how to create filters see:
// https://prototype-kit.service.gov.uk/docs/filters
//

const govukPrototypeKit = require('govuk-prototype-kit')
const addFilter = govukPrototypeKit.views.addFilter
const { DateTime } = require('luxon')
const statuses = require('./data/case-statuses')
const { getDocumentPhotoUrls } = require('./helpers/documentContent')

// Add your filters here
addFilter('documentPhotoUrl', (documentName) => {
  return getDocumentPhotoUrls({ name: documentName })[0]
})

addFilter('priorityTagClass', (status) => {
  switch (status) {
    case 'High priority':
      return 'govuk-tag--red'
    case 'Medium priority':
      return 'govuk-tag--yellow'
    case 'Low priority':
      return 'govuk-tag--green'
  }
})

addFilter('severityTagClass', (severity) => {
  switch (severity) {
    case 'Critically overdue':
      return 'govuk-tag--red'
    case 'Overdue':
      return 'govuk-tag--orange'
    case 'Due soon':
      return 'govuk-tag--yellow'
    case 'Not due yet':
      return 'govuk-tag--blue'
    default:
      return ''
  }
})

addFilter('strengthTagClass', (strength) => {
  switch (strength) {
    case 'Strong':
      return 'govuk-tag--green'
    case 'Moderate':
      return 'govuk-tag--yellow'
    case 'Weak':
      return 'govuk-tag--red'
    default:
      return 'govuk-tag--grey'
  }
})

addFilter('directionStatusTagClass', (status) => {
  switch (status) {
    case 'Overdue':
      return 'govuk-tag--red'
    case 'Due today':
      return 'govuk-tag--orange'
    default:
      return ''
  }
})

addFilter('isoDateString', (date) => {
  if (!date) return ''
  const d = new Date(date)
  return isNaN(d.getTime()) ? '' : d.toISOString()
})

addFilter('formatNumber', (number) => {
  return Number(number).toLocaleString('en-GB')
})

addFilter('daysUntil', (date) => {
  const now = DateTime.now().startOf('day')
  const targetDate = DateTime.fromJSDate(new Date(date)).startOf('day')
  const diffDays = Math.ceil(targetDate.diff(now, 'days').days)

  if (diffDays < 0) {
    return 'overdue'
  } else if (diffDays === 0) {
    return 'today'
  } else if (diffDays === 1) {
    return 'tomorrow'
  }
  return `${diffDays} days`
})

addFilter('timeLimitStatus', (date) => {
  const now = DateTime.now().startOf('day')
  const targetDate = DateTime.fromJSDate(new Date(date)).startOf('day')
  const diffDays = Math.ceil(targetDate.diff(now, 'days').days)

  if (diffDays < 0) {
    return 'expired'
  } else if (diffDays === 0) {
    return 'today'
  } else if (diffDays === 1) {
    return 'tomorrow'
  }
  return `${diffDays} days`
})

addFilter('paceClockStatus', (date) => {
  const now = DateTime.now()
  const paceClock = DateTime.fromJSDate(new Date(date))
  const hoursRemaining = paceClock.diff(now, 'hours').hours

  if (hoursRemaining < 0) {
    return 'expired'
  }
  if (hoursRemaining < 1) {
    return 'ends in less than 1 hour'
  }
  if (hoursRemaining < 2) {
    return 'ends in less than 2 hours'
  }
  if (hoursRemaining < 3) {
    return 'ends in less than 3 hours'
  }
  return 'ends in more than 3 hours'
})

addFilter('slugify', (text) => {
  if (!text) return ''
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, '') // Trim - from end of text
})

addFilter('completionStatusTagClass', (status) => {
  switch (status) {
    case 'Completed':
      return 'govuk-tag--green'
    case 'In progress':
      return 'govuk-tag--yellow'
    default:
      return ''
  }
})

addFilter('caseStatusTagClass', (status) => {
  switch (status) {
    case 'Multiple statuses':
      return 'govuk-tag--yellow'
    case statuses.NOT_CHARGED:
      return 'govuk-tag--blue'
    case statuses.CHARGES_PENDING:
      return 'govuk-tag--yellow'
    case statuses.CHARGED:
      return 'govuk-tag--green'
    case statuses.NO_FURTHER_ACTION:
      return 'govuk-tag--grey'
    case statuses.NOT_GUILTY:
      return 'govuk-tag--grey'
    case statuses.SENTENCED:
      return 'govuk-tag--grey'
    default:
      return ''
  }
})

addFilter('hearingStatusTagClass', (status) => {
  switch (status) {
    case 'Hearing preparation needed': return 'govuk-tag--blue'
    case 'Hearing pending':            return 'govuk-tag--yellow'
    case 'Hearing outcome needed':     return 'govuk-tag--orange'
    case 'Hearing complete':           return 'govuk-tag--green'
    default:                           return ''
  }
})

addFilter('informationRequestStatusTagClass', (status) => {
  switch (status) {
    case 'Received':
      return 'govuk-tag--green'
    case 'Cancelled':
      return 'govuk-tag--grey'
    case 'Pending':
      return 'govuk-tag--yellow'
    default:
      return 'govuk-tag--grey'
  }
})

addFilter('pluralize', (count, singular, plural) => {
  return count === 1 ? singular : plural || singular + 's'
})
