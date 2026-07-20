const { faker } = require('@faker-js/faker');
const elementsByChargeCode = require('../../app/data/elements');
const { createDirectionsForCase } = require('./directions');
const { SIMON_UNITS } = require('./simon-cases');
const { findParagraphOccurrence } = require('./case-review-annotations');
const {
  WALKER_LOCATION,
  WALKER_ELEMENT_REASONINGS,
  WALKER_REVIEW_SUMMARY,
  WALKER_ANNOTATIONS,
  findOrCreateWalkerVictim,
  findWalkerPoliceUnit,
  createWalkerDefendant,
  createWalkerWitnesses,
  createWalkerDocuments
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

  const elements = [];
  const elementDescriptions = elementsByChargeCode[defendant.charges[0].chargeCode];
  for (const [index, description] of elementDescriptions.entries()) {
    const element = await prisma.element.create({
      data: {
        chargeId: defendant.charges[0].id,
        description,
        order: index,
        strength: 'Strong',
        strengthReasoning: WALKER_ELEMENT_REASONINGS[index]
      }
    });
    elements.push(element);
  }

  const review = await prisma.caseReview.create({
    data: {
      caseId: _case.id,
      userId: simonWhatley.id,
      status: 'in_progress',
      summary: WALKER_REVIEW_SUMMARY,
      summaryComplete: true,
      chargingDecisionComplete: true,
      strengthAssessmentComplete: true,
      wantsInformationRequest: 'no',
      informationRequestComplete: true,
      chargeDecisions: {
        create: { chargeId: defendant.charges[0].id, decision: 'Charge' }
      }
    }
  });

  const documents = await prisma.document.findMany({ where: { caseId: _case.id } });

  for (const document of documents) {
    const docReview = await prisma.caseReviewDocument.create({
      data: { caseReviewId: review.id, documentId: document.id, status: 'reviewed' }
    });

    // No information-request annotations - the review answers no to the
    // information request question.
    const annotations = WALKER_ANNOTATIONS.filter(annotation => annotation.documentName === document.name);

    for (const snippet of annotations) {
      const element = snippet.elementIndex != null ? elements[snippet.elementIndex] : null;
      const { paragraphIndex, occurrenceIndex } = findParagraphOccurrence(document, snippet.selectedText);

      const annotation = await prisma.caseReviewAnnotation.create({
        data: {
          caseReviewDocumentId: docReview.id,
          type: snippet.type,
          selectedText: snippet.selectedText,
          paragraphIndex,
          occurrenceIndex,
          note: element ? `${element.description}: ${snippet.note}` : snippet.note,
          timestampSeconds: snippet.timestampSeconds ?? null
        }
      });

      if (element) {
        await prisma.caseReviewAnnotationElement.create({
          data: {
            annotationId: annotation.id,
            elementId: element.id,
            reasoning: snippet.note
          }
        });
      }
    }
  }

  return 1;
}

module.exports = { seedSimonInProgressReview };
