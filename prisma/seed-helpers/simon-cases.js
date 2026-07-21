const { faker } = require('@faker-js/faker');
const { generateCaseReference } = require('./identifiers');
const { generateDocumentsData } = require('./documents');
const { addHearings } = require('./hearings');
const { nextForcedHasHearing } = require('./charged-hearing-balance');
const { generateUKMobileNumber, generateUKLandlineNumber, generateUKPhoneNumber } = require('./phone-numbers');
const {
  generateTodaySTL,
  generateTomorrowSTL,
  generateThisWeekSTL
} = require('./stl-generators');
const { createDirectionsForCase } = require('./directions');
const { createCtlLogEntries } = require('./ctl-log-entries');
const {
  PALMER_LOCATION,
  findOrCreatePalmerVictim,
  findPalmerPoliceUnit,
  createPalmerDefendant,
  createPalmerWitnesses,
  createPalmerDocuments
} = require('./palmer-case');

const SIMON_UNITS = {
  NORTH_YORKSHIRE_MAGISTRATES_COURT: 9,
  SOUTH_YORKSHIRE_MAGISTRATES_COURT: 11,
  WEST_YORKSHIRE_MAGISTRATES_COURT: 13,
  HUMBERSIDE_MAGISTRATES_COURT: 18
};

const SIMON_UNITS_ARRAY = Object.values(SIMON_UNITS);

const statuses = require('../../app/data/case-statuses');

// All cases seeded here (Simon's and his colleagues') use the same offence: ABH (A02)
const SIMON_CHARGE = require('../../app/data/charges').find(charge => charge.code === 'A02');

const SIMON_STATUSES = [
  statuses.NOT_CHARGED,
  statuses.CHARGES_PENDING,
  statuses.CHARGED,
  statuses.NOT_GUILTY,
  statuses.SENTENCED,
  statuses.NO_FURTHER_ACTION,
];

// Cases where Simon is the prosecutor (CTL, many-statements) never roll
// Charges pending or needsReview at random - both counts on Simon's overview
// come entirely from dedicated guaranteed cases (see createReviewCase,
// seedSimonChargesPendingReview) so they stay stable across reseeds.
const SIMON_OWN_CASE_STATUSES = SIMON_STATUSES.filter(status => status !== statuses.CHARGES_PENDING);

// STL tasks (pre-charge, no hearing)
const SIMON_STL_TASKS = [
  { name: '5-day PCD review', stlGenerator: generateTodaySTL },
  { name: '28-day PCD review', stlGenerator: generateTomorrowSTL },
  { name: 'Further PCD review', stlGenerator: generateThisWeekSTL }
];

const SIMON_CTL_TASKS = [
  { name: 'Initial disclosure', hasCTL: true },
  { name: 'Reminder - RL, please see police response', hasCTL: true, isReminder: true },
  { name: 'Electronic upgrade file review', hasCTL: true },
  { name: 'Check new police info', hasCTL: true },
  { name: 'Check new correspondence', hasCTL: true },
  { name: 'CTL expiry imminent', hasCTL: true }
];

async function createWitness(prisma, caseId, config, forcedTypes = {}) {
  const { firstNames, lastNames, ukCities } = config;

  const allTypes = [
    "isVictim", "isKeyWitness", "isChild", "isExpert", "isInterpreter",
    "isPolice", "isProfessional", "isPrisoner", "isVulnerable", "isIntimidated"
  ];

  const numTypesWeighted = faker.helpers.weightedArrayElement([
    { weight: 30, value: 0 },
    { weight: 30, value: 1 },
    { weight: 25, value: 2 },
    { weight: 10, value: 3 },
    { weight: 4, value: 4 },
    { weight: 1, value: 5 }
  ]);

  const selectedTypes = faker.helpers.arrayElements(allTypes, numTypesWeighted);

  const witnessTypes = {
    isVictim: selectedTypes.includes("isVictim"),
    isKeyWitness: selectedTypes.includes("isKeyWitness"),
    isChild: selectedTypes.includes("isChild"),
    isExpert: selectedTypes.includes("isExpert"),
    isInterpreter: selectedTypes.includes("isInterpreter"),
    isPolice: selectedTypes.includes("isPolice"),
    isProfessional: selectedTypes.includes("isProfessional"),
    isPrisoner: selectedTypes.includes("isPrisoner"),
    isVulnerable: selectedTypes.includes("isVulnerable"),
    isIntimidated: selectedTypes.includes("isIntimidated"),
    ...forcedTypes
  };

  const isDcf = faker.datatype.boolean();

  const witness = await prisma.witness.create({
    data: {
      title: faker.helpers.arrayElement([null, "Mr", "Mrs", "Ms", "Dr", "Prof"]),
      firstName: faker.helpers.arrayElement(firstNames),
      lastName: faker.helpers.arrayElement(lastNames),
      dateOfBirth: faker.date.birthdate({ min: 18, max: 90, mode: "age" }),
      gender: faker.helpers.arrayElement(["Male", "Female", "Unknown"]),
      ethnicity: faker.helpers.arrayElement([
        null, "White", "Asian_or_Asian_British", "Black_or_Black_British",
        "Mixed", "Other", "Prefer_not_to_say"
      ]),
      preferredLanguage: faker.helpers.arrayElement(["English", "Welsh"]),
      isCpsContactAllowed: faker.datatype.boolean(),
      addressLine1: faker.helpers.arrayElement([null, faker.location.streetAddress()]),
      addressLine2: faker.helpers.arrayElement([null, faker.location.secondaryAddress()]),
      addressTown: faker.helpers.arrayElement([null, faker.helpers.arrayElement(ukCities)]),
      addressPostcode: faker.helpers.arrayElement([null, faker.location.zipCode("WD# #SF")]),
      mobileNumber: faker.helpers.arrayElement([null, generateUKMobileNumber()]),
      emailAddress: faker.helpers.arrayElement([null, faker.internet.email()]),
      preferredContactMethod: faker.helpers.arrayElement([null, "Email", "Phone", "Post"]),
      faxNumber: faker.helpers.arrayElement([null, generateUKLandlineNumber()]),
      homeNumber: faker.helpers.arrayElement([null, generateUKLandlineNumber()]),
      workNumber: faker.helpers.arrayElement([null, generateUKPhoneNumber()]),
      otherNumber: faker.helpers.arrayElement([null, generateUKPhoneNumber()]),
      ...witnessTypes,
      isAppearingInCourt: faker.helpers.arrayElement([false, null]),
      isRelevant: faker.datatype.boolean(),
      attendanceIssues: faker.helpers.arrayElement([null, faker.lorem.sentence()]),
      previousTransgressions: faker.helpers.arrayElement([null, faker.lorem.sentence()]),
      wasWarned: faker.datatype.boolean(),
      dcf: isDcf,
      courtAvailabilityStartDate: isDcf ? faker.date.future() : null,
      courtAvailabilityEndDate: isDcf ? faker.date.future() : null,
      victimCode: witnessTypes.isVictim ? "Learning disabilities" : null,
      victimExplained: witnessTypes.isVictim ? faker.datatype.boolean() : null,
      victimOfferResponse: witnessTypes.isVictim ? faker.helpers.arrayElement(["Not offered", "Declined", "Accepted"]) : null,
      caseId: caseId,
    },
  });

  return { witness, isDcf };
}

async function createSpecialMeasures(prisma, witnessId) {
  const numSpecialMeasures = faker.helpers.weightedArrayElement([
    { weight: 65, value: 1 },
    { weight: 10, value: 2 },
    { weight: 25, value: 0 }
  ]);

  const specialMeasureTypes = [
    "Screen Witness", "Pre-recorded Cross-examination (s.28)", "Evidence by Live Link",
    "Evidence in Private", "Removal of Wigs and Gowns", "Visually Recorded Interview",
    "Intermediary", "Communication Aids"
  ];

  const meetingUrls = [
    "https://teams.microsoft.com/l/meetup-join/19%3ameeting_example123",
    "https://zoom.us/j/1234567890",
    "https://meet.google.com/abc-defg-hij"
  ];

  const selectedTypes = faker.helpers.arrayElements(specialMeasureTypes, numSpecialMeasures);

  for (let sm = 0; sm < numSpecialMeasures; sm++) {
    const requiresMeeting = faker.datatype.boolean();
    await prisma.specialMeasure.create({
      data: {
        witnessId: witnessId,
        type: selectedTypes[sm],
        details: faker.lorem.sentence(),
        needs: faker.lorem.sentence(),
        requiresMeeting: requiresMeeting,
        meetingUrl: requiresMeeting ? faker.helpers.arrayElement(meetingUrls) : null,
        hasAppliedForReportingRestrictions: faker.datatype.boolean(),
      },
    });
  }
}

async function createVictimWitness(prisma, caseId, config) {
  const { witness, isDcf } = await createWitness(prisma, caseId, config, { isVictim: true });

  if (isDcf) {
    await createSpecialMeasures(prisma, witness.id);
  }

  return witness;
}

async function createSTLCase(prisma, user, taskConfig, config) {
  const { defenceLawyers, charges, firstNames, lastNames, pleas, victims, types, complexities, policeUnits, ukCities, availableOperationNames, documentNames, documentTypes } = config;
  const { name, stlGenerator } = taskConfig;

  const unitId = faker.helpers.arrayElement(SIMON_UNITS_ARRAY);
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
          chargeCode: SIMON_CHARGE.code,
          description: SIMON_CHARGE.description,
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

  await prisma.caseProsecutor.create({
    data: {
      caseId: _case.id,
      userId: user.id,
      isLead: true
    }
  });

  await prisma.defendant.updateMany({
    where: { cases: { some: { id: _case.id } } },
    data: { status: statuses.NOT_CHARGED, needsReview: false }
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

  await createVictimWitness(prisma, _case.id, config);

  return _case;
}

async function createCTLCase(prisma, user, taskConfig, config) {
  const { defenceLawyers, charges, firstNames, lastNames, pleas, victims, types, complexities, policeUnits, ukCities, availableOperationNames, documentNames, documentTypes } = config;
  const { name, isReminder } = taskConfig;

  const unitId = faker.helpers.arrayElement(SIMON_UNITS_ARRAY);
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
          chargeCode: SIMON_CHARGE.code,
          description: SIMON_CHARGE.description,
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

  const status = faker.helpers.arrayElement(SIMON_OWN_CASE_STATUSES)
  const needsReview = false
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
  await addHearings(prisma, { caseId: _case.id, unitId, defendants: [defendant], status, forceHasHearing })

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

  await createVictimWitness(prisma, _case.id, config);

  return _case;
}

async function createManyStatementsCase(prisma, user, config) {
  const { defenceLawyers, charges, firstNames, lastNames, pleas, victims, types, complexities, taskNames, policeUnits, ukCities, availableOperationNames, documentNames, documentTypes } = config;

  const defendant = await prisma.defendant.create({
    data: {
      firstName: faker.helpers.arrayElement(firstNames),
      lastName: faker.helpers.arrayElement(lastNames),
      gender: faker.helpers.arrayElement(["Male", "Female", "Unknown"]),
      dateOfBirth: faker.date.birthdate({ min: 18, max: 75, mode: "age" }),
      remandStatus: "REMANDED_IN_CUSTODY",
      paceClock: null,
      defenceLawyer: { connect: { id: faker.helpers.arrayElement(defenceLawyers).id } },
      charges: {
        create: {
          chargeCode: SIMON_CHARGE.code,
          description: SIMON_CHARGE.description,
          status: "Charged",
          offenceDate: faker.date.past(),
          plea: faker.helpers.arrayElement(pleas),
          custodyTimeLimit: null,
          statutoryTimeLimit: null,
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
      reference: '99SW100001/1',
      operationName,
      type: faker.helpers.arrayElement(types),
      complexity: faker.helpers.arrayElement(complexities),
      unit: { connect: { id: SIMON_UNITS.NORTH_YORKSHIRE_MAGISTRATES_COURT } },
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

  const status = faker.helpers.arrayElement(SIMON_OWN_CASE_STATUSES)
  const needsReview = false
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
  await addHearings(prisma, { caseId: _case.id, unitId: SIMON_UNITS.NORTH_YORKSHIRE_MAGISTRATES_COURT, defendants: [defendant], status, forceHasHearing })

  const dueDate = faker.date.soon({ days: 14 });
  dueDate.setHours(23, 59, 59, 999);
  await prisma.task.create({
    data: {
      name: faker.helpers.arrayElement(taskNames),
      reminderType: null,
      reminderDate: new Date(dueDate.getTime() - 3 * 24 * 60 * 60 * 1000),
      dueDate: dueDate,
      escalationDate: new Date(dueDate.getTime() + 2 * 24 * 60 * 60 * 1000),
      completedDate: null,
      caseId: _case.id,
      assignedToUserId: user.id
    }
  });

  // Create first witness "Aaron Abbott" with 10 statements (sorts first alphabetically)
  const aaronAbbott = await prisma.witness.create({
    data: {
      title: "Mr",
      firstName: "Aaron",
      lastName: "Abbott",
      dateOfBirth: faker.date.birthdate({ min: 18, max: 90, mode: "age" }),
      gender: "Male",
      ethnicity: "White",
      preferredLanguage: "English",
      isCpsContactAllowed: true,
      addressLine1: faker.location.streetAddress(),
      addressTown: faker.helpers.arrayElement(ukCities),
      addressPostcode: faker.location.zipCode("WD# #SF"),
      mobileNumber: generateUKMobileNumber(),
      emailAddress: faker.internet.email(),
      preferredContactMethod: "Email",
      isAppearingInCourt: null,
      isRelevant: true,
      dcf: false,
      caseId: _case.id,
    },
  });

  // Create 10 statements for Aaron Abbott
  for (let s = 0; s < 10; s++) {
    await prisma.witnessStatement.create({
      data: {
        witnessId: aaronAbbott.id,
        number: s + 1,
        receivedDate: faker.date.past(),
        isUsedAsEvidence: faker.helpers.arrayElement([true, false, null]),
        isMarkedAsSection9: null,
      },
    });
  }

  // Create 4 more witnesses with 0-2 statements each, the first always a victim
  for (let w = 0; w < 4; w++) {
    const { witness, isDcf } = await createWitness(prisma, _case.id, config, w === 0 ? { isVictim: true } : {});

    await prisma.witness.update({
      where: { id: witness.id },
      data: { isAppearingInCourt: null }
    });

    const numStatements = faker.number.int({ min: 0, max: 2 });
    for (let s = 0; s < numStatements; s++) {
      await prisma.witnessStatement.create({
        data: {
          witnessId: witness.id,
          number: s + 1,
          receivedDate: faker.date.past(),
          isUsedAsEvidence: faker.helpers.arrayElement([true, false, null]),
          isMarkedAsSection9: null,
        },
      });
    }

    if (isDcf) {
      await createSpecialMeasures(prisma, witness.id);
    }
  }

  // Create directions
  await createDirectionsForCase(prisma, _case.id, defendant.id, faker.number.int({ min: 1, max: 3 }));

  return _case;
}

async function createColleagueCase(prisma, prosecutor, paralegalOfficer, config) {
  const { defenceLawyers, charges, firstNames, lastNames, pleas, victims, types, complexities, taskNames, policeUnits, ukCities, documentNames, documentTypes } = config;

  const unitId = faker.helpers.arrayElement(SIMON_UNITS_ARRAY);

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
          chargeCode: SIMON_CHARGE.code,
          description: SIMON_CHARGE.description,
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

  await prisma.caseProsecutor.create({
    data: { caseId: _case.id, userId: prosecutor.id, isLead: true }
  });

  await prisma.caseParalegalOfficer.create({
    data: { caseId: _case.id, userId: paralegalOfficer.id }
  });

  const status = faker.helpers.arrayElement(SIMON_STATUSES)
  const needsReview = (status === statuses.NOT_CHARGED || status === statuses.CHARGED) && faker.datatype.boolean()
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

  await createVictimWitness(prisma, _case.id, config);

  return _case;
}

async function createReviewCase(prisma, user, taskName, config, { hasCharge = true, firstName, lastName } = {}) {
  const { types, complexities } = config;

  const unitId = faker.helpers.arrayElement(SIMON_UNITS_ARRAY);

  const defendant = await createPalmerDefendant(prisma, { hasCharge, firstName, lastName });
  const victim = await findOrCreatePalmerVictim(prisma);
  const policeUnit = await findPalmerPoliceUnit(prisma);

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

  await createPalmerWitnesses(prisma, _case.id);

  return _case;
}

async function seedSimonCases(prisma, dependencies, config) {
  const { defenceLawyers, victims, policeUnits, availableOperationNames, colleagues } = dependencies;
  const { charges, firstNames, lastNames, pleas, types, complexities, taskNames, ukCities, documentNames, documentTypes } = config;

  const simonWhatley = await prisma.user.findFirst({
    where: { firstName: 'Simon', lastName: 'Whatley' }
  });

  if (!simonWhatley) {
    console.log('⚠️ Simon Whatley not found, skipping Simon cases');
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
  for (const taskConfig of SIMON_STL_TASKS) {
    await createSTLCase(prisma, simonWhatley, taskConfig, fullConfig);
  }

  // Create CTL cases (with hearing)
  for (const taskConfig of SIMON_CTL_TASKS) {
    await createCTLCase(prisma, simonWhatley, taskConfig, fullConfig);
  }

  // Create the 10-statements case (5 witnesses, one with 10 statements)
  await createManyStatementsCase(prisma, simonWhatley, fullConfig);

  // Create colleague cases
  for (let i = 0; i < 20; i++) {
    await createColleagueCase(prisma, colleagues.prosecutors[i], colleagues.paralegalOfficers[i], fullConfig);
  }

  // Cases awaiting a charging decision (not charged, needs review) - same
  // supporting cast as the Palmer material (victim, police witnesses,
  // documents) but different defendants, so they don't read as duplicates
  // of the in-progress Palmer review seeded by seedSimonInProgressReview.
  // Together with that in-progress review, these three give Simon exactly
  // 4 cases needing review, regardless of the random status rolls above.
  await createReviewCase(prisma, simonWhatley, 'Make charging decision', fullConfig, { firstName: 'Marcus', lastName: 'Webb' });
  await createReviewCase(prisma, simonWhatley, 'Make charging decision', fullConfig, { firstName: 'Aisha', lastName: 'Coleman' });
  await createReviewCase(prisma, simonWhatley, 'Make charging decision', fullConfig, { firstName: 'Declan', lastName: 'Murphy' });

  return SIMON_STL_TASKS.length + SIMON_CTL_TASKS.length + 1 + 20 + 3;
}

module.exports = {
  seedSimonCases,
  createVictimWitness,
  SIMON_UNITS
};
