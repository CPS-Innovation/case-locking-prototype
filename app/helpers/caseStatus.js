function addCaseStatus(_case) {
  const uniqueDefendantStatuses = [...new Set(_case.defendants.map(d => d.status).filter(Boolean))]
  if (uniqueDefendantStatuses.length > 1) {
    _case.status = 'Multiple statuses'
    _case.defendantStatuses = uniqueDefendantStatuses
  } else {
    _case.status = uniqueDefendantStatuses[0] || null
    _case.defendantStatuses = []
  }
  _case.needsReview = _case.defendants.some(d => d.needsReview)
}

module.exports = {
  addCaseStatus
}
