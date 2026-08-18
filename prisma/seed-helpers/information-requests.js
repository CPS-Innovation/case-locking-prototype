const { faker } = require('@faker-js/faker');
const statuses = require('../../app/data/case-statuses');

const ITEM_DESCRIPTIONS = [
  'Missing MG3',
  'No disclosure schedule (MG6C)',
  'No supervisors\' comments',
  'Missing suspect\'s previous convictions',
  'CCTV footage not provided',
  'Body-worn camera footage missing',
  'Witness statements incomplete',
  'Medical report not provided',
  'No summary of interview',
  'Missing exhibits list',
  'Third party material not provided',
  'Missing victim impact statement',
  'Forensic report not included',
  'No DV checklist',
  'Missing MG11s'
];

const REQUEST_DESCRIPTIONS = [
  'Several documents are missing from the file. Please supply them before the deadline.',
  'The file received is incomplete. Outstanding items are listed below.',
  'Further information is required to progress this case. Please provide the items listed.',
  'The initial submission was missing key evidence. Please supply the outstanding documents.',
  'This is a follow-up request for items not received in response to our previous letter.',
];

const ITEM_CATEGORIES = [
  'Documents and forms',
  'Footage',
  'Statements',
  'Forensic evidence',
  'Medical evidence',
  'Records',
  'Exhibits',
  'Other',
];

const CANCEL_REASONS = [
  'Evidence is no longer required following a change in charging decision.',
  'The case has been discontinued — this item is no longer needed.',
  'We obtained this document through other means.',
  'The defendant has pleaded guilty and this item is no longer required.',
];

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function seedInformationRequests(prisma) {
  const allCases = await prisma.case.findMany({
    where: {
      defendants: { none: { status: statuses.NOT_CHARGED } }
    },
    select: { id: true, defendants: { select: { id: true } } },
  });

  const shuffled = faker.helpers.shuffle(allCases);
  const selectedCases = shuffled.slice(0, 60);

  let count = 0;

  for (let i = 0; i < selectedCases.length; i++) {
    const caseId = selectedCases[i].id;
    const caseDefs = selectedCases[i].defendants;
    const scenario = i % 5;
    const description = faker.helpers.arrayElement(REQUEST_DESCRIPTIONS);

    const randomDefendants = () => {
      if (!caseDefs.length) return undefined;
      const picked = faker.helpers.arrayElements(caseDefs, faker.number.int({ min: 1, max: Math.min(2, caseDefs.length) }));
      return { connect: picked.map(d => ({ id: d.id })) };
    };

    if (scenario === 0) {
      // Pending: future due dates, no items received
      const sentDate = daysAgo(faker.number.int({ min: 5, max: 14 }));
      const itemDescriptions = faker.helpers.arrayElements(ITEM_DESCRIPTIONS, faker.number.int({ min: 2, max: 4 }));

      await prisma.informationRequest.create({
        data: {
          caseId,
          sentDate,
          description,
          items: {
            create: itemDescriptions.map((desc) => ({
              description: desc,
              defendants: randomDefendants(),
              category: faker.helpers.arrayElement(ITEM_CATEGORIES),
              dueDate: daysFromNow(faker.number.int({ min: 7, max: 21 })),
            })),
          },
        },
      });
      count++;
    } else if (scenario === 1) {
      // Pending overdue: past due dates, no items received
      const sentDate = daysAgo(faker.number.int({ min: 28, max: 56 }));
      const itemDescriptions = faker.helpers.arrayElements(ITEM_DESCRIPTIONS, faker.number.int({ min: 2, max: 5 }));

      await prisma.informationRequest.create({
        data: {
          caseId,
          sentDate,
          description,
          items: {
            create: itemDescriptions.map((desc) => ({
              description: desc,
              defendants: randomDefendants(),
              category: faker.helpers.arrayElement(ITEM_CATEGORIES),
              dueDate: daysAgo(faker.number.int({ min: 7, max: 21 })),
            })),
          },
        },
      });
      count++;
    } else if (scenario === 2) {
      // Mix of received and pending, one cancelled
      const sentDate = daysAgo(faker.number.int({ min: 14, max: 28 }));
      const allDescriptions = faker.helpers.arrayElements(ITEM_DESCRIPTIONS, faker.number.int({ min: 3, max: 5 }));
      const receivedDate = daysAgo(faker.number.int({ min: 2, max: 7 }));

      await prisma.informationRequest.create({
        data: {
          caseId,
          sentDate,
          description,
          items: {
            create: allDescriptions.map((desc, idx) => ({
              description: desc,
              defendants: randomDefendants(),
              category: faker.helpers.arrayElement(ITEM_CATEGORIES),
              dueDate: daysFromNow(faker.number.int({ min: 3, max: 14 })),
              receivedDate: idx === 0 ? receivedDate : null,
              cancelledDate: idx === 1 ? daysAgo(1) : null,
              cancelledReason: idx === 1 ? faker.helpers.arrayElement(CANCEL_REASONS) : null,
            })),
          },
        },
      });
      count++;
    } else if (scenario === 3) {
      // All received
      const sentDate = daysAgo(faker.number.int({ min: 21, max: 42 }));
      const receivedDate = daysAgo(faker.number.int({ min: 3, max: 14 }));
      const itemDescriptions = faker.helpers.arrayElements(ITEM_DESCRIPTIONS, faker.number.int({ min: 2, max: 4 }));

      await prisma.informationRequest.create({
        data: {
          caseId,
          sentDate,
          description,
          items: {
            create: itemDescriptions.map((desc) => ({
              description: desc,
              defendants: randomDefendants(),
              category: faker.helpers.arrayElement(ITEM_CATEGORIES),
              dueDate: daysAgo(faker.number.int({ min: 15, max: 30 })),
              receivedDate,
            })),
          },
        },
      });
      count++;
    } else {
      // Multiple requests: one fully received, one pending
      const sent1 = daysAgo(60);
      const received1 = daysAgo(50);
      const descriptions1 = faker.helpers.arrayElements(ITEM_DESCRIPTIONS, faker.number.int({ min: 2, max: 3 }));

      await prisma.informationRequest.create({
        data: {
          caseId,
          sentDate: sent1,
          description: faker.helpers.arrayElement(REQUEST_DESCRIPTIONS),
          items: {
            create: descriptions1.map((desc) => ({
              description: desc,
              defendants: randomDefendants(),
              category: faker.helpers.arrayElement(ITEM_CATEGORIES),
              dueDate: daysAgo(52),
              receivedDate: received1,
            })),
          },
        },
      });

      const sent2 = daysAgo(faker.number.int({ min: 5, max: 14 }));
      const descriptions2 = faker.helpers.arrayElements(ITEM_DESCRIPTIONS, faker.number.int({ min: 2, max: 4 }));

      await prisma.informationRequest.create({
        data: {
          caseId,
          sentDate: sent2,
          description: faker.helpers.arrayElement(REQUEST_DESCRIPTIONS),
          items: {
            create: descriptions2.map((desc) => ({
              description: desc,
              defendants: randomDefendants(),
              category: faker.helpers.arrayElement(ITEM_CATEGORIES),
              dueDate: daysFromNow(faker.number.int({ min: 7, max: 14 })),
            })),
          },
        },
      });
      count += 2;
    }
  }

  return count;
}

module.exports = { seedInformationRequests };
