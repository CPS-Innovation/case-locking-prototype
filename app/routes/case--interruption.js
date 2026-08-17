const { isSafeReviewUrl } = require('../middleware/reviewInterruptionGuard')

// The interruption itself is rendered directly by reviewInterruptionGuard
// (as an entry gate in front of the review routes) rather than by a route
// of its own here - this file only owns the "Continue" action, which
// acknowledges the interruption for this case and sends the user on to
// the review URL they originally requested.
//
// This is a GET route rather than a POST: the interruption card is
// rendered by the shared @ministryofjustice/frontend moj-interruption-card
// component (see _includes/case/interruption-card.njk), whose primaryAction
// only supports a plain href/anchor, not a form submission. Forking that
// component's action markup to support POST was avoided per the
// instruction not to redesign the interruption card. The state change
// itself is a harmless, idempotent per-case boolean flip, which is an
// acceptable trade-off for a prototype.
module.exports = router => {
  router.get('/cases/:caseId/interruption/continue', (req, res) => {
    const caseId = parseInt(req.params.caseId)
    if (isNaN(caseId)) return res.status(404).send('Case not found')

    // Written as brand new objects rather than mutations of the existing
    // ones: sign-in (see account.js) resets session data with a shallow
    // Object.assign, so mutating an object in place here could otherwise
    // leak across other sessions that still point at the same reference.
    req.session.data.reviewInterruptionAcknowledged = Object.assign(
      {}, req.session.data.reviewInterruptionAcknowledged, { [caseId]: true }
    )

    const pendingCases = req.session.data.reviewInterruptionPending || {}
    const pending = pendingCases[caseId]
    const requestedUrl = pending && pending.requestedUrl

    const remainingPending = Object.assign({}, pendingCases)
    delete remainingPending[caseId]
    req.session.data.reviewInterruptionPending = remainingPending

    const destination = isSafeReviewUrl(requestedUrl, caseId) ? requestedUrl : `/cases/${caseId}/review`
    res.redirect(destination)
  })
}
