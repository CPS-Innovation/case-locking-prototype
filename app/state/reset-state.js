// Shared flag so /clear-data can signal a reset is in progress. Case IDs and
// other data shift while resetAllData + reseed run, so any other request
// touching that data mid-reset needs to back off rather than 500 or crash.
module.exports = {
  inProgress: false
}
