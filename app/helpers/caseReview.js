const statuses = require('../data/case-statuses')
const { formatDefendantNames } = require('./informationRequest')
const { groupElementsByCharge, joinSelectedTextByGroup } = require('./documentAnnotations')
const { getDocumentPhotoUrls } = require('./documentContent')
const categoryOrder = require('../data/document-categories')

// Material with categories is grouped under category headings, in the order
// a prosecutor would work through it. Uncategorised material renders as a
// single flat list.
function groupDocumentsByCategory(documents) {
  const categorised = documents.filter(document => document.category)
  const uncategorised = documents.filter(document => !document.category)

  const groups = categoryOrder
    .map(category => ({ heading: category, documents: categorised.filter(document => document.category === category) }))
    .filter(group => group.documents.length)

  if (uncategorised.length) {
    groups.push({ heading: groups.length ? 'Other material' : 'Material', documents: uncategorised })
  }

  return groups
}

// A case's review is shared - whoever opens it continues the same review
// rather than getting their own private copy, so document status and
// annotations are visible regardless of who is signed in.
//
// Falls back to the most recent review of any status when there's no
// in-progress one, so a submitted review's document annotations stay
// visible after the review that made them has been submitted.
async function getReview(prisma, caseId) {
  let review = await prisma.caseReview.findFirst({
    where: { caseId, status: 'in_progress' }
  })
  if (!review) {
    review = await prisma.caseReview.findFirst({
      where: { caseId },
      orderBy: { updatedAt: 'desc' }
    })
  }
  return review
}

async function createReview(prisma, caseId, userId) {
  return prisma.caseReview.create({
    data: { caseId, userId }
  })
}

async function findOrCreateReview(prisma, caseId, userId) {
  return (await getReview(prisma, caseId)) ?? (await createReview(prisma, caseId, userId))
}

async function findOrCreateReviewWithAnswers(prisma, caseId, userId) {
  const review = await findOrCreateReview(prisma, caseId, userId)
  return prisma.caseReview.findUnique({
    where: { id: review.id },
    include: {
      chargeDecisions: true,
      informationRequestItems: { include: { defendants: true }, orderBy: { createdAt: 'asc' } },
    },
  })
}

function buildDecisionsMap(review) {
  return Object.fromEntries(review.chargeDecisions.map(d => [d.chargeId, d.decision]))
}

// null is load-bearing: templates use "informationRequest present" to mean
// "task started" (In progress) vs absent (Not started).
function shapeInformationRequest(review, caseDefendants) {
  if (review.wantsInformationRequest == null) return null
  return {
    wantsInformationRequest: review.wantsInformationRequest,
    description: review.informationRequestDescription,
    sentDate: review.informationRequestSentDate,
    complete: review.informationRequestComplete,
    items: review.informationRequestItems.map(item => {
      const dueDate = { day: item.dueDay || '', month: item.dueMonth || '', year: item.dueYear || '' }
      const defendantIds = item.defendants.map(d => String(d.id))
      return {
        id: item.id,
        category: item.category,
        description: item.description,
        dueDate,
        defendants: defendantIds,
        defendantNames: formatDefendantNames(defendantIds, caseDefendants),
      }
    }),
  }
}

function shapeFirstHearing(review) {
  if (!review.firstHearingDay && !review.firstHearingTime && !review.firstHearingVenue) return null
  return {
    hearingDate: { day: review.firstHearingDay || '', month: review.firstHearingMonth || '', year: review.firstHearingYear || '' },
    time: review.firstHearingTime || '',
    venue: review.firstHearingVenue || '',
    confirmed: review.firstHearingConfirmed,
  }
}

async function findOrCreateDocumentReview(prisma, caseReviewId, documentId) {
  let docReview = await prisma.caseReviewDocument.findFirst({
    where: { caseReviewId, documentId }
  })
  if (!docReview) {
    docReview = await prisma.caseReviewDocument.create({
      data: { caseReviewId, documentId }
    })
  }
  return docReview
}

// Charges belonging to defendants who are still awaiting a charging decision
// this review, in a stable order (defendant order, then charge order).
async function getEligibleCharges(prisma, caseId) {
  const _case = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      defendants: {
        include: { charges: { include: { elements: { orderBy: { order: 'asc' } } } } }
      }
    },
  })

  const eligibleDefendants = _case.defendants.filter(d => d.status === statuses.NOT_CHARGED && d.needsReview)
  const charges = eligibleDefendants.flatMap(d => d.charges.map(charge => ({ ...charge, defendant: d })))

  return { _case, eligibleDefendants, charges }
}

// Evidence and issue annotations linked to an element, with enough
// included context to render annotation cards (source document, and every
// element each annotation is linked to).
async function getElementAnnotations(prisma, elementId) {
  const annotationLinks = await prisma.caseReviewAnnotationElement.findMany({
    where: { elementId, annotation: { type: { in: ['evidence', 'issue'] } } },
    orderBy: { createdAt: 'asc' },
    include: {
      annotation: {
        include: {
          caseReviewDocument: { include: { document: true } },
          elements: { include: { element: { include: { charge: true } } } }
        }
      }
    }
  })

  // Each link's annotation is the primary row of its group (see
  // groupAnnotationRows in documentAnnotations.js) - only that row carries
  // element links - so the full quote across every paragraph the selection
  // touched has to be looked up separately.
  const joinedByGroup = await joinSelectedTextByGroup(prisma, annotationLinks.map(link => link.annotation))

  return annotationLinks.map(link => ({
    ...link.annotation,
    selectedText: joinedByGroup.get(link.annotation.groupId) ?? link.annotation.selectedText,
    elementGroups: groupElementsByCharge(link.annotation.elements),
    photoUrl: getDocumentPhotoUrls(link.annotation.caseReviewDocument.document)[0]
  }))
}

// Offences (charges) can be added, changed or removed after the Charging
// decision or Strength assessment tasks have already been marked complete.
// When that happens, the recorded per-charge decisions and element strengths
// no longer reliably reflect the current charges, so reset completeness —
// the task list will then show "In progress" or "Not started" based on
// what's left, rather than staying "Completed". Decisions for charges that
// no longer exist are pruned automatically via the DB cascade on
// CaseReviewChargeDecision.chargeId.
async function resetReviewCompletionAfterOffenceChange(prisma, caseId, userId) {
  const review = await findOrCreateReview(prisma, caseId, userId)

  const resets = {}
  if (review.chargingDecisionComplete) resets.chargingDecisionComplete = false
  if (review.strengthAssessmentComplete) resets.strengthAssessmentComplete = false
  if (Object.keys(resets).length) {
    await prisma.caseReview.update({
      where: { id: review.id },
      data: resets,
    })
  }
}

module.exports = {
  getReview,
  createReview,
  findOrCreateReview,
  findOrCreateReviewWithAnswers,
  buildDecisionsMap,
  shapeInformationRequest,
  shapeFirstHearing,
  findOrCreateDocumentReview,
  getEligibleCharges,
  getElementAnnotations,
  resetReviewCompletionAfterOffenceChange,
  groupDocumentsByCategory,
}
