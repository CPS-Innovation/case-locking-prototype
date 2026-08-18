const caseStatuses = require('../data/case-statuses')

function setLocals(req, res, next) {
  res.locals.caseStatuses = caseStatuses
  res.locals.referrer = req.query.referrer
  res.locals.path = req.path
  res.locals.protocol = req.protocol
  res.locals.hostname = req.hostname
  res.locals.query = req.query
  res.locals.flash = req.flash('success')[0]

  const flashError = req.flash('error')
  if (flashError[0]) {
    res.locals.errorSummary = flashError[0].errorSummary
    res.locals.inlineErrors = flashError[0].inlineErrors
    res.locals.errorHighlights = flashError[0].errorHighlights
  }

  next()
}

module.exports = setLocals
