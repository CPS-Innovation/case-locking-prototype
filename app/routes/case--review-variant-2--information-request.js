const prisma = require('../lib/prisma')
const _ = require('lodash')
const {
  ITEM_CATEGORIES,
  itemNumber,
  buildDefendantItems,
  cleanDefendantIds,
} = require('../helpers/informationRequest')
const { findOrCreateReview, findOrCreateReviewWithAnswers, shapeInformationRequest } = require('../helpers/caseReview')

const ITEM_CATEGORY_RADIO_ITEMS = ITEM_CATEGORIES.map((c) => ({ value: c, text: c }))

async function fetchCase(caseId) {
  return prisma.case.findUnique({
    where: { id: caseId },
    include: { defendants: true },
  })
}

async function getInformationRequestNotes(reviewId) {
  return prisma.caseReviewAnnotation.findMany({
    where: { type: 'information-request', caseReviewDocument: { caseReviewId: reviewId } },
    include: { caseReviewDocument: { include: { document: true } } },
  })
}

function groupNotesByMaterial(notes) {
  return _.chain(notes)
    .groupBy((note) => note.caseReviewDocument.document.id)
    .map((notes) => ({ material: notes[0].caseReviewDocument.document, notes }))
    .value()
}

module.exports = (router) => {
  // ─── Step 0 — do you want to request information? ───────────────────────────

  router.get('/cases/:caseId/review-variant-2/information-request', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const _case = await fetchCase(caseId)
    const review = await findOrCreateReview(prisma, caseId, req.session.data.user.id)
    const notes = await getInformationRequestNotes(review.id)
    res.render('cases/review-variant-2/information-request/index', {
      _case,
      informationRequest: { wantsInformationRequest: review.wantsInformationRequest },
      notes,
      materialGroups: groupNotesByMaterial(notes),
    })
  })

  router.post('/cases/:caseId/review-variant-2/information-request', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const wantsInformationRequest = req.body.wantsInformationRequest
    const review = await findOrCreateReview(prisma, caseId, req.session.data.user.id)
    await prisma.caseReview.update({
      where: { id: review.id },
      data: { wantsInformationRequest },
    })

    if (wantsInformationRequest === 'yes') {
      return res.redirect(`/cases/${caseId}/review-variant-2/information-request/description`)
    }

    res.redirect(`/cases/${caseId}/review-variant-2/information-request/check`)
  })

  // ─── Step 1 — description ──────────────────────────────────────────────────

  router.get('/cases/:caseId/review-variant-2/information-request/description', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const _case = await fetchCase(caseId)
    const review = await findOrCreateReview(prisma, caseId, req.session.data.user.id)
    res.render('cases/review-variant-2/information-request/description', {
      _case,
      informationRequest: { description: review.informationRequestDescription },
    })
  })

  router.post('/cases/:caseId/review-variant-2/information-request/description', async (req, res) => {
    const caseId = req.params.caseId
    const review = await findOrCreateReview(prisma, parseInt(caseId), req.session.data.user.id)
    await prisma.caseReview.update({
      where: { id: review.id },
      data: {
        informationRequestDescription: req.body.reviewInformationRequest?.description || '',
        informationRequestSentDate: new Date(),
      },
    })
    res.redirect(`/cases/${caseId}/review-variant-2/information-request/item`)
  })

  // ─── Step 2 — add item ──────────────────────────────────────────────────────

  router.get('/cases/:caseId/review-variant-2/information-request/item', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const _case = await fetchCase(caseId)
    const review = await findOrCreateReview(prisma, caseId, req.session.data.user.id)
    const itemCount = await prisma.caseReviewInformationRequestItem.count({
      where: { caseReviewId: review.id },
    })
    res.render('cases/review-variant-2/information-request/item', {
      _case,
      itemNumber: itemNumber(itemCount + 1),
      itemCategoryItems: ITEM_CATEGORY_RADIO_ITEMS,
      defendantItems: buildDefendantItems(_case.defendants),
    })
  })

  router.post('/cases/:caseId/review-variant-2/information-request/item', async (req, res) => {
    const caseId = req.params.caseId
    const review = await findOrCreateReview(prisma, parseInt(caseId), req.session.data.user.id)
    const { category, description, dueDate, defendants } = req.body.reviewInformationRequestItem
    await prisma.caseReviewInformationRequestItem.create({
      data: {
        caseReviewId: review.id,
        category: category || null,
        description: description || '',
        dueDay: dueDate?.day || null,
        dueMonth: dueDate?.month || null,
        dueYear: dueDate?.year || null,
        defendants: { connect: cleanDefendantIds(defendants).map(id => ({ id: parseInt(id) })) },
      },
    })
    res.redirect(`/cases/${caseId}/review-variant-2/information-request/items`)
  })

  // ─── Step 3 — add another / item list ──────────────────────────────────────

  router.get('/cases/:caseId/review-variant-2/information-request/items', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const _case = await fetchCase(caseId)
    const review = await findOrCreateReviewWithAnswers(prisma, caseId, req.session.data.user.id)
    const draft = shapeInformationRequest(review, _case.defendants)

    if (!draft || draft.items.length === 0) {
      return res.redirect(`/cases/${caseId}/review-variant-2/information-request/item`)
    }

    res.render('cases/review-variant-2/information-request/items', { _case, items: draft.items })
  })

  router.post('/cases/:caseId/review-variant-2/information-request/items', (req, res) => {
    const caseId = req.params.caseId
    if (req.body.addAnother === 'yes') {
      res.redirect(`/cases/${caseId}/review-variant-2/information-request/item`)
    } else {
      res.redirect(`/cases/${caseId}/review-variant-2/information-request/check`)
    }
  })

  // ─── Edit item ──────────────────────────────────────────────────────────────

  router.get('/cases/:caseId/review-variant-2/information-request/items/:itemId/edit', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const itemId = parseInt(req.params.itemId)
    const _case = await fetchCase(caseId)
    const review = await findOrCreateReviewWithAnswers(prisma, caseId, req.session.data.user.id)
    const draft = shapeInformationRequest(review, _case.defendants)
    const itemIndex = draft.items.findIndex(item => item.id === itemId)
    const item = draft.items[itemIndex]

    res.render('cases/review-variant-2/information-request/item-edit', {
      _case,
      item,
      itemId,
      itemNumber: itemNumber(itemIndex + 1),
      itemCategoryItems: ITEM_CATEGORY_RADIO_ITEMS,
      defendantItems: buildDefendantItems(_case.defendants),
      selectedDefendantIds: item.defendants,
    })
  })

  router.post('/cases/:caseId/review-variant-2/information-request/items/:itemId/edit', async (req, res) => {
    const caseId = req.params.caseId
    const itemId = parseInt(req.params.itemId)
    const { category, description, dueDate, defendants } = req.body.reviewInformationRequestItem
    await prisma.caseReviewInformationRequestItem.update({
      where: { id: itemId },
      data: {
        category: category || null,
        description: description || '',
        dueDay: dueDate?.day || null,
        dueMonth: dueDate?.month || null,
        dueYear: dueDate?.year || null,
        defendants: { set: cleanDefendantIds(defendants).map(id => ({ id: parseInt(id) })) },
      },
    })
    res.redirect(`/cases/${caseId}/review-variant-2/information-request/items`)
  })

  // ─── Delete item ────────────────────────────────────────────────────────────

  router.get('/cases/:caseId/review-variant-2/information-request/items/:itemId/delete', async (req, res) => {
    const caseId = req.params.caseId
    const itemId = parseInt(req.params.itemId)
    await prisma.caseReviewInformationRequestItem.delete({ where: { id: itemId } })
    res.redirect(`/cases/${caseId}/review-variant-2/information-request/items`)
  })

  // ─── Check answers ──────────────────────────────────────────────────────────
  // The information request itself isn't created until the review is
  // submitted, see /review/submit.

  router.get('/cases/:caseId/review-variant-2/information-request/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const _case = await fetchCase(caseId)
    const review = await findOrCreateReviewWithAnswers(prisma, caseId, req.session.data.user.id)
    const draft = shapeInformationRequest(review, _case.defendants)

    if (!draft) {
      return res.redirect(`/cases/${caseId}/review-variant-2/information-request`)
    }

    const formattedSentDate = draft.sentDate
      ? new Date(draft.sentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : ''

    res.render('cases/review-variant-2/information-request/check', {
      _case,
      informationRequest: { ...draft, formattedSentDate },
    })
  })

  router.post('/cases/:caseId/review-variant-2/information-request/check', async (req, res) => {
    const caseId = req.params.caseId
    const review = await findOrCreateReview(prisma, parseInt(caseId), req.session.data.user.id)
    await prisma.caseReview.update({
      where: { id: review.id },
      data: { informationRequestComplete: req.body.complete === 'yes' },
    })
    res.redirect(`/cases/${caseId}/review-variant-2`)
  })
}
