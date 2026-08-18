const { faker } = require('@faker-js/faker')
const { generateCaseReference } = require('./identifiers')
const statuses = require('../../app/data/case-statuses')
const { addHearings } = require('./hearings')
const { nextForcedHasHearing } = require('./charged-hearing-balance')

const END_STATUSES = [statuses.NOT_GUILTY, statuses.NO_FURTHER_ACTION, statuses.SENTENCED]

async function createDivergedCase(prisma, user, unitId, statusPool, config) {
  const { firstNames, lastNames, defenceLawyers, charges, pleas, victims, policeUnits, types, complexities } = config

  const activePool = statusPool.filter(s => !END_STATUSES.includes(s))
  const status1 = faker.helpers.arrayElement(activePool)
  const remainingStatuses = activePool.filter((s) => s !== status1)
  const status2 = faker.helpers.arrayElement(remainingStatuses)
  const needsReview1 = status1 === statuses.NOT_CHARGED || (status1 === statuses.CHARGED && faker.datatype.boolean())

  const defendant1 = await prisma.defendant.create({
    data: {
      firstName: faker.helpers.arrayElement(firstNames),
      lastName: faker.helpers.arrayElement(lastNames),
      gender: faker.helpers.arrayElement(['Male', 'Female', 'Unknown']),
      dateOfBirth: faker.date.birthdate({ min: 18, max: 75, mode: 'age' }),
      remandStatus: faker.helpers.arrayElement(['UNCONDITIONAL_BAIL', 'CONDITIONAL_BAIL', 'REMANDED_IN_CUSTODY']),
      status: status1,
      needsReview: needsReview1,
      defenceLawyer: { connect: { id: faker.helpers.arrayElement(defenceLawyers).id } },
      charges: {
        create: {
          chargeCode: faker.helpers.arrayElement(charges).code,
          description: faker.helpers.arrayElement(charges).description,
          status: 'Charged',
          offenceDate: faker.date.past(),
          plea: faker.helpers.arrayElement(pleas),
          isCount: false,
        },
      },
    },
  })

  const defendant2 = await prisma.defendant.create({
    data: {
      firstName: faker.helpers.arrayElement(firstNames),
      lastName: faker.helpers.arrayElement(lastNames),
      gender: faker.helpers.arrayElement(['Male', 'Female', 'Unknown']),
      dateOfBirth: faker.date.birthdate({ min: 18, max: 75, mode: 'age' }),
      remandStatus: faker.helpers.arrayElement(['UNCONDITIONAL_BAIL', 'CONDITIONAL_BAIL', 'REMANDED_IN_CUSTODY']),
      status: status2,
      needsReview: status2 === statuses.NOT_CHARGED || (status2 === statuses.CHARGED && faker.datatype.boolean()),
      defenceLawyer: { connect: { id: faker.helpers.arrayElement(defenceLawyers).id } },
      charges: {
        create: {
          chargeCode: faker.helpers.arrayElement(charges).code,
          description: faker.helpers.arrayElement(charges).description,
          status: 'Charged',
          offenceDate: faker.date.past(),
          plea: faker.helpers.arrayElement(pleas),
          isCount: false,
        },
      },
    },
  })

  const victimIds = faker.helpers.arrayElements(victims, faker.number.int({ min: 1, max: 2 })).map((v) => ({ id: v.id }))

  const _case = await prisma.case.create({
    data: {
      reference: generateCaseReference(),
      type: faker.helpers.arrayElement(types),
      complexity: faker.helpers.arrayElement(complexities),
      unit: { connect: { id: unitId } },
      policeUnit: { connect: { id: faker.helpers.arrayElement(policeUnits).id } },
      defendants: { connect: [{ id: defendant1.id }, { id: defendant2.id }] },
      victims: { connect: victimIds },
      location: {
        create: {
          name: faker.company.name(),
          line1: faker.location.streetAddress(),
          line2: faker.location.secondaryAddress(),
          town: faker.location.city(),
          postcode: faker.location.zipCode('WD# #SF'),
        },
      },
    },
  })

  await prisma.caseProsecutor.create({
    data: { caseId: _case.id, userId: user.id, isLead: true },
  })

  const forceHasHearing = (status1 === statuses.CHARGED && needsReview1) ? nextForcedHasHearing(user.id) : undefined
  await addHearings(prisma, { caseId: _case.id, unitId, defendants: [defendant1, defendant2], status: status1, forceHasHearing })

  return _case
}

module.exports = { createDivergedCase }
