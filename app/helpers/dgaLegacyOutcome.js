function calculateLegacyOutcome(failureReasons) {
  const hasDisputedUnsuccessfully = failureReasons.some(
    fr => fr.didPoliceDisputeFailure === 'Yes' && fr.didCpsAcceptDispute === 'No'
  )
  if (hasDisputedUnsuccessfully) return 'Disputed unsuccessfully'

  const hasDisputedSuccessfully = failureReasons.some(
    fr => fr.didPoliceDisputeFailure === 'Yes' && fr.didCpsAcceptDispute === 'Yes'
  )
  if (hasDisputedSuccessfully) return 'Disputed successfully'

  return 'Not disputed'
}

function isFinalFailure(failureReasons) {
  const completedCount = failureReasons.filter(fr => fr.didPoliceDisputeFailure !== null).length
  return completedCount === failureReasons.length - 1
}

module.exports = {
  calculateLegacyOutcome,
  isFinalFailure
}
