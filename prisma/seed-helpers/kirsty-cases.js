const { faker } = require('@faker-js/faker');
const statuses = require('../../app/data/case-statuses');
const { generateCaseReference } = require('./identifiers');
const { generateDocumentsData } = require('./documents');
const { createDivergedCase } = require('./diverged-cases');
const { addHearings } = require('./hearings');
const { nextForcedHasHearing } = require('./charged-hearing-balance');
const {
  generateTodaySTL,
  generateTomorrowSTL,
  generateThisWeekSTL
} = require('./stl-generators');
const { createDirectionsForCase } = require('./directions');
const { createCtlLogEntries } = require('./ctl-log-entries');

const KIRSTY_UNIT = 3; // Wessex Crown Court

const KIRSTY_STATUSES = [
  statuses.NOT_CHARGED,
  statuses.CHARGES_PENDING,
  statuses.CHARGED,
  statuses.NOT_GUILTY,
  statuses.SENTENCED,
  statuses.NO_FURTHER_ACTION,
];

// STL tasks (pre-charge, no hearing)
const KIRSTY_STL_TASKS = [
  { name: '5-day PCD review', stlGenerator: generateTodaySTL },
  { name: '28-day PCD review', stlGenerator: generateTomorrowSTL },
  { name: 'Further PCD review', stlGenerator: generateThisWeekSTL }
];

const KIRSTY_CTL_TASKS = [
  { name: 'Initial disclosure', hasCTL: true },
  { name: 'Post sending review', hasCTL: true },
  { name: 'Prepare PTPH', hasCTL: true },
  { name: 'Continuous disclosure', hasCTL: true },
  { name: 'Reminder - RL, please see police response to DCS 12/01', hasCTL: true, isReminder: true },
  { name: 'CTL expiry imminent', hasCTL: true }
];

async function createSTLCase(prisma, user, taskConfig, config) {
  const { defenceLawyers, charges, firstNames, lastNames, victims, types, complexities, policeUnits, ukCities, availableOperationNames, documentNames, documentTypes } = config;
  const { name, stlGenerator } = taskConfig;

  const statutoryTimeLimit = stlGenerator();

  const defendant = await prisma.defendant.create({
    data: {
      firstName: faker.helpers.arrayElement(firstNames),
      lastName: faker.helpers.arrayElement(lastNames),
      gender: faker.helpers.arrayElement(['Male', 'Female', 'Unknown']),
      dateOfBirth: faker.date.birthdate({ min: 18, max: 75, mode: 'age' }),
      remandStatus: null,
      defenceLawyer: { connect: { id: faker.helpers.arrayElement(defenceLawyers).id } },
      charges: {
        create: {
          chargeCode: faker.helpers.arrayElement(charges).code,
          description: faker.helpers.arrayElement(charges).description,
          status: 'Pre-charge',
          offenceDate: faker.date.past(),
          plea: null,
          statutoryTimeLimit,
          isCount: false
        }
      }
    }
  });

  const victimIds = faker.helpers.arrayElements(victims, faker.number.int({ min: 1, max: 2 })).map(v => ({ id: v.id }));

  const operationName = (faker.datatype.boolean({ probability: 0.3 }) && availableOperationNames.length > 0)
    ? availableOperationNames.pop()
    : null;

  const numDocuments = faker.number.int({ min: 5, max: 15 });
  const documentsData = generateDocumentsData(documentNames, documentTypes, numDocuments);

  const _case = await prisma.case.create({
    data: {
      reference: generateCaseReference(),
      operationName,
      type: faker.helpers.arrayElement(types),
      complexity: faker.helpers.arrayElement(complexities),
      unit: { connect: { id: KIRSTY_UNIT } },
      policeUnit: { connect: { id: faker.helpers.arrayElement(policeUnits).id } },
      defendants: { connect: { id: defendant.id } },
      victims: { connect: victimIds },
      location: {
        create: {
          name: faker.company.name(),
          line1: faker.location.streetAddress(),
          line2: faker.location.secondaryAddress(),
          town: faker.helpers.arrayElement(ukCities),
          postcode: faker.location.zipCode("WD# #SF"),
        },
      },
      documents: {
        createMany: {
          data: documentsData,
        },
      },
    }
  });

  const defendantStatus = faker.helpers.arrayElement(KIRSTY_STATUSES)
  await prisma.defendant.updateMany({
    where: { cases: { some: { id: _case.id } } },
    data: { status: defendantStatus, needsReview: defendantStatus === statuses.NOT_CHARGED || (defendantStatus === statuses.CHARGED && faker.datatype.boolean()) }
  });
  if (defendantStatus === statuses.CHARGED) {
    await prisma.document.create({
      data: {
        caseId: _case.id,
        name: 'Authorised charges (MG04)',
        description: 'Authorised charges received from the police.',
        type: 'PDF',
        size: faker.number.int({ min: 50, max: 5000 }),
      },
    })
  }

  await prisma.caseProsecutor.create({
    data: {
      caseId: _case.id,
      userId: user.id,
      isLead: true
    }
  });

  // Create task (no hearing for STL/pre-charge tasks)
  const dueDate = statutoryTimeLimit;
  await prisma.task.create({
    data: {
      name,
      reminderType: null,
      reminderDate: new Date(dueDate.getTime() - 3 * 24 * 60 * 60 * 1000),
      dueDate,
      escalationDate: new Date(dueDate.getTime() + 2 * 24 * 60 * 60 * 1000),
      completedDate: null,
      caseId: _case.id,
      assignedToUserId: user.id
    }
  });

  // Create directions
  await createDirectionsForCase(prisma, _case.id, defendant.id, faker.number.int({ min: 1, max: 3 }));

  return _case;
}

async function createCTLCase(prisma, user, taskConfig, config) {
  const { defenceLawyers, charges, firstNames, lastNames, pleas, victims, types, complexities, policeUnits, ukCities, availableOperationNames, documentNames, documentTypes } = config;
  const { name, isReminder } = taskConfig;

  const custodyTimeLimit = faker.date.soon({ days: 14 });
  custodyTimeLimit.setHours(23, 59, 59, 999);

  const defendant = await prisma.defendant.create({
    data: {
      firstName: faker.helpers.arrayElement(firstNames),
      lastName: faker.helpers.arrayElement(lastNames),
      gender: faker.helpers.arrayElement(['Male', 'Female', 'Unknown']),
      dateOfBirth: faker.date.birthdate({ min: 18, max: 75, mode: 'age' }),
      remandStatus: 'REMANDED_IN_CUSTODY',
      defenceLawyer: { connect: { id: faker.helpers.arrayElement(defenceLawyers).id } },
      charges: {
        create: {
          chargeCode: faker.helpers.arrayElement(charges).code,
          description: faker.helpers.arrayElement(charges).description,
          status: 'Charged',
          offenceDate: faker.date.past(),
          plea: faker.helpers.arrayElement(pleas),
          custodyTimeLimit,
          isCount: false
        }
      }
    }
  });

  const victimIds = faker.helpers.arrayElements(victims, faker.number.int({ min: 1, max: 2 })).map(v => ({ id: v.id }));

  const operationName = (faker.datatype.boolean({ probability: 0.3 }) && availableOperationNames.length > 0)
    ? availableOperationNames.pop()
    : null;

  const numDocuments = faker.number.int({ min: 5, max: 15 });
  const documentsData = generateDocumentsData(documentNames, documentTypes, numDocuments);

  const extraDefendants = [];
  if (faker.datatype.boolean({ probability: 0.3 })) {
    const extra = await prisma.defendant.create({
      data: {
        firstName: faker.helpers.arrayElement(firstNames),
        lastName: faker.helpers.arrayElement(lastNames),
        gender: faker.helpers.arrayElement(['Male', 'Female', 'Unknown']),
        dateOfBirth: faker.date.birthdate({ min: 18, max: 75, mode: 'age' }),
        remandStatus: faker.helpers.arrayElement(['UNCONDITIONAL_BAIL', 'CONDITIONAL_BAIL', 'REMANDED_IN_CUSTODY']),
        defenceLawyer: { connect: { id: faker.helpers.arrayElement(defenceLawyers).id } },
        charges: {
          create: {
            chargeCode: faker.helpers.arrayElement(charges).code,
            description: faker.helpers.arrayElement(charges).description,
            status: 'Charged',
            offenceDate: faker.date.past(),
            plea: faker.helpers.arrayElement(pleas),
            isCount: false
          }
        }
      }
    });
    extraDefendants.push(extra);
  }

  const _case = await prisma.case.create({
    data: {
      reference: generateCaseReference(),
      operationName,
      type: faker.helpers.arrayElement(types),
      complexity: faker.helpers.arrayElement(complexities),
      unit: { connect: { id: KIRSTY_UNIT } },
      policeUnit: { connect: { id: faker.helpers.arrayElement(policeUnits).id } },
      defendants: { connect: [{ id: defendant.id }, ...extraDefendants.map(d => ({ id: d.id }))] },
      victims: { connect: victimIds },
      location: {
        create: {
          name: faker.company.name(),
          line1: faker.location.streetAddress(),
          line2: faker.location.secondaryAddress(),
          town: faker.helpers.arrayElement(ukCities),
          postcode: faker.location.zipCode("WD# #SF"),
        },
      },
      documents: {
        createMany: {
          data: documentsData,
        },
      },
    }
  });

  const status = faker.helpers.arrayElement(KIRSTY_STATUSES)
  const needsReview = status === statuses.NOT_CHARGED || (status === statuses.CHARGED && faker.datatype.boolean())
  await prisma.defendant.updateMany({
    where: { cases: { some: { id: _case.id } } },
    data: { status, needsReview }
  });
  if (status === statuses.CHARGED) {
    await prisma.document.create({
      data: {
        caseId: _case.id,
        name: 'Authorised charges (MG04)',
        description: 'Authorised charges received from the police.',
        type: 'PDF',
        size: faker.number.int({ min: 50, max: 5000 }),
      },
    })
  }
  const forceHasHearing = (status === statuses.CHARGED && needsReview) ? nextForcedHasHearing(user.id) : undefined
  await addHearings(prisma, { caseId: _case.id, unitId: KIRSTY_UNIT, defendants: [defendant, ...extraDefendants], status, forceHasHearing })

  await prisma.caseProsecutor.create({
    data: {
      caseId: _case.id,
      userId: user.id,
      isLead: true
    }
  });

  // Create task
  const dueDate = faker.date.soon({ days: 14 });
  dueDate.setHours(23, 59, 59, 999);
  await prisma.task.create({
    data: {
      name,
      reminderType: isReminder ? 'Manual' : null,
      reminderDate: new Date(dueDate.getTime() - 3 * 24 * 60 * 60 * 1000),
      dueDate,
      escalationDate: new Date(dueDate.getTime() + 2 * 24 * 60 * 60 * 1000),
      completedDate: null,
      caseId: _case.id,
      assignedToUserId: user.id
    }
  });

  // Create directions
  await createDirectionsForCase(prisma, _case.id, defendant.id, faker.number.int({ min: 1, max: 3 }));

  await createCtlLogEntries(prisma, _case.id, [user]);

  return _case;
}

async function createColleagueCase(prisma, prosecutor, paralegalOfficer, config) {
  const { defenceLawyers, charges, firstNames, lastNames, pleas, victims, types, complexities, taskNames, policeUnits, ukCities, documentNames, documentTypes } = config;

  const defendant = await prisma.defendant.create({
    data: {
      firstName: faker.helpers.arrayElement(firstNames),
      lastName: faker.helpers.arrayElement(lastNames),
      gender: faker.helpers.arrayElement(['Male', 'Female', 'Unknown']),
      dateOfBirth: faker.date.birthdate({ min: 18, max: 75, mode: 'age' }),
      remandStatus: faker.helpers.arrayElement(['UNCONDITIONAL_BAIL', 'CONDITIONAL_BAIL', 'REMANDED_IN_CUSTODY']),
      defenceLawyer: { connect: { id: faker.helpers.arrayElement(defenceLawyers).id } },
      charges: {
        create: {
          chargeCode: faker.helpers.arrayElement(charges).code,
          description: faker.helpers.arrayElement(charges).description,
          status: 'Charged',
          offenceDate: faker.date.past(),
          plea: faker.helpers.arrayElement(pleas),
          isCount: false
        }
      }
    }
  });

  const victimIds = faker.helpers.arrayElements(victims, faker.number.int({ min: 1, max: 2 })).map(v => ({ id: v.id }));

  const numDocuments = faker.number.int({ min: 3, max: 8 });
  const documentsData = generateDocumentsData(documentNames, documentTypes, numDocuments);

  const _case = await prisma.case.create({
    data: {
      reference: generateCaseReference(),
      type: faker.helpers.arrayElement(types),
      complexity: faker.helpers.arrayElement(complexities),
      unit: { connect: { id: KIRSTY_UNIT } },
      policeUnit: { connect: { id: faker.helpers.arrayElement(policeUnits).id } },
      defendants: { connect: { id: defendant.id } },
      victims: { connect: victimIds },
      location: {
        create: {
          name: faker.company.name(),
          line1: faker.location.streetAddress(),
          line2: faker.location.secondaryAddress(),
          town: faker.helpers.arrayElement(ukCities),
          postcode: faker.location.zipCode("WD# #SF"),
        }
      },
      documents: {
        createMany: { data: documentsData }
      }
    }
  });

  const status = faker.helpers.arrayElement(KIRSTY_STATUSES)
  const needsReview = status === statuses.NOT_CHARGED || (status === statuses.CHARGED && faker.datatype.boolean())
  await prisma.defendant.updateMany({
    where: { cases: { some: { id: _case.id } } },
    data: { status, needsReview }
  });
  if (status === statuses.CHARGED) {
    await prisma.document.create({
      data: {
        caseId: _case.id,
        name: 'Authorised charges (MG04)',
        description: 'Authorised charges received from the police.',
        type: 'PDF',
        size: faker.number.int({ min: 50, max: 5000 }),
      },
    })
  }
  const forceHasHearing = (status === statuses.CHARGED && needsReview) ? nextForcedHasHearing(prosecutor.id) : undefined
  await addHearings(prisma, { caseId: _case.id, unitId: KIRSTY_UNIT, defendants: [defendant], status, forceHasHearing })

  await prisma.caseProsecutor.create({
    data: { caseId: _case.id, userId: prosecutor.id, isLead: true }
  });

  await prisma.caseParalegalOfficer.create({
    data: { caseId: _case.id, userId: paralegalOfficer.id }
  });

  const dueDate = faker.date.soon({ days: 30 });
  dueDate.setHours(23, 59, 59, 999);
  await prisma.task.create({
    data: {
      name: faker.helpers.arrayElement(taskNames),
      reminderType: null,
      reminderDate: new Date(dueDate.getTime() - 3 * 24 * 60 * 60 * 1000),
      dueDate,
      escalationDate: new Date(dueDate.getTime() + 2 * 24 * 60 * 60 * 1000),
      completedDate: null,
      caseId: _case.id,
      assignedToUserId: prosecutor.id
    }
  });

  return _case;
}

async function createReviewCase(prisma, user, taskName, config, hasCharge = true) {
  const { defenceLawyers, charges, firstNames, lastNames, victims, types, complexities, policeUnits, ukCities, availableOperationNames, documentNames, documentTypes } = config;

  const defendant = await prisma.defendant.create({
    data: {
      firstName: faker.helpers.arrayElement(firstNames),
      lastName: faker.helpers.arrayElement(lastNames),
      gender: faker.helpers.arrayElement(['Male', 'Female', 'Unknown']),
      dateOfBirth: faker.date.birthdate({ min: 18, max: 75, mode: 'age' }),
      remandStatus: null,
      status: statuses.NOT_CHARGED,
      needsReview: true,
      defenceLawyer: { connect: { id: faker.helpers.arrayElement(defenceLawyers).id } },
      ...(hasCharge ? {
        charges: {
          create: {
            chargeCode: faker.helpers.arrayElement(charges).code,
            description: faker.helpers.arrayElement(charges).description,
            status: 'Pre-charge',
            offenceDate: faker.date.past(),
            plea: null,
            isCount: false
          }
        }
      } : {})
    }
  });

  const victimIds = faker.helpers.arrayElements(victims, faker.number.int({ min: 1, max: 2 })).map(v => ({ id: v.id }));

  const operationName = (faker.datatype.boolean({ probability: 0.3 }) && availableOperationNames.length > 0)
    ? availableOperationNames.pop()
    : null;

  const numDocuments = faker.number.int({ min: 5, max: 15 });
  const documentsData = generateDocumentsData(documentNames, documentTypes, numDocuments);

  const _case = await prisma.case.create({
    data: {
      reference: generateCaseReference(),
      operationName,
      type: faker.helpers.arrayElement(types),
      complexity: faker.helpers.arrayElement(complexities),
      unit: { connect: { id: KIRSTY_UNIT } },
      policeUnit: { connect: { id: faker.helpers.arrayElement(policeUnits).id } },
      defendants: { connect: { id: defendant.id } },
      victims: { connect: victimIds },
      location: {
        create: {
          name: faker.company.name(),
          line1: faker.location.streetAddress(),
          line2: faker.location.secondaryAddress(),
          town: faker.helpers.arrayElement(ukCities),
          postcode: faker.location.zipCode("WD# #SF"),
        },
      },
      documents: {
        createMany: {
          data: documentsData,
        },
      },
    }
  });

  await prisma.caseProsecutor.create({
    data: {
      caseId: _case.id,
      userId: user.id,
      isLead: true
    }
  });

  const dueDate = faker.date.soon({ days: 5 });
  dueDate.setHours(23, 59, 59, 999);
  await prisma.task.create({
    data: {
      name: taskName,
      reminderType: null,
      reminderDate: new Date(dueDate.getTime() - 3 * 24 * 60 * 60 * 1000),
      dueDate,
      escalationDate: new Date(dueDate.getTime() + 2 * 24 * 60 * 60 * 1000),
      completedDate: null,
      caseId: _case.id,
      assignedToUserId: user.id
    }
  });

  await createDirectionsForCase(prisma, _case.id, defendant.id, faker.number.int({ min: 1, max: 3 }));

  return _case;
}

async function seedKirstyCases(prisma, dependencies, config) {
  const { defenceLawyers, victims, policeUnits, availableOperationNames, colleagues } = dependencies;
  const { charges, firstNames, lastNames, pleas, types, complexities, taskNames, ukCities, documentNames, documentTypes } = config;

  const kirstyPriest = await prisma.user.findFirst({
    where: { firstName: 'Kirsty', lastName: 'Priest' }
  });

  if (!kirstyPriest) {
    console.log('⚠️ Kirsty Priest not found, skipping Kirsty cases');
    return 0;
  }

  const fullConfig = {
    defenceLawyers,
    charges,
    firstNames,
    lastNames,
    pleas,
    victims,
    types,
    complexities,
    taskNames,
    policeUnits,
    ukCities,
    availableOperationNames,
    documentNames,
    documentTypes
  };

  // Create STL cases (pre-charge, no hearing)
  for (const taskConfig of KIRSTY_STL_TASKS) {
    await createSTLCase(prisma, kirstyPriest, taskConfig, fullConfig);
  }

  // Create CTL cases (with hearing)
  for (const taskConfig of KIRSTY_CTL_TASKS) {
    await createCTLCase(prisma, kirstyPriest, taskConfig, fullConfig);
  }

  // Create colleague cases
  for (let i = 0; i < 20; i++) {
    await createColleagueCase(prisma, colleagues.prosecutors[i], colleagues.paralegalOfficers[i], fullConfig);
  }

  await createDivergedCase(prisma, kirstyPriest, KIRSTY_UNIT, KIRSTY_STATUSES, fullConfig);
  await createDivergedCase(prisma, kirstyPriest, KIRSTY_UNIT, [statuses.NOT_CHARGED, statuses.CHARGES_PENDING, statuses.CHARGED], fullConfig);

  // Cases awaiting a charging decision (not charged, needs review)
  await createReviewCase(prisma, kirstyPriest, 'Make charging decision', fullConfig);
  await createReviewCase(prisma, kirstyPriest, 'Make charging decision', fullConfig, false);

  return KIRSTY_STL_TASKS.length + KIRSTY_CTL_TASKS.length + 20 + 1 + 1 + 2;
}

module.exports = {
  seedKirstyCases
};
