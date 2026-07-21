const { faker } = require('@faker-js/faker');
const { createDirectionsForCase } = require('./directions');
const { SIMON_UNITS } = require('./simon-cases');
const {
  WALKER_LOCATION,
  findOrCreateWalkerVictim,
  findWalkerPoliceUnit,
  createWalkerDefendant,
  createWalkerWitnesses,
  createWalkerDocuments,
  createFullWalkerReview
} = require('./walker-case');

const CASE_REFERENCE = '52SW200001';

// Simon has a review of the R v Joseph Walker case that is all but ready to
// submit: every document reviewed, the key material annotated with text from
// the real documents, summary written, all elements assessed as strong and a
// decision to charge. The charging decision and information request answer
// are draft state stored directly on the review row, so no session hydration
// is needed to make the task list and check pages reflect them. Runs after
// seedElements, so it creates its own (all strong) elements.
async function seedSimonInProgressReview(prisma, dependencies, config) {
  const { types, complexities } = config;

  const simonWhatley = await prisma.user.findFirst({
    where: { firstName: 'Simon', lastName: 'Whatley' }
  });

  if (!simonWhatley) {
    console.log('⚠️ Simon Whatley not found, skipping in-progress review');
    return 0;
  }

  const defendant = await createWalkerDefendant(prisma);
  const victim = await findOrCreateWalkerVictim(prisma);
  const policeUnit = await findWalkerPoliceUnit(prisma);

  const _case = await prisma.case.create({
    data: {
      reference: CASE_REFERENCE,
      type: faker.helpers.arrayElement(types),
      complexity: faker.helpers.arrayElement(complexities),
      unit: { connect: { id: SIMON_UNITS.NORTH_YORKSHIRE_MAGISTRATES_COURT } },
      policeUnit: { connect: { id: policeUnit.id } },
      defendants: { connect: { id: defendant.id } },
      victims: { connect: { id: victim.id } },
      location: { create: WALKER_LOCATION }
    }
  });

  await createWalkerDocuments(prisma, _case.id);

  await prisma.caseProsecutor.create({
    data: {
      caseId: _case.id,
      userId: simonWhatley.id,
      isLead: true
    }
  });

  const dueDate = faker.date.soon({ days: 5 });
  dueDate.setHours(23, 59, 59, 999);
  await prisma.task.create({
    data: {
      name: 'Make charging decision',
      reminderType: null,
      reminderDate: new Date(dueDate.getTime() - 3 * 24 * 60 * 60 * 1000),
      dueDate,
      escalationDate: new Date(dueDate.getTime() + 2 * 24 * 60 * 60 * 1000),
      completedDate: null,
      caseId: _case.id,
      assignedToUserId: simonWhatley.id
    }
  });

  await createDirectionsForCase(prisma, _case.id, defendant.id, faker.number.int({ min: 1, max: 3 }));
  await createWalkerWitnesses(prisma, _case.id);

  // No information-request annotations - the review answers no to the
  // information request question.
  await createFullWalkerReview(prisma, {
    caseId: _case.id,
    userId: simonWhatley.id,
    defendant,
    status: 'in_progress',
    lastName: 'Palmer',
    includeChargeDecision: true
  });

  return 1;
}

module.exports = { seedSimonInProgressReview };
