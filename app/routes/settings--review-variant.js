module.exports = (router) => {
  router.post('/settings/review-variant/toggle', (req, res) => {
    req.session.data.reviewVariant2 = !req.session.data.reviewVariant2

    // Redirecting back to the referrer as-is would leave you on the exact
    // same URL, under the old variant's prefix, if you toggled from inside
    // the review flow — jump to the new variant's task list instead so the
    // toggle visibly does something from there.
    const referrer = req.query.referrer || '/'
    const reviewMatch = referrer.match(/^(\/cases\/\d+)\/review(?:-variant-2)?(?:\/|$)/)
    if (reviewMatch) {
      const prefix = req.session.data.reviewVariant2 ? '/review-variant-2' : '/review'
      return res.redirect(reviewMatch[1] + prefix)
    }

    res.redirect(referrer)
  })
}
