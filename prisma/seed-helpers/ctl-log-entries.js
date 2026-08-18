const { faker } = require('@faker-js/faker')

const ctlLogDescriptions = [
  'Ad-hoc review',
  'Applications to vary judges’ directions',
  'Case Action Plans - sent',
  'Case conference',
  'Chase upgrade file',
  'CTL extension application - draft approval and service',
  'Digital diary creation and update',
  'Escalations',
  'Prepare PTPH',
  'Receipt of defence statement',
  'Threshold test review',
  'Weekly assurance report',
]

async function createCtlLogEntries(prisma, caseId, users) {
  const count = faker.number.int({ min: 0, max: 10 })

  for (let i = 0; i < count; i++) {
    const randomUser = faker.helpers.arrayElement(users)
    const description = faker.helpers.arrayElement(ctlLogDescriptions)

    await prisma.ctlLogEntry.create({
      data: {
        description,
        caseId,
        userId: randomUser.id,
        createdAt: faker.date.recent({ days: 90 }),
      },
    })
  }

  return count
}

module.exports = { createCtlLogEntries }
