const { faker } = require('@faker-js/faker')
const hearingStatuses = require('../../app/data/hearing-statuses')
const statuses = require('../../app/data/case-statuses')
const venues = require('../../app/data/venues')

function randomHearingStatus() {
  return faker.helpers.weightedArrayElement([
    { weight: 30, value: hearingStatuses.PREPARATION_NEEDED },
    { weight: 30, value: hearingStatuses.PENDING },
    { weight: 30, value: hearingStatuses.OUTCOME_NEEDED },
    { weight: 10, value: hearingStatuses.COMPLETE },
  ])
}

// Generate N dates in chronological order, all in the past, with consistent spacing
function completePastDates(count) {
  const now = new Date()
  const lastDaysAgo = faker.number.int({ min: 14, max: 30 })
  const intervals = Array.from({ length: count - 1 }, () => faker.number.int({ min: 30, max: 60 }))
  let totalDaysAgo = lastDaysAgo + intervals.reduce((a, b) => a + b, 0)

  const dates = []
  for (let i = 0; i < count; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - totalDaysAgo)
    d.setHours(10, 0, 0, 0)
    dates.push(d)
    if (i < count - 1) totalDaysAgo -= intervals[i]
  }
  return dates
}

function chargedFirstHearingDate() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const daysToEndOfWeek = 7 - now.getDay()

  const group = faker.helpers.weightedArrayElement([
    { weight: 10, value: 'overdue' },
    { weight: 20, value: 'today' },
    { weight: 20, value: 'tomorrow' },
    { weight: 20, value: 'thisWeek' },
    { weight: 15, value: 'nextWeek' },
    { weight: 15, value: 'later' },
  ])

  const d = new Date(now)
  switch (group) {
    case 'overdue':
      d.setDate(d.getDate() - faker.number.int({ min: 1, max: 14 }))
      break
    case 'tomorrow':
      d.setDate(d.getDate() + 1)
      break
    case 'thisWeek': {
      const offset = daysToEndOfWeek >= 2
        ? faker.number.int({ min: 2, max: daysToEndOfWeek })
        : faker.number.int({ min: daysToEndOfWeek + 1, max: daysToEndOfWeek + 7 })
      d.setDate(d.getDate() + offset)
      break
    }
    case 'nextWeek':
      d.setDate(d.getDate() + faker.number.int({ min: daysToEndOfWeek + 1, max: daysToEndOfWeek + 7 }))
      break
    case 'later':
      d.setDate(d.getDate() + faker.number.int({ min: daysToEndOfWeek + 8, max: daysToEndOfWeek + 35 }))
      break
    // 'today': no change
  }
  d.setHours(10, 0, 0, 0)
  return d
}

function buildChargedSequence(forceHasHearing) {
  const hasHearing = forceHasHearing !== undefined ? forceHasHearing : faker.datatype.boolean({ probability: 0.5 })
  if (!hasHearing) return []
  return [{
    type: 'First hearing',
    status: hearingStatuses.PREPARATION_NEEDED,
    date: chargedFirstHearingDate()
  }]
}

function buildNotGuiltySequence(isCrownCourt) {
  const types = ['First hearing']

  // 60% also went to trial (which resulted in not guilty); 40% resolved at first hearing
  if (faker.datatype.boolean({ probability: 0.6 })) {
    if (isCrownCourt && faker.datatype.boolean({ probability: 0.5 })) {
      types.push('PTPH')
    }
    types.push('Trial')
  }

  const dates = completePastDates(types.length)
  return types.map((type, i) => ({ type, status: hearingStatuses.COMPLETE, date: dates[i] }))
}

function buildSentencedSequence(isCrownCourt) {
  const types = ['First hearing']

  if (faker.datatype.boolean({ probability: 0.5 })) {
    if (isCrownCourt && faker.datatype.boolean({ probability: 0.5 })) {
      types.push('PTPH')
    }
    types.push('Trial')
  }

  types.push('Sentencing')

  const dates = completePastDates(types.length)
  return types.map((type, i) => ({ type, status: hearingStatuses.COMPLETE, date: dates[i] }))
}

function buildHearingSequence(status, isCrownCourt, forceHasHearing) {
  if (status === statuses.CHARGED) return buildChargedSequence(forceHasHearing)
  if (status === statuses.NOT_GUILTY) return buildNotGuiltySequence(isCrownCourt)
  if (status === statuses.SENTENCED) return buildSentencedSequence(isCrownCourt)
  return []
}

async function addHearings(prisma, { caseId, unitId, defendants, status, forceHasHearing }) {
  const unit = await prisma.unit.findUnique({ where: { id: unitId }, select: { type: true } })
  const isCrownCourt = unit?.type === 'Crown Court'
  const sequence = buildHearingSequence(status, isCrownCourt, forceHasHearing)
  for (const hearing of sequence) {
    await prisma.hearing.create({
      data: {
        startDate: hearing.date,
        status: hearing.status,
        type: hearing.type,
        venue: faker.helpers.arrayElement(venues),
        caseId,
        defendants: { connect: defendants.map(d => ({ id: d.id })) }
      }
    })
  }
}

module.exports = {
  addHearings
}
