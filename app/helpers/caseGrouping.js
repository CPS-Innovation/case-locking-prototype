function getDateGroup(date, today) {
  if (!date) return 'noDate'
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const endOfWeek = new Date(today)
  endOfWeek.setDate(endOfWeek.getDate() + (7 - today.getDay()))
  const endOfNextWeek = new Date(endOfWeek)
  endOfNextWeek.setDate(endOfNextWeek.getDate() + 7)
  if (d < today) return 'overdue'
  if (d.getTime() === today.getTime()) return 'today'
  if (d.getTime() === tomorrow.getTime()) return 'tomorrow'
  if (d <= endOfWeek) return 'thisWeek'
  if (d <= endOfNextWeek) return 'nextWeek'
  return 'later'
}

function getPaceClockGroup(dt) {
  if (!dt) return 'noPaceClock'
  const hours = (new Date(dt) - new Date()) / 3600000
  if (hours < 0) return 'expired'
  if (hours < 1) return 'lessThan1Hour'
  if (hours < 2) return 'lessThan2Hours'
  if (hours < 3) return 'lessThan3Hours'
  return 'moreThan3Hours'
}

module.exports = { getDateGroup, getPaceClockGroup }
