const counters = new Map()

// Alternates true/false per prosecutor instead of an independent random roll,
// so a prosecutor with only a couple of Charged+needsReview cases doesn't end
// up with all of them missing (or all of them having) a first hearing by chance.
function nextForcedHasHearing(prosecutorId) {
  if (prosecutorId == null) return undefined
  const count = counters.get(prosecutorId) || 0
  counters.set(prosecutorId, count + 1)
  return count % 2 === 0
}

module.exports = { nextForcedHasHearing }
