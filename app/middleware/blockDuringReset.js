const resetState = require('../state/reset-state')

function blockDuringReset(req, res, next) {
  if (resetState.inProgress) {
    return res.status(503).send('The prototype is resetting its data. Please try again in a few seconds.')
  }
  next()
}

module.exports = blockDuringReset
