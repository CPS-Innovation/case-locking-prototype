function addTimeLimitDates(_case) {
  const ctlDates = []
  const stlDates = []
  const paceClockDates = []

  _case.defendants.forEach(defendant => {
    if (defendant.paceClock) {
      paceClockDates.push(new Date(defendant.paceClock))
    }
    defendant.charges.forEach(charge => {
      if (charge.custodyTimeLimit) {
        ctlDates.push(new Date(charge.custodyTimeLimit))
      }
      if (charge.statutoryTimeLimit) {
        stlDates.push(new Date(charge.statutoryTimeLimit))
      }
    })
  })

  _case.custodyTimeLimit = ctlDates.length > 0 ? new Date(Math.min(...ctlDates)) : null
  _case.statutoryTimeLimit = stlDates.length > 0 ? new Date(Math.min(...stlDates)) : null
  _case.paceClock = paceClockDates.length > 0 ? new Date(Math.min(...paceClockDates)) : null

}

module.exports = {
  addTimeLimitDates
}
