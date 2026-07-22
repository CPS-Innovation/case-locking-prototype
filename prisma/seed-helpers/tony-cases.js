const { faker } = require('@faker-js/faker');
const statuses = require('../../app/data/case-statuses');
const { generateCaseReference } = require('./identifiers');
const { generateDocumentsData } = require('./documents');
const { createDivergedCase } = require('./diverged-cases');
const { addHearings } = require('./hearings');
const { nextForcedHasHearing } = require('./charged-hearing-balance');
const {
  generateTodaySTL,
  generateTomorrowSTL
} = require('./stl-generators');
const {
  generateLessThan1HourPACE,
  generateLessThan2HoursPACE
} = require('./pace-generators');
const { createDirectionsForCase } = require('./directions');
const { createCtlLogEntries } = require('./ctl-log-entries');
const TONY_UNITS = {
  DORSET_MAGISTRATES: 1,
  HAMPSHIRE_MAGISTRATES: 2,
  WESSEX_CROWN_COURT: 3,
  WESSEX_RASSO: 4,
  WESSEX_CCU: 5,
  WESSEX_FRAUD: 6,
  WILTSHIRE_MAGISTRATES: 7
};

const ALL_TONY_UNITS = Object.values(TONY_UNITS);

const CROWN_COURT_UNIT_IDS = [TONY_UNITS.WESSEX_CROWN_COURT, TONY_UNITS.WESSEX_RASSO];

const TONY_STATUSES = [
  statuses.NOT_CHARGED,
  statuses.CHARGES_PENDING,
  statuses.CHARGED,
  statuses.NOT_GUILTY,
  statuses.NO_FURTHER_ACTION,
  statuses.SENTENCED,
];

const MAGISTRATES_UNITS = [TONY_UNITS.DORSET_MAGISTRATES, TONY_UNITS.HAMPSHIRE_MAGISTRATES];
const CROWN_RASSO_UNITS = [TONY_UNITS.WESSEX_CROWN_COURT, TONY_UNITS.WESSEX_RASSO];
const CROWN_RASSO_CCU_UNITS = [TONY_UNITS.WESSEX_CROWN_COURT, TONY_UNITS.WESSEX_RASSO, TONY_UNITS.WESSEX_CCU];

// STL tasks (pre-charge, no hearing) - Dorset/Hampshire Magistrates only
const ADMIN_STL_TASKS = [
  { name: 'Check new PCD case', stlGenerator: generateTodaySTL, units: MAGISTRATES_UNITS, fixedStatus: statuses.NOT_CHARGED, fixedNeedsReview: true },
  { name: 'Check resubmitted PCD case', stlGenerator: generateTomorrowSTL, units: MAGISTRATES_UNITS, fixedStatus: statuses.NOT_CHARGED, fixedNeedsReview: true }
];

// PACE clock tasks (pre-charge, no hearing) - Dorset/Hampshire Magistrates only
const ADMIN_PACE_TASKS = [
  { name: 'Priority PCD review', paceGenerator: generateLessThan1HourPACE, units: MAGISTRATES_UNITS },
  { name: 'Priority resubmitted PCD case', paceGenerator: generateLessThan2HoursPACE, units: MAGISTRATES_UNITS }
];

const ADMIN_CTL_TASKS = [
  { name: 'Check new police info', hasCTL: true, units: ALL_TONY_UNITS },
  { name: 'Record Hg outcome', hasCTL: true, units: ALL_TONY_UNITS },
  { name: 'Finalise case', hasCTL: true, units: ALL_TONY_UNITS },
  { name: 'Check electronic upgrade file', hasCTL: true, units: ALL_TONY_UNITS },
  { name: 'Dispatch bundle', hasCTL: true, units: ALL_TONY_UNITS },
  { name: 'Prepare s51/allocation documents', hasCTL: true, units: CROWN_RASSO_CCU_UNITS },
  { name: 'Chase upgrade file', hasCTL: true, units: ALL_TONY_UNITS },
  { name: 'DCS dispatch error', hasCTL: true, units: CROWN_RASSO_UNITS },
  { name: 'Reminder - Please see ITA log', hasCTL: true, units: ALL_TONY_UNITS, isReminder: true },
  { name: 'Check new Crown Court case', hasCTL: true, units: CROWN_RASSO_UNITS },
  { name: 'Follow-up - case action plan item', hasCTL: true, units: ALL_TONY_UNITS }
];

async function getAdminPoolTeamForUnit(prisma, unitId) {
  const team = await prisma.team.findFirst({
    where: {
      unitId,
      name: 'Admin pool'
    }
  });
  return team;
}

async function createSTLCaseForAdminPool(prisma, taskConfig, config) {
  const { defenceLawyers, charges, firstNames, lastNames, victims, types, complexities, policeUnits, ukCities, availableOperationNames, documentNames, documentTypes } = config;
  const { name, stlGenerator, units, fixedStatus, fixedNeedsReview } = taskConfig;

  const unitId = faker.helpers.arrayElement(units);
  const statutoryTimeLimit = stlGenerator();

  const adminPoolTeam = await getAdminPoolTeamForUnit(prisma, unitId);
  if (!adminPoolTeam) {
    console.log(`⚠️ Admin pool team not found for unit ${unitId}`);
    return null;
  }

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
      unit: { connect: { id: unitId } },
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

  const adminStlStatus = fixedStatus || faker.helpers.arrayElement(TONY_STATUSES)
  await prisma.defendant.updateMany({
    where: { cases: { some: { id: _case.id } } },
    data: {
      status: adminStlStatus,
      needsReview: fixedStatus ? fixedNeedsReview : (adminStlStatus === statuses.NOT_CHARGED || (adminStlStatus === statuses.CHARGED && faker.datatype.boolean()))
    }
  });

  // Create task assigned to admin pool team (not to a user)
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
      assignedToTeamId: adminPoolTeam.id
    }
  });

  // Create directions
  await createDirectionsForCase(prisma, _case.id, defendant.id, faker.number.int({ min: 1, max: 3 }));

  return _case;
}

async function createPACECaseForAdminPool(prisma, taskConfig, config) {
  const { defenceLawyers, charges, firstNames, lastNames, victims, types, complexities, policeUnits, ukCities, availableOperationNames, documentNames, documentTypes } = config;
  const { name, paceGenerator, units } = taskConfig;

  const unitId = faker.helpers.arrayElement(units);
  const paceClock = paceGenerator();

  const adminPoolTeam = await getAdminPoolTeamForUnit(prisma, unitId);
  if (!adminPoolTeam) {
    console.log(`⚠️ Admin pool team not found for unit ${unitId}`);
    return null;
  }

  const defendant = await prisma.defendant.create({
    data: {
      firstName: faker.helpers.arrayElement(firstNames),
      lastName: faker.helpers.arrayElement(lastNames),
      gender: faker.helpers.arrayElement(['Male', 'Female', 'Unknown']),
      dateOfBirth: faker.date.birthdate({ min: 18, max: 75, mode: 'age' }),
      remandStatus: 'REMANDED_IN_CUSTODY',
      paceClock,
      defenceLawyer: { connect: { id: faker.helpers.arrayElement(defenceLawyers).id } },
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
      unit: { connect: { id: unitId } },
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

  const adminPaceStatus = faker.helpers.arrayElement(TONY_STATUSES)
  await prisma.defendant.updateMany({
    where: { cases: { some: { id: _case.id } } },
    data: { status: adminPaceStatus, needsReview: adminPaceStatus === statuses.NOT_CHARGED || (adminPaceStatus === statuses.CHARGED && faker.datatype.boolean()) }
  });
  if (adminPaceStatus === statuses.CHARGED) {
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

  // Create task assigned to admin pool team (not to a user)
  const dueDate = paceClock;
  await prisma.task.create({
    data: {
      name,
      reminderType: null,
      reminderDate: new Date(dueDate.getTime() - 1 * 60 * 60 * 1000), // 1 hour before for PACE
      dueDate,
      escalationDate: new Date(dueDate.getTime() + 1 * 60 * 60 * 1000),
      completedDate: null,
      caseId: _case.id,
      assignedToTeamId: adminPoolTeam.id
    }
  });

  // Create directions
  await createDirectionsForCase(prisma, _case.id, defendant.id, faker.number.int({ min: 1, max: 3 }));

  return _case;
}

async function createCTLCaseForAdminPool(prisma, taskConfig, config) {
  const { defenceLawyers, charges, firstNames, lastNames, pleas, victims, types, complexities, policeUnits, ukCities, availableOperationNames, documentNames, documentTypes, users } = config;
  const { name, units, isReminder } = taskConfig;

  const unitId = faker.helpers.arrayElement(units);
  const custodyTimeLimit = faker.date.soon({ days: 14 });
  custodyTimeLimit.setHours(23, 59, 59, 999);

  const adminPoolTeam = await getAdminPoolTeamForUnit(prisma, unitId);
  if (!adminPoolTeam) {
    console.log(`⚠️ Admin pool team not found for unit ${unitId}`);
    return null;
  }

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
      unit: { connect: { id: unitId } },
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

  const status = faker.helpers.arrayElement(TONY_STATUSES)
  await prisma.defendant.updateMany({
    where: { cases: { some: { id: _case.id } } },
    data: { status, needsReview: status === statuses.NOT_CHARGED || (status === statuses.CHARGED && faker.datatype.boolean()) }
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
  await addHearings(prisma, { caseId: _case.id, unitId, defendants: [defendant, ...extraDefendants], status })

  // Create task assigned to admin pool team (not to a user)
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
      assignedToTeamId: adminPoolTeam.id
    }
  });

  // Create directions
  await createDirectionsForCase(prisma, _case.id, defendant.id, faker.number.int({ min: 1, max: 3 }));

  if (users && users.length) {
    await createCtlLogEntries(prisma, _case.id, users);
  }

  return _case;
}

async function createColleagueCase(prisma, prosecutor, paralegalOfficer, config) {
  const { defenceLawyers, charges, firstNames, lastNames, pleas, victims, types, complexities, taskNames, policeUnits, ukCities, documentNames, documentTypes } = config;

  const unitId = faker.helpers.arrayElement(ALL_TONY_UNITS);

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
      unit: { connect: { id: unitId } },
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

  const status = faker.helpers.arrayElement(TONY_STATUSES)
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
  await addHearings(prisma, { caseId: _case.id, unitId, defendants: [defendant], status, forceHasHearing })

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

  const unitId = faker.helpers.arrayElement(ALL_TONY_UNITS);

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
      unit: { connect: { id: unitId } },
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

async function seedTonyCases(prisma, dependencies, config) {
  const { defenceLawyers, victims, policeUnits, availableOperationNames, users, colleagues } = dependencies;
  const { charges, firstNames, lastNames, pleas, types, complexities, taskNames, ukCities, documentNames, documentTypes } = config;

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
    documentTypes,
    users
  };

  let count = 0;

  // Create STL cases (pre-charge, no hearing)
  for (const taskConfig of ADMIN_STL_TASKS) {
    const result = await createSTLCaseForAdminPool(prisma, taskConfig, fullConfig);
    if (result) count++;
  }

  // Create PACE cases (pre-charge, no hearing)
  for (const taskConfig of ADMIN_PACE_TASKS) {
    const result = await createPACECaseForAdminPool(prisma, taskConfig, fullConfig);
    if (result) count++;
  }

  // Create CTL cases (with hearing where applicable)
  for (const taskConfig of ADMIN_CTL_TASKS) {
    const result = await createCTLCaseForAdminPool(prisma, taskConfig, fullConfig);
    if (result) count++;
  }

  // Create colleague cases
  for (let i = 0; i < 20; i++) {
    await createColleagueCase(prisma, colleagues.prosecutors[i], colleagues.paralegalOfficers[i], fullConfig);
    count++;
  }

  const tonyStark = await prisma.user.findFirst({ where: { firstName: 'Tony', lastName: 'Stark' } });
  if (tonyStark) {
    await createDivergedCase(prisma, tonyStark, faker.helpers.arrayElement(ALL_TONY_UNITS), TONY_STATUSES, fullConfig);
    count++;
    await createDivergedCase(prisma, tonyStark, faker.helpers.arrayElement(ALL_TONY_UNITS), [statuses.NOT_CHARGED, statuses.CHARGES_PENDING, statuses.CHARGED], fullConfig);
    count++;

    // Cases awaiting a charging decision (not charged, needs review)
    await createReviewCase(prisma, tonyStark, 'Make charging decision', fullConfig);
    count++;
    await createReviewCase(prisma, tonyStark, 'Make charging decision', fullConfig, false);
    count++;
  }

  return count;
}

module.exports = {
  seedTonyCases
};
