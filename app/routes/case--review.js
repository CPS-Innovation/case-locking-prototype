const prisma = require('../lib/prisma')
const statuses = require('../data/case-statuses')
const hearingStatuses = require('../data/hearing-statuses')
const {
  findOrCreateReviewWithAnswers,
  getEligibleCharges,
  buildDecisionsMap,
  shapeInformationRequest,
  shapeFirstHearing,
  groupDocumentsByCategory,
} = require('../helpers/caseReview')
const { createInformationRequestFromSession } = require('../helpers/informationRequest')
const { groupElementsByCharge, groupAnnotationRows } = require('../helpers/documentAnnotations')
const { getDocumentPhotoUrls } = require('../helpers/documentContent')

function parseHearingTime(time) {
  const match = String(time || '').trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
  if (!match) return { hour: 10, minute: 0 }

  let hour = parseInt(match[1], 10)
  const minute = match[2] ? parseInt(match[2], 10) : 0
  const meridiem = match[3]?.toLowerCase()

  if (meridiem === 'pm' && hour < 12) hour += 12
  if (meridiem === 'am' && hour === 12) hour = 0

  return { hour, minute }
}

module.exports = (router) => {
  // Task list
  router.get('/cases/:caseId/review', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const userId = req.session.data.user.id

    const { _case, eligibleDefendants, charges } = await getEligibleCharges(prisma, caseId)

    const review = await findOrCreateReviewWithAnswers(prisma, caseId, userId)

    const documents = await prisma.document.findMany({
      where: { caseId },
      orderBy: { id: 'asc' }
    })

    const documentGroups = groupDocumentsByCategory(documents)

    const documentReviews = await prisma.caseReviewDocument.findMany({
      where: { caseReviewId: review.id },
      include: { annotations: { orderBy: { createdAt: 'asc' } } }
    })

    const docReviewMap = {}
    documentReviews.forEach(dr => { docReviewMap[dr.documentId] = dr })

    const decisions = buildDecisionsMap(review)
    const needsChargingDecision = eligibleDefendants.length > 0
    const chargingDecisionStarted = Object.keys(decisions).length > 0
    const chargingDecisionAllAnswered = needsChargingDecision && charges.every(charge => decisions[charge.id])

    const allElements = charges.flatMap(charge => charge.elements || [])
    const elementAssessed = element => element.strength && element.strength !== 'Not assessed'
    const strengthAssessmentStarted = allElements.some(elementAssessed)
    const strengthAssessmentAllAssessed = needsChargingDecision && allElements.length > 0 && allElements.every(elementAssessed)

    const informationRequest = shapeInformationRequest(review, _case.defendants)
    const reviewFirstHearing = shapeFirstHearing(review)

    res.render('cases/review/index', { _case, documentGroups, review, docReviewMap, needsChargingDecision, chargingDecisionStarted, chargingDecisionAllAnswered, strengthAssessmentStarted, strengthAssessmentAllAssessed, informationRequest, reviewFirstHearing })
  })

  // Check page
  router.get('/cases/:caseId/review/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const userId = req.session.data.user.id

    const { _case, eligibleDefendants, charges } = await getEligibleCharges(prisma, caseId)

    const review = await findOrCreateReviewWithAnswers(prisma, caseId, userId)

    const documents = await prisma.document.findMany({
      where: { caseId },
      orderBy: { id: 'asc' }
    })

    const documentGroups = groupDocumentsByCategory(documents)

    const documentReviews = await prisma.caseReviewDocument.findMany({
      where: { caseReviewId: review.id },
      include: {
        annotations: {
          include: { elements: { include: { element: { include: { charge: true } } } } }
        },
        redactions: true
      }
    })

    // Sort by position in the document so cards appear in the same order as
    // the marks on the document page, not the order they were created in
    const byDocumentPosition = (a, b) =>
      (a.paragraphIndex - b.paragraphIndex) ||
      (a.occurrenceIndex - b.occurrenceIndex) ||
      ((a.timestampSeconds || 0) - (b.timestampSeconds || 0)) ||
      (a.createdAt - b.createdAt)

    const documentsById = {}
    documents.forEach(document => { documentsById[document.id] = document })

    const docReviewMap = {}
    documentReviews.forEach(dr => {
      const photoUrl = getDocumentPhotoUrls(documentsById[dr.documentId])[0]

      // A selection spanning multiple paragraphs is stored as several
      // CaseReviewRedaction rows sharing one groupId (see getParagraphSelections
      // in annotation-panel.js) — collapse each group back into a single card.
      const redactionsByGroup = {}
      dr.redactions.forEach(redaction => {
        (redactionsByGroup[redaction.groupId] = redactionsByGroup[redaction.groupId] || []).push(redaction)
      })
      const redactionItems = Object.values(redactionsByGroup).map(rows => {
        const sorted = [...rows].sort((a, b) => (a.paragraphIndex - b.paragraphIndex) || (a.occurrenceIndex - b.occurrenceIndex))
        return { ...sorted[0], kind: 'redaction', selectedText: sorted.map(row => row.selectedText).join(' ') }
      })

      // A selection spanning multiple paragraphs is stored as several
      // CaseReviewAnnotation rows sharing one groupId too — collapse each
      // group back into a single card, same as redactions above.
      const items = [
        ...groupAnnotationRows(dr.annotations).map(annotation => ({
          ...annotation,
          kind: 'annotation',
          elementGroups: groupElementsByCharge(annotation.elements),
          photoUrl
        })),
        ...redactionItems
      ].sort(byDocumentPosition)
      docReviewMap[dr.documentId] = {
        ...dr,
        items,
        hasEvidence: dr.annotations.some(annotation => annotation.type === 'evidence')
      }
    })

    const decisions = buildDecisionsMap(review)
    const needsChargingDecision = eligibleDefendants.length > 0
    const chargeRows = charges.map(charge => ({ ...charge, decision: decisions[charge.id] }))
    const allChargesNoFurtherAction = needsChargingDecision && charges.every(charge => decisions[charge.id] === 'Do not charge')

    const informationRequest = shapeInformationRequest(review, _case.defendants)
    const reviewFirstHearing = shapeFirstHearing(review)

    res.render('cases/review/check', {
      _case,
      documentGroups,
      review,
      docReviewMap,
      needsChargingDecision,
      charges: chargeRows,
      showDefendantName: eligibleDefendants.length > 1,
      allChargesNoFurtherAction,
      informationRequest,
      reviewFirstHearing,
    })
  })

  // Submit review
  router.post('/cases/:caseId/review/submit', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const userId = req.session.data.user.id

    const { _case, eligibleDefendants, charges } = await getEligibleCharges(prisma, caseId)
    const reviewedDefendantIds = _case.defendants.map(d => d.id)

    const review = await findOrCreateReviewWithAnswers(prisma, caseId, userId)
    const decisions = buildDecisionsMap(review)

    for (const charge of charges) {
      if (decisions[charge.id]) {
        await prisma.charge.update({ where: { id: charge.id }, data: { status: decisions[charge.id] } })
      }
    }

    // CPS only ever states what the charges should be - it never charges a
    // defendant directly. A "Charge" or "Hold" decision on any of a
    // defendant's charges moves them to Charges pending; they only become
    // Charged once the police or referring agency send back authorised
    // charges. Only when every charge is "Do not charge" do they move to NFA.
    for (const defendant of eligibleDefendants) {
      const defendantDecisions = charges
        .filter(charge => charge.defendantId === defendant.id)
        .map(charge => decisions[charge.id])
        .filter(Boolean)

      let status
      if (defendantDecisions.some(d => d === 'Charge' || d === 'Hold until further evidence')) {
        status = statuses.CHARGES_PENDING
      } else if (defendantDecisions.length && defendantDecisions.every(d => d === 'Do not charge')) {
        status = statuses.NO_FURTHER_ACTION
      }

      await prisma.defendant.update({
        where: { id: defendant.id },
        data: { ...(status ? { status } : {}), needsReview: false },
      })
    }

    const reviewFirstHearing = shapeFirstHearing(review)
    const hasFirstHearing = (await prisma.hearing.count({
      where: { caseId, type: 'First hearing' },
    })) > 0

    if (!hasFirstHearing && reviewFirstHearing?.confirmed) {
      const { hearingDate, time, venue } = reviewFirstHearing
      const { hour, minute } = parseHearingTime(time)
      const startDate = new Date(hearingDate.year, hearingDate.month - 1, hearingDate.day, hour, minute, 0)

      const hearing = await prisma.hearing.create({
        data: {
          caseId,
          startDate,
          status: hearingStatuses.PREPARATION_NEEDED,
          type: 'First hearing',
          venue,
          defendants: {
            connect: reviewedDefendantIds.map(id => ({ id })),
          },
        },
      })

      const selectedDefendants = _case.defendants
        .filter(d => reviewedDefendantIds.includes(d.id))
        .map(d => ({ firstName: d.firstName, lastName: d.lastName }))

      await prisma.activityLog.create({
        data: {
          userId,
          model: 'Case',
          recordId: caseId,
          action: 'UPDATE',
          title: 'First hearing added',
          meta: {
            hearingEventType: 'added',
            hearingType: 'First hearing',
            hearingDate: hearing.startDate,
            venue,
            defendants: selectedDefendants,
          },
          caseId,
        },
      })
    }

    const informationRequest = shapeInformationRequest(review, _case.defendants)
    if (informationRequest?.complete && informationRequest?.wantsInformationRequest === 'yes') {
      await createInformationRequestFromSession(prisma, caseId, informationRequest, userId)
    }

    await prisma.caseReview.update({
      where: { id: review.id },
      data: {
        status: 'submitted',
        wantsInformationRequest: null,
        informationRequestDescription: null,
        informationRequestSentDate: null,
        informationRequestComplete: null,
        firstHearingDay: null,
        firstHearingMonth: null,
        firstHearingYear: null,
        firstHearingTime: null,
        firstHearingVenue: null,
        firstHearingConfirmed: null,
        chargeDecisions: { deleteMany: {} },
        informationRequestItems: { deleteMany: {} },
      },
    })

    const chargeDecisions = charges
      .filter(charge => decisions[charge.id])
      .map(charge => ({ description: charge.description, decision: decisions[charge.id] }))

    const elementStrengths = charges.flatMap(charge =>
      (charge.elements || []).map(element => ({
        charge: charge.description,
        element: element.description,
        strength: element.strength || 'Not assessed',
        reasoning: element.strengthReasoning || null,
      }))
    )

    const reviewMeta = {
      chargeDecisions,
      caseReviewId: review.id,
    }

    if (elementStrengths.length) {
      reviewMeta.elementStrengths = elementStrengths
    }

    if (review.summary) {
      reviewMeta.summary = review.summary
    }

    if (informationRequest?.complete && informationRequest?.wantsInformationRequest === 'yes') {
      reviewMeta.informationRequest = {
        description: informationRequest.description,
      }
    }

    await prisma.activityLog.create({
      data: {
        userId,
        model: 'Case',
        recordId: caseId,
        action: 'UPDATE',
        title: 'Review submitted',
        meta: reviewMeta,
        caseId,
      },
    })

    const referrer = req.session.data.caseReviewReferrer
    delete req.session.data.caseReviewReferrer

    req.flash('success', 'Review submitted')
    res.redirect(referrer || `/cases/${caseId}`)
  })
}
