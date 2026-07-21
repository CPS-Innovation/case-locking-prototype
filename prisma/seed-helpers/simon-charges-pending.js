const { faker } = require('@faker-js/faker');
const { generateCaseReference } = require('./identifiers');
const { createDirectionsForCase } = require('./directions');
const { SIMON_UNITS } = require('./simon-cases');
const statuses = require('../../app/data/case-statuses');
const {
  PALMER_LOCATION,
  findOrCreatePalmerVictim,
  findPalmerPoliceUnit,
  createPalmerDefendant,
  createPalmerWitnesses,
  createPalmerDocuments,
  createFullPalmerReview
} = require('./palmer-case');

// Simon also has a third Palmer-material case - same victim, police
// witnesses and documents, but a different defendant (Craig Ashworth) -
// where the review has been submitted with a "Charge" decision but the
// police haven't sent back authorised charges yet. This guarantees Simon
// exactly 1 case in Charges pending, distinct from the fully Charged case
// seeded by seedSimonChargedReview.
async function seedSimonChargesPendingReview(prisma, dependencies, config) {
  const { types, complexities } = config;

  const simonWhatley = await prisma.user.findFirst({
    where: { firstName: 'Simon', lastName: 'Whatley' }
  });

  if (!simonWhatley) {
    console.log('⚠️ Simon Whatley not found, skipping charges pending review');
    return 0;
  }

  const defendant = await createPalmerDefendant(prisma, { firstName: 'Craig', lastName: 'Ashworth' });
  const victim = await findOrCreatePalmerVictim(prisma);
  const policeUnit = await findPalmerPoliceUnit(prisma);
  const unitId = faker.helpers.arrayElement(Object.values(SIMON_UNITS));

  const _case = await prisma.case.create({
    data: {
      reference: generateCaseReference(),
      type: faker.helpers.arrayElement(types),
      complexity: faker.helpers.arrayElement(complexities),
      unit: { connect: { id: unitId } },
      policeUnit: { connect: { id: policeUnit.id } },
      defendants: { connect: { id: defendant.id } },
      victims: { connect: { id: victim.id } },
      location: { create: PALMER_LOCATION }
    }
  });

  await createPalmerDocuments(prisma, _case.id);

  await prisma.caseProsecutor.create({
    data: {
      caseId: _case.id,
      userId: simonWhatley.id,
      isLead: true
    }
  });

  const dueDate = faker.date.recent({ days: 5 });
  dueDate.setHours(23, 59, 59, 999);
  await prisma.task.create({
    data: {
      name: 'Make charging decision',
      reminderType: null,
      reminderDate: new Date(dueDate.getTime() - 3 * 24 * 60 * 60 * 1000),
      dueDate,
      escalationDate: new Date(dueDate.getTime() + 2 * 24 * 60 * 60 * 1000),
      completedDate: dueDate,
      caseId: _case.id,
      assignedToUserId: simonWhatley.id
    }
  });

  await createDirectionsForCase(prisma, _case.id, defendant.id, faker.number.int({ min: 1, max: 3 }));
  await createPalmerWitnesses(prisma, _case.id);

  await createFullPalmerReview(prisma, {
    caseId: _case.id,
    userId: simonWhatley.id,
    defendant,
    status: 'submitted',
    lastName: 'Ashworth',
    includeChargeDecision: true
  });

  // Mirrors what submitting a "Charge" decision does in the real review
  // flow (app/routes/case--review.js): the charge itself records the
  // decision, while the defendant moves to Charges pending until the
  // police send back authorised charges.
  await prisma.charge.update({
    where: { id: defendant.charges[0].id },
    data: { status: 'Charge' }
  });

  await prisma.defendant.update({
    where: { id: defendant.id },
    data: { status: statuses.CHARGES_PENDING, needsReview: false }
  });

  return 1;
}

module.exports = { seedSimonChargesPendingReview };
