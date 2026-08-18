const { faker } = require('@faker-js/faker');
const statuses = require('../../app/data/case-statuses');
const { addTimeLimitDates } = require('../../app/helpers/timeLimit');
const { addCaseStatus } = require('../../app/helpers/caseStatus');

// Constants
const reviewSummaries = [
  "Evidential test met on all charges - realistic prospect of conviction based on witness and forensic evidence.",
  "Full Code Test applied; public interest favours prosecution given the seriousness of the offence.",
  "Charging decision made following review of all disclosed material and witness statements.",
  "Sufficient evidence to charge - key witness account is consistent and supported by CCTV.",
  "Reviewed alongside investigating officer; evidential and public interest stages both satisfied.",
  "Decision made in line with CPS guidance on this offence category after considering all material."
];

const witnessNotAppearingReasons = [
  "Witness is ill and unable to attend",
  "Witness has moved abroad",
  "Witness is unavailable due to work commitments",
  "Witness has refused to attend",
  "Witness cannot be located",
  "Witness is intimidated and unwilling to testify",
  "Witness has conflicting court appearance",
  "Witness has withdrawn cooperation"
];

// Helper: Build context with pre-fetched data
async function buildCaseContext(prisma, fullCase) {
  // Pre-compute derived data
  const witnessesWithStatements = fullCase.witnesses?.filter(w => w.statements.length > 0) || [];

  return {
    fullCase,
    witnessesWithStatements
  };
}

// Helper: Determine possible events based on context
function getPossibleEvents(context) {
  const possible = [];

  if (context.fullCase.witnesses && context.fullCase.witnesses.length > 0) {
    possible.push('Witness marked as required to attend court');
    possible.push('Witness marked as not required to attend court');
  }

  if (context.witnessesWithStatements.length > 0) {
    possible.push('Witness statement marked as Section 9');
    possible.push('Witness statement unmarked as Section 9');
  }

  return possible;
}

// Event generators: One function per event type
const eventGenerators = {
  'Witness marked as required to attend court': (context, randomUser, eventDate) => {
    const witness = faker.helpers.arrayElement(context.fullCase.witnesses);

    return {
      userId: randomUser.id,
      caseId: context.fullCase.id,
      action: 'UPDATE',
      title: 'Witness marked as required to attend court',
      model: 'Witness',
      recordId: witness.id,
      createdAt: eventDate,
      meta: {
        witness: {
          id: witness.id,
          firstName: witness.firstName,
          lastName: witness.lastName
        }
      }
    };
  },

  'Witness marked as not required to attend court': (context, randomUser, eventDate) => {
    const witness = faker.helpers.arrayElement(context.fullCase.witnesses);

    return {
      userId: randomUser.id,
      caseId: context.fullCase.id,
      action: 'UPDATE',
      title: 'Witness marked as not required to attend court',
      model: 'Witness',
      recordId: witness.id,
      createdAt: eventDate,
      meta: {
        witness: {
          id: witness.id,
          firstName: witness.firstName,
          lastName: witness.lastName
        },
        reason: faker.helpers.arrayElement(witnessNotAppearingReasons)
      }
    };
  },

  'Witness statement marked as Section 9': (context, randomUser, eventDate) => {
    const witness = faker.helpers.arrayElement(context.witnessesWithStatements);
    const statement = faker.helpers.arrayElement(witness.statements);

    return {
      userId: randomUser.id,
      caseId: context.fullCase.id,
      action: 'UPDATE',
      title: 'Witness statement marked as Section 9',
      model: 'WitnessStatement',
      recordId: statement.id,
      createdAt: eventDate,
      meta: {
        witnessStatement: {
          id: statement.id,
          number: statement.number
        },
        witness: {
          id: witness.id,
          firstName: witness.firstName,
          lastName: witness.lastName
        }
      }
    };
  },

  'Witness statement unmarked as Section 9': (context, randomUser, eventDate) => {
    const witness = faker.helpers.arrayElement(context.witnessesWithStatements);
    const statement = faker.helpers.arrayElement(witness.statements);

    return {
      userId: randomUser.id,
      caseId: context.fullCase.id,
      action: 'UPDATE',
      title: 'Witness statement unmarked as Section 9',
      model: 'WitnessStatement',
      recordId: statement.id,
      createdAt: eventDate,
      meta: {
        witnessStatement: {
          id: statement.id,
          number: statement.number
        },
        witness: {
          id: witness.id,
          firstName: witness.firstName,
          lastName: witness.lastName
        }
      }
    };
  },

};

// Main seeding function
async function seedActivityLogs(prisma, cases, users) {
  // Select ~50% of cases to have activity logs
  const casesForActivity = faker.helpers.arrayElements(
    cases,
    Math.floor(cases.length * 0.5)
  );

  let totalActivityLogs = 0;

  for (const caseRef of casesForActivity) {
    // Fetch the full case with relations (ONCE per case)
    const fullCase = await prisma.case.findUnique({
      where: { id: caseRef.id },
      include: {
        prosecutors: {
          include: { user: true }
        },
        dga: true,
        witnesses: {
          include: {
            statements: true
          }
        }
      }
    });

    // Build context with pre-fetched data (3 queries, not 3*numEvents)
    const context = await buildCaseContext(prisma, fullCase);

    // Determine possible events based on context
    const possibleEvents = getPossibleEvents(context);
    if (possibleEvents.length === 0) continue;

    // Generate 1-6 events per case
    const numEvents = faker.number.int({ min: 1, max: 6 });

    // Generate chronologically sorted dates (over the last 6 months)
    const baseDates = [];
    for (let i = 0; i < numEvents; i++) {
      baseDates.push(faker.date.past({ years: 0.5 }));
    }
    baseDates.sort((a, b) => a - b);

    // Generate events
    const eventsToCreate = [];
    for (let i = 0; i < numEvents; i++) {
      const randomUser = faker.helpers.arrayElement(users);
      const eventDate = baseDates[i];
      const eventType = faker.helpers.arrayElement(possibleEvents);

      // Use generator function to create event data
      const generator = eventGenerators[eventType];
      const eventData = generator(context, randomUser, eventDate);

      eventsToCreate.push(eventData);
    }

    // Create all events for this case
    for (const eventData of eventsToCreate) {
      await prisma.activityLog.create({
        data: eventData
      });
      totalActivityLogs++;
    }
  }

  return totalActivityLogs;
}

// Gives every case its origin story: it arrived from the police force
// ("Case added"), a prosecutor was assigned ("Prosecutor added to case"),
// and, if a defendant has moved past Not charged, a review was submitted
// ("Review submitted"). Dates are generated in chronological order so the
// log reads as a real case journey.
async function seedCaseJourneyEvents(prisma, users) {
  const cases = await prisma.case.findMany({
    include: {
      unit: true,
      policeUnit: true,
      documents: true,
      prosecutors: { include: { user: true } },
      defendants: { include: { charges: { include: { elements: true } } } }
    }
  });

  let totalEvents = 0;

  for (const _case of cases) {
    addTimeLimitDates(_case);
    addCaseStatus(_case);

    const events = [];
    const now = new Date();
    const caseAddedDate = faker.date.past({ years: 1 });

    events.push({
      userId: null,
      caseId: _case.id,
      action: 'CREATE',
      title: 'Case added',
      model: 'Case',
      recordId: _case.id,
      createdAt: caseAddedDate,
      meta: {
        unit: _case.unit ? _case.unit.name : null,
        policeUnit: _case.policeUnit ? _case.policeUnit.name : null,
        custodyTimeLimit: _case.custodyTimeLimit,
        statutoryTimeLimit: _case.statutoryTimeLimit,
        paceClock: _case.paceClock,
        documents: _case.documents
          .filter(document => document.name !== 'Authorised charges (MG04)')
          .map(document => ({ name: document.name, category: document.category }))
      }
    });

    let cursor = caseAddedDate;

    if (_case.prosecutors.length > 0) {
      cursor = faker.date.between({ from: cursor, to: now });
      const prosecutorAssignment = faker.helpers.arrayElement(_case.prosecutors);
      const prosecutor = prosecutorAssignment.user;

      events.push({
        userId: faker.helpers.arrayElement(users).id,
        caseId: _case.id,
        action: 'UPDATE',
        title: 'Prosecutor added to case',
        model: 'Case',
        recordId: _case.id,
        createdAt: cursor,
        meta: {
          prosecutor: {
            id: prosecutor.id,
            firstName: prosecutor.firstName,
            lastName: prosecutor.lastName
          }
        }
      });
    }

    const hasBeenReviewed = _case.defendants.some(defendant => defendant.status && defendant.status !== statuses.NOT_CHARGED);

    if (hasBeenReviewed) {
      cursor = faker.date.between({ from: cursor, to: now });
      const caseCharges = _case.defendants.flatMap(defendant => defendant.charges);
      const chargeDecisions = caseCharges
        .map(charge => ({ description: charge.description, decision: 'Charge' }));

      const elementStrengths = caseCharges.flatMap(charge =>
        (charge.elements || []).map(element => ({
          charge: charge.description,
          element: element.description,
          strength: element.strength || 'Not assessed',
          reasoning: element.strengthReasoning || null
        }))
      );

      const reviewMeta = {
        chargeDecisions,
        summary: faker.helpers.arrayElement(reviewSummaries)
      };

      if (elementStrengths.length) {
        reviewMeta.elementStrengths = elementStrengths;
      }

      events.push({
        userId: faker.helpers.arrayElement(users).id,
        caseId: _case.id,
        action: 'UPDATE',
        title: 'Review submitted',
        model: 'Case',
        recordId: _case.id,
        createdAt: cursor,
        meta: reviewMeta
      });
    }

    for (const eventData of events) {
      await prisma.activityLog.create({ data: eventData });
      totalEvents++;
    }
  }

  return totalEvents;
}

module.exports = {
  seedActivityLogs,
  seedCaseJourneyEvents
};
