const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { addTimeLimitDates } = require('../helpers/timeLimit')
const { addCaseStatus } = require('../helpers/caseStatus')
const {
  ITEM_CATEGORIES,
  itemNumber,
  buildDefendantItems,
  buildDate,
  formatSessionDate,
  cleanDefendantIds,
  formatDefendantNames,
  createInformationRequestFromSession,
} = require('../helpers/informationRequest')

const ITEM_CATEGORY_OPTIONS = [
  { value: '', text: 'Select a category' },
  ...ITEM_CATEGORIES.map((c) => ({ value: c, text: c })),
]

const ITEM_CATEGORY_RADIO_ITEMS = ITEM_CATEGORIES.map((c) => ({ value: c, text: c }))

function getItemStatus(item) {
  if (item.cancelledDate) return 'Cancelled'
  if (item.receivedDate) return 'Received'
  return 'Pending'
}

function getInformationRequestStatus(request) {
  const statuses = request.items.map(getItemStatus)
  if (statuses.every(s => s === 'Cancelled')) return 'Cancelled'
  if (statuses.every(s => s === 'Received' || s === 'Cancelled')) return 'Received'
  return 'Pending'
}

function dateFields(date) {
  const d = new Date(date)
  return { day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() }
}

async function fetchCase(caseId) {
  const _case = await prisma.case.findUnique({
    where: { id: caseId },
    include: { defendants: { include: { charges: true } }, witnesses: true, dga: true },
  })
  addTimeLimitDates(_case)
  addCaseStatus(_case)
  return _case
}

module.exports = (router) => {
  // ─── Index ───────────────────────────────────────────────────────────────

  router.get('/cases/:caseId/information-requests', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const _case = await fetchCase(caseId)

    const informationRequests = await prisma.informationRequest.findMany({
      where: { caseId },
      include: { items: { orderBy: { createdAt: 'asc' } } },
      orderBy: { sentDate: 'desc' },
    })

    const informationRequestsWithStatus = informationRequests.map((request) => ({
      ...request,
      status: getInformationRequestStatus(request),
      items: request.items.map((item) => ({ ...item, status: getItemStatus(item) })),
    }))

    res.render('cases/information-requests/index', { _case, informationRequests: informationRequestsWithStatus })
  })

  // ─── New: step 1 — description ────────────────────────────────────────────

  router.get('/cases/:caseId/information-requests/new', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const _case = await fetchCase(caseId)
    res.render('cases/information-requests/new', { _case })
  })

  router.post('/cases/:caseId/information-requests/new', (req, res) => {
    const caseId = req.params.caseId
    req.session.data.newInformationRequest = {
      description: req.body.newInformationRequest?.description || '',
      sentDate: new Date().toISOString(),
      items: req.session.data.newInformationRequest?.items || [],
    }
    res.redirect(`/cases/${caseId}/information-requests/new/item`)
  })

  // ─── New: step 2 — add item ───────────────────────────────────────────────

  router.get('/cases/:caseId/information-requests/new/item', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const _case = await fetchCase(caseId)
    const items = req.session.data.newInformationRequest?.items || []
    res.render('cases/information-requests/new/item', {
      _case,
      itemNumber: itemNumber(items.length + 1),
      itemCategoryItems: ITEM_CATEGORY_RADIO_ITEMS,
      defendantItems: buildDefendantItems(_case.defendants),
    })
  })

  router.post('/cases/:caseId/information-requests/new/item', (req, res) => {
    const caseId = req.params.caseId
    if (!req.session.data.newInformationRequest) req.session.data.newInformationRequest = { items: [] }
    req.session.data.newInformationRequest.items.push(req.body.newInformationRequestItem)
    res.redirect(`/cases/${caseId}/information-requests/new/items`)
  })

  // ─── New: step 3 — add another / item list ────────────────────────────────

  router.get('/cases/:caseId/information-requests/new/items', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const _case = await fetchCase(caseId)
    const items = req.session.data.newInformationRequest?.items || []

    if (items.length === 0) {
      return res.redirect(`/cases/${caseId}/information-requests/new/item`)
    }

    const formattedItems = items.map((item) => ({
      ...item,
      formattedDueDate: formatSessionDate(item.dueDate),
      defendantNames: formatDefendantNames(item.defendants, _case.defendants),
    }))

    res.render('cases/information-requests/new/items', { _case, items: formattedItems })
  })

  router.post('/cases/:caseId/information-requests/new/items', (req, res) => {
    const caseId = req.params.caseId
    if (req.body.addAnother === 'yes') {
      res.redirect(`/cases/${caseId}/information-requests/new/item`)
    } else {
      res.redirect(`/cases/${caseId}/information-requests/new/check`)
    }
  })

  // ─── New: edit item ───────────────────────────────────────────────────────

  router.get('/cases/:caseId/information-requests/new/items/:index/edit', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const index = parseInt(req.params.index)
    const _case = await fetchCase(caseId)
    const item = req.session.data.newInformationRequest.items[index]
    res.render('cases/information-requests/new/item-edit', {
      _case,
      item,
      index,
      itemNumber: itemNumber(index + 1),
      itemCategoryItems: ITEM_CATEGORY_RADIO_ITEMS,
      defendantItems: buildDefendantItems(_case.defendants),
      selectedDefendantIds: cleanDefendantIds(item.defendants),
    })
  })

  router.post('/cases/:caseId/information-requests/new/items/:index/edit', (req, res) => {
    const caseId = req.params.caseId
    const index = parseInt(req.params.index)
    req.session.data.newInformationRequest.items[index] = req.body.newInformationRequestItem
    res.redirect(`/cases/${caseId}/information-requests/new/items`)
  })

  // ─── New: delete item ─────────────────────────────────────────────────────

  router.get('/cases/:caseId/information-requests/new/items/:index/delete', (req, res) => {
    const caseId = req.params.caseId
    const index = parseInt(req.params.index)
    req.session.data.newInformationRequest.items.splice(index, 1)
    res.redirect(`/cases/${caseId}/information-requests/new/items`)
  })

  // ─── New: check answers ───────────────────────────────────────────────────

  router.get('/cases/:caseId/information-requests/new/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const sessionData = req.session.data.newInformationRequest

    if (!sessionData) {
      return res.redirect(`/cases/${caseId}/information-requests/new`)
    }

    const _case = await fetchCase(caseId)

    const formattedSentDate = new Date(sessionData.sentDate)
      .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

    const formattedItems = sessionData.items.map((item) => ({
      ...item,
      formattedDueDate: formatSessionDate(item.dueDate),
      defendantNames: formatDefendantNames(item.defendants, _case.defendants),
    }))

    res.render('cases/information-requests/new/check', {
      _case,
      informationRequest: { ...sessionData, formattedSentDate, items: formattedItems },
    })
  })

  router.post('/cases/:caseId/information-requests/new/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)

    await createInformationRequestFromSession(
      prisma,
      caseId,
      req.session.data.newInformationRequest,
      req.session.data.user.id
    )

    delete req.session.data.newInformationRequest

    req.flash('success', 'Request sent')
    res.redirect(`/cases/${caseId}/information-requests`)
  })

  // ─── Simulate: information received ──────────────────────────────────────

  router.get('/cases/:caseId/information-requests/simulate-received', async (req, res) => {
    const caseId = parseInt(req.params.caseId)

    await prisma.informationRequestItem.updateMany({
      where: { informationRequest: { caseId }, receivedDate: null, cancelledDate: null },
      data: { receivedDate: new Date() },
    })

    await prisma.defendant.updateMany({
      where: { cases: { some: { id: caseId } } },
      data: { needsReview: true },
    })

    await prisma.activityLog.create({
      data: {
        userId: req.session.data.user.id,
        model: 'Case',
        recordId: caseId,
        action: 'UPDATE',
        title: 'Further information received',
        caseId,
      },
    })

    res.redirect(req.query.referrer || `/cases/${caseId}`)
  })

  // ─── Show ─────────────────────────────────────────────────────────────────

  router.get('/cases/:caseId/information-requests/:requestId', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const requestId = parseInt(req.params.requestId)

    const _case = await fetchCase(caseId)

    const informationRequest = await prisma.informationRequest.findUnique({
      where: { id: requestId },
      include: { items: { include: { defendants: true }, orderBy: { createdAt: 'asc' } } },
    })

    informationRequest.status = getInformationRequestStatus(informationRequest)
    informationRequest.items = informationRequest.items.map((item) => ({
      ...item,
      status: getItemStatus(item),
      defendantNames: item.defendants.map(d => `${d.firstName} ${d.lastName}`).join(', '),
    }))

    res.render('cases/information-requests/show', { _case, informationRequest })
  })

  // ─── Edit ─────────────────────────────────────────────────────────────────

  router.get('/cases/:caseId/information-requests/:requestId/edit', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const requestId = parseInt(req.params.requestId)

    const _case = await fetchCase(caseId)

    const informationRequest = await prisma.informationRequest.findUnique({
      where: { id: requestId },
      include: { items: { include: { defendants: true }, orderBy: { createdAt: 'asc' } } },
    })

    const sentDateFields = dateFields(informationRequest.sentDate)
    const itemsWithDateFields = informationRequest.items.map((item) => ({
      ...item,
      dueDateFields: dateFields(item.dueDate),
      selectedDefendantIds: item.defendants.map(d => String(d.id)),
    }))

    res.render('cases/information-requests/edit', {
      _case,
      itemCategoryOptions: ITEM_CATEGORY_OPTIONS,
      defendantItems: buildDefendantItems(_case.defendants),
      informationRequest: { ...informationRequest, sentDateFields, items: itemsWithDateFields },
    })
  })

  router.post('/cases/:caseId/information-requests/:requestId/edit', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const requestId = parseInt(req.params.requestId)
    const { description, sentDate, items } = req.body.informationRequest

    await prisma.informationRequest.update({
      where: { id: requestId },
      data: {
        description: description?.trim() || null,
        sentDate: buildDate(sentDate),
      },
    })

    const itemUpdates = [].concat(items || []).filter((item) => item.id)
    for (const item of itemUpdates) {
      await prisma.informationRequestItem.update({
        where: { id: parseInt(item.id) },
        data: {
          description: item.description.trim(),
          category: item.category || null,
          dueDate: buildDate(item.dueDate),
          defendants: {
            set: cleanDefendantIds(item.defendants).map(id => ({ id: parseInt(id) })),
          },
        },
      })
    }

    res.redirect(`/cases/${caseId}/information-requests/${requestId}`)
  })

  // ─── Mark received ────────────────────────────────────────────────────────

  router.get('/cases/:caseId/information-requests/:requestId/items/:itemId/mark-received', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const requestId = parseInt(req.params.requestId)
    const itemId = parseInt(req.params.itemId)

    const _case = await fetchCase(caseId)
    const item = await prisma.informationRequestItem.findUnique({ where: { id: itemId } })

    res.render('cases/information-requests/items/mark-received', { _case, requestId, item })
  })

  router.post('/cases/:caseId/information-requests/:requestId/items/:itemId/mark-received', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const requestId = parseInt(req.params.requestId)
    const itemId = parseInt(req.params.itemId)
    const { receivedDate } = req.body.markReceived

    await prisma.informationRequestItem.update({
      where: { id: itemId },
      data: { receivedDate: buildDate(receivedDate) },
    })

    res.redirect(`/cases/${caseId}/information-requests/${requestId}`)
  })

  // ─── Cancel item ──────────────────────────────────────────────────────────

  router.get('/cases/:caseId/information-requests/:requestId/items/:itemId/cancel', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const requestId = parseInt(req.params.requestId)
    const itemId = parseInt(req.params.itemId)

    const _case = await fetchCase(caseId)
    const item = await prisma.informationRequestItem.findUnique({ where: { id: itemId } })

    res.render('cases/information-requests/items/cancel', { _case, requestId, item })
  })

  router.post('/cases/:caseId/information-requests/:requestId/items/:itemId/cancel', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const requestId = parseInt(req.params.requestId)
    const itemId = parseInt(req.params.itemId)
    const { reason } = req.body.cancelItem

    await prisma.informationRequestItem.update({
      where: { id: itemId },
      data: { cancelledDate: new Date(), cancelledReason: reason },
    })

    res.redirect(`/cases/${caseId}/information-requests/${requestId}`)
  })
}
