const prisma = require('../lib/prisma')
const { getCaseDetail } = require('../helpers/caseDetail')

// The interruption is an entry gate into the review journey (both the
// standard review flow and the review-variant-2 flow toggled via
// settings--review-variant.js), not a check performed on every review
// request. Acknowledgement is recorded per case in session data (see
// session-data-defaults.js) so normal navigation between review pages
// after Continue is not interrupted again, mirroring the checkSignedIn
// middleware's use of session state plus a preserved return URL.

// Only ever redirect "Go back to the case list" to a normal case-detail
// page for the *same* case - never to the review journey itself (which
// would just re-trigger the interruption) and never to another case.
function isSafeCaseUrl(url, caseId) {
  if (typeof url !== 'string' || !url.startsWith(`/cases/${caseId}`)) return false
  return !/^\/cases\/\d+\/review(-variant-2)?(\/|$|\?)/.test(url)
}

// Only ever let Continue proceed to a review URL for the *same* case -
// never an arbitrary or another case's URL (no open redirect).
function isSafeReviewUrl(url, caseId) {
  return typeof url === 'string' && new RegExp(`^/cases/${caseId}/review(-variant-2)?(/|$|\\?)`).test(url)
}

function refererPath(req) {
  const referer = req.get('Referer')
  if (!referer) return null
  try {
    return new URL(referer).pathname
  } catch (err) {
    return null
  }
}

// Shared definition of "inside the review journey" for this case: the
// review/review-variant-2 routes themselves, plus the interruption's own
// continue action (which needs to run - and set acknowledgement - without
// being immediately undone by resetReviewInterruptionOnCaseDetail below).
// Used both by the entry gate's route registration (routes.js) and by the
// reset middleware, so the two stay in sync as one definition of the
// review journey's boundary.
function isReviewJourneyPath(url, caseId) {
  return new RegExp(`^/cases/${caseId}/(review(-variant-2)?(/|$|\\?)|interruption(/|$|\\?))`).test(url)
}

// Acknowledgement represents the user's *current* entry into the review
// journey, not a permanent suppression for the rest of the browser
// session: once they leave review for an ordinary case-detail route (case
// overview, defendants, witnesses, activity, etc.), selecting "Review
// case" again should show the interruption again. This must not fire for
// review/review-variant-2/interruption requests themselves, otherwise
// acknowledgement would be cleared the instant it is set.
function resetReviewInterruptionOnCaseDetail(req, res, next) {
  const caseId = parseInt(req.params.caseId)
  if (isNaN(caseId)) return next()
  // req.path is relative to wherever this middleware is mounted (Express
  // strips the matched '/cases/:caseId*' prefix), so req.originalUrl is
  // used instead - the same reason reviewInterruptionGuard above stores
  // req.originalUrl rather than req.path as the requested review URL.
  if (isReviewJourneyPath(req.originalUrl, caseId)) return next()

  const acknowledgedCases = req.session.data.reviewInterruptionAcknowledged
  if (acknowledgedCases && acknowledgedCases[caseId]) {
    // New object rather than a mutation, for the same session-isolation
    // reason as elsewhere in this file (see account.js's shallow reset).
    const remaining = Object.assign({}, acknowledgedCases)
    delete remaining[caseId]
    req.session.data.reviewInterruptionAcknowledged = remaining
  }

  next()
}

async function reviewInterruptionGuard(req, res, next) {
  const caseId = parseInt(req.params.caseId)
  if (isNaN(caseId)) return next()

  const acknowledgedCases = req.session.data.reviewInterruptionAcknowledged || {}
  if (acknowledgedCases[caseId]) return next()

  const { _case } = await getCaseDetail(prisma, caseId)
  // Let the actual review route handle a missing case exactly as it does
  // today (no guard-specific 404 behaviour introduced here).
  if (!_case) return next()

  const pendingCases = req.session.data.reviewInterruptionPending || {}
  const pending = pendingCases[caseId] || {}

  // A direct/refreshed request to the interruption itself has the
  // interruption's own URL as its referrer, which is never a usable case
  // page - fall back to whatever case page was previously captured (if
  // any), rather than losing it.
  const referrerPath = refererPath(req)
  const backUrl = isSafeCaseUrl(referrerPath, caseId) ? referrerPath : (pending.backUrl || `/cases/${caseId}`)

  // Written as a brand new object rather than a mutation of the existing
  // one: sign-in (see account.js) resets session data with a shallow
  // Object.assign, so mutating an object in place here could otherwise
  // leak across other sessions that still point at the same reference.
  req.session.data.reviewInterruptionPending = Object.assign({}, pendingCases, {
    [caseId]: { requestedUrl: req.originalUrl, backUrl }
  })

  res.render('cases/interruption/index', {
    _case,
    backUrl,
    continueUrl: `/cases/${caseId}/interruption/continue`
  })
}

module.exports = {
  reviewInterruptionGuard,
  resetReviewInterruptionOnCaseDetail,
  isSafeCaseUrl,
  isSafeReviewUrl
}
