const crypto = require('crypto')
const prisma = require('../lib/prisma')
const { generateDocumentContent, getDocumentPhotoUrls } = require('../helpers/documentContent')
const {
  findOrCreateReview,
  findOrCreateDocumentReview,
  resetReviewCompletionAfterOffenceChange,
  groupDocumentsByCategory,
} = require('../helpers/caseReview')
const { applyHighlights, applyRedactions, buildOffencesWithAnnotations, groupElementsByCharge, groupAnnotationRows } = require('../helpers/documentAnnotations')
const charges = require('../data/charges')
const elementsByChargeCode = require('../data/elements')

function formatTimestamp(totalSeconds) {
  const seconds = Math.max(0, Math.round(totalSeconds))
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

// Creates one CaseReviewAnnotation row per paragraph a selection touches, all
// sharing groupId. createMany can't be used here because the first created
// row's id is needed to attach CaseReviewAnnotationElement links to.
async function createAnnotationGroup(prisma, caseReviewDocumentId, groupId, type, note, timestampSeconds, userId, selections) {
  const rows = []
  for (const selection of selections) {
    rows.push(await prisma.caseReviewAnnotation.create({
      data: {
        caseReviewDocumentId,
        groupId,
        type,
        selectedText: selection.selectedText,
        paragraphIndex: parseInt(selection.paragraphIndex) || 0,
        occurrenceIndex: parseInt(selection.occurrenceIndex) || 0,
        note,
        timestampSeconds,
        userId
      }
    }))
  }
  return rows
}

async function loadAnnotationSidebarData(prisma, caseId, documentId, docReviewId) {
  const [_case, annotations] = await Promise.all([
    prisma.case.findUnique({
      where: { id: caseId },
      include: { defendants: { include: { charges: { include: { elements: { orderBy: { order: 'asc' } } } } } } }
    }),
    prisma.caseReviewAnnotation.findMany({
      where: { caseReviewDocumentId: docReviewId },
      orderBy: { createdAt: 'asc' },
      include: { elements: { include: { element: { include: { charge: true } } } } }
    })
  ])
  const defendantCharges = _case.defendants[0]?.charges || []
  const groupedAnnotations = groupAnnotationRows(annotations)
  const { offences, hasElements } = buildOffencesWithAnnotations(defendantCharges, groupedAnnotations, caseId, documentId)
  return { annotations, groupedAnnotations, offences, hasElements }
}

async function loadDocumentBodySections(prisma, document, docReviewId, annotations) {
  const redactions = await prisma.caseReviewRedaction.findMany({
    where: { caseReviewDocumentId: docReviewId },
    orderBy: { createdAt: 'asc' }
  })
  return applyRedactions(applyHighlights(generateDocumentContent(document), annotations), redactions)
}

function renderView(res, view, locals) {
  return new Promise((resolve, reject) => {
    res.render(view, locals, (err, html) => (err ? reject(err) : resolve(html)))
  })
}

async function respondWithAnnotationUpdate(req, res, prisma, { caseId, documentId, docReview, groupId }) {
  const document = await prisma.document.findUnique({ where: { id: documentId } })
  const { annotations, groupedAnnotations, offences, hasElements } = await loadAnnotationSidebarData(prisma, caseId, documentId, docReview.id)
  // Render just the inner content of the sidebar/document panes, not the
  // wrapper elements around them — the client swaps this into those wrappers'
  // existing `.html()`, so rendering the wrappers too would nest a duplicate
  // copy of them inside themselves.
  const sidebarHtml = await renderView(res, '_includes/review-variant-2/annotation-sidebar-inner.njk', {
    annotations: groupedAnnotations, offences, hasElements, caseId, documentId, user: req.session.data.user
  })

  const isTextDocument = !['MP4', 'MP3', 'JPG', 'PNG'].includes(document.type)
  const documentHtml = isTextDocument
    ? await renderView(res, 'cases/documents/_document-pane-text-inner.njk', {
        sections: await loadDocumentBodySections(prisma, document, docReview.id, annotations)
      })
    : null

  res.json({ sidebarHtml, documentHtml, annotationId: groupId })
}

// Redactions only affect the inline marks in the document body, not the
// sidebar, so this only needs to re-render the document pane.
async function respondWithRedactionUpdate(req, res, prisma, { documentId, docReviewId }) {
  const document = await prisma.document.findUnique({ where: { id: documentId } })
  const annotations = await prisma.caseReviewAnnotation.findMany({
    where: { caseReviewDocumentId: docReviewId },
    orderBy: { createdAt: 'asc' }
  })
  const documentHtml = await renderView(res, 'cases/documents/_document-pane-text-inner.njk', {
    sections: await loadDocumentBodySections(prisma, document, docReviewId, annotations)
  })

  res.json({ documentHtml })
}

// Combined "Material" page for the review-variant-2 flow: every document in
// the case on one page, instead of the existing flow's one-document-per-page
// review/documents/:documentId route (case--review--document.js). Every
// route below — including annotation/redaction add/edit/delete — is a
// dedicated variant-2 duplicate of its case--review--document.js
// counterpart so nothing in this flow ever points back at /review/....
module.exports = (router) => {
  router.get('/cases/:caseId/review-variant-2/material', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const userId = req.session.data.user.id

    const [_case, documents] = await Promise.all([
      prisma.case.findUnique({
        where: { id: caseId },
        include: { defendants: { include: { charges: { include: { elements: { orderBy: { order: 'asc' } } } } } } }
      }),
      prisma.document.findMany({ where: { caseId }, orderBy: { id: 'asc' } })
    ])

    const review = await findOrCreateReview(prisma, caseId, userId)
    const defendantCharges = _case.defendants[0]?.charges || []

    const { offences: pageOffences } = buildOffencesWithAnnotations(defendantCharges, [], caseId, null)

    // Batched find-or-create: one query for what already exists, one createMany
    // for what's missing, one re-fetch to get the created rows' real ids —
    // instead of a findFirst-then-maybe-create per document (which serializes
    // badly on SQLite once a case has more than a handful of documents).
    const documentIds = documents.map(document => document.id)

    const existingDocReviews = await prisma.caseReviewDocument.findMany({
      where: { caseReviewId: review.id, documentId: { in: documentIds } }
    })
    const existingDocumentIds = new Set(existingDocReviews.map(docReview => docReview.documentId))
    const missingDocumentIds = documentIds.filter(documentId => !existingDocumentIds.has(documentId))

    if (missingDocumentIds.length) {
      await prisma.caseReviewDocument.createMany({
        data: missingDocumentIds.map(documentId => ({ caseReviewId: review.id, documentId }))
      })
    }

    const docReviews = missingDocumentIds.length
      ? await prisma.caseReviewDocument.findMany({
          where: { caseReviewId: review.id, documentId: { in: documentIds } }
        })
      : existingDocReviews

    const notStartedIds = docReviews.filter(docReview => docReview.status === 'not_started').map(docReview => docReview.id)
    if (notStartedIds.length) {
      await prisma.caseReviewDocument.updateMany({
        where: { id: { in: notStartedIds } },
        data: { status: 'in_progress' }
      })
    }

    const docReviewByDocumentId = new Map(docReviews.map(docReview => [docReview.documentId, docReview]))
    const docReviewIds = docReviews.map(docReview => docReview.id)

    const isTextDocument = document => !['MP4', 'MP3', 'JPG', 'PNG'].includes(document.type)
    const textDocReviewIds = documents.filter(isTextDocument).map(document => docReviewByDocumentId.get(document.id).id)

    const [allAnnotations, allRedactions] = await Promise.all([
      prisma.caseReviewAnnotation.findMany({
        where: { caseReviewDocumentId: { in: docReviewIds } },
        orderBy: { createdAt: 'asc' },
        include: { elements: { include: { element: { include: { charge: true } } } } }
      }),
      prisma.caseReviewRedaction.findMany({
        where: { caseReviewDocumentId: { in: textDocReviewIds } },
        orderBy: { createdAt: 'asc' }
      })
    ])

    const annotationsByDocReviewId = new Map()
    allAnnotations.forEach(annotation => {
      const list = annotationsByDocReviewId.get(annotation.caseReviewDocumentId) || []
      list.push(annotation)
      annotationsByDocReviewId.set(annotation.caseReviewDocumentId, list)
    })

    const redactionsByDocReviewId = new Map()
    allRedactions.forEach(redaction => {
      const list = redactionsByDocReviewId.get(redaction.caseReviewDocumentId) || []
      list.push(redaction)
      redactionsByDocReviewId.set(redaction.caseReviewDocumentId, list)
    })

    const documentViews = documents.map(document => {
      const docReview = docReviewByDocumentId.get(document.id)

      const isVideo = document.type === 'MP4'
      const isAudio = document.type === 'MP3'
      const isPhoto = document.type === 'JPG' || document.type === 'PNG'

      const annotations = annotationsByDocReviewId.get(docReview.id) || []
      const groupedAnnotations = groupAnnotationRows(annotations)
      const redactions = (isVideo || isAudio || isPhoto) ? [] : (redactionsByDocReviewId.get(docReview.id) || [])

      const { offences, hasElements } = buildOffencesWithAnnotations(defendantCharges, groupedAnnotations, caseId, document.id)

      let sections = []
      if (!isVideo && !isAudio && !isPhoto) {
        const rawSections = generateDocumentContent(document)
        const annotatedSections = applyHighlights(rawSections, annotations)
        sections = applyRedactions(annotatedSections, redactions)
      }

      return {
        document,
        documentId: document.id,
        caseId,
        offences,
        hasElements,
        sections,
        annotations: groupedAnnotations,
        redactions,
        isVideo,
        isAudio,
        isPhoto,
        videoUrl: isVideo ? '/public/videos/cctv-placeholder.mp4' : null,
        audioUrl: isAudio ? '/public/audio/999-call-placeholder.mp3' : null,
        photoUrls: isPhoto ? getDocumentPhotoUrls(document) : null,
        documentBasePath: `/cases/${caseId}/review-variant-2/material/documents/${document.id}`,
        isReviewMode: true,
      }
    })

    const documentViewsById = {}
    documentViews.forEach(view => { documentViewsById[view.documentId] = view })

    const documentGroups = groupDocumentsByCategory(documents).map(group => ({
      heading: group.heading,
      documents: group.documents.map(document => documentViewsById[document.id])
    }))

    res.render('cases/review-variant-2/material/index', {
      _case,
      caseId,
      review,
      documentGroups,
      pageOffences,
      offenceBasePath: `/cases/${caseId}/review-variant-2/material`,
      user: req.session.data.user,
    })
  })

  // Mark whole material task as reviewed / in progress — a single status on
  // the review itself (CaseReview.materialStatus), not per document.
  router.post('/cases/:caseId/review-variant-2/material/mark-reviewed', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const userId = req.session.data.user.id

    const review = await findOrCreateReview(prisma, caseId, userId)
    await prisma.caseReview.update({ where: { id: review.id }, data: { materialStatus: 'reviewed' } })

    res.redirect(`/cases/${caseId}/review-variant-2`)
  })

  router.post('/cases/:caseId/review-variant-2/material/save-progress', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const userId = req.session.data.user.id

    const review = await findOrCreateReview(prisma, caseId, userId)
    await prisma.caseReview.update({ where: { id: review.id }, data: { materialStatus: 'in_progress' } })

    res.redirect(`/cases/${caseId}/review-variant-2`)
  })

  // Add offence — select offence
  router.get('/cases/:caseId/review-variant-2/material/add-offence', async (req, res) => {
    const caseId = parseInt(req.params.caseId)

    const _case = await prisma.case.findUnique({
      where: { id: caseId },
      include: { defendants: { include: { charges: true } } }
    })

    const existingChargeCodes = (_case.defendants[0]?.charges || []).map(c => c.chargeCode)

    if (req.query.reset || !req.session.data.addOffence) {
      req.session.data.addOffence = { chargeCodes: [] }
    }

    const offenceItems = charges
      .filter(c => !existingChargeCodes.includes(c.code))
      .map(c => ({ value: c.code, text: c.description }))

    res.render('cases/review-variant-2/add-offence/index', {
      _case, caseId, offenceItems, addOffence: req.session.data.addOffence,
      documentBasePath: `/cases/${caseId}/review-variant-2/material`
    })
  })

  router.post('/cases/:caseId/review-variant-2/material/add-offence', (req, res) => {
    const caseId = req.params.caseId

    const chargeCodes = req.body.addOffence?.chargeCodes
    req.session.data.addOffence = {
      ...req.session.data.addOffence,
      chargeCodes: chargeCodes ? [].concat(chargeCodes) : []
    }

    res.redirect(`/cases/${caseId}/review-variant-2/material/add-offence/check`)
  })

  // Add offence — check answers
  router.get('/cases/:caseId/review-variant-2/material/add-offence/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)

    const _case = await prisma.case.findUnique({ where: { id: caseId } })
    const addOffence = req.session.data.addOffence || {}
    const selectedCharges = charges.filter(c => (addOffence.chargeCodes || []).includes(c.code))

    res.render('cases/review-variant-2/add-offence/check', {
      _case, caseId, addOffence, selectedCharges,
      documentBasePath: `/cases/${caseId}/review-variant-2/material`
    })
  })

  router.post('/cases/:caseId/review-variant-2/material/add-offence/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const userId = req.session.data.user.id

    const _case = await prisma.case.findUnique({
      where: { id: caseId },
      include: { defendants: true }
    })
    const defendant = _case.defendants[0]

    const addOffence = req.session.data.addOffence || {}
    const selectedCharges = charges.filter(c => (addOffence.chargeCodes || []).includes(c.code))

    for (const selectedCharge of selectedCharges) {
      const charge = await prisma.charge.create({
        data: {
          chargeCode: selectedCharge.code,
          description: selectedCharge.description,
          status: 'Under review',
          offenceDate: new Date(),
          isCount: false,
          defendantId: defendant.id
        }
      })

      const elementDescriptions = elementsByChargeCode[selectedCharge.code] || []
      await prisma.element.createMany({
        data: elementDescriptions.map((description, index) => ({
          description,
          order: index,
          chargeId: charge.id
        }))
      })

      await prisma.activityLog.create({
        data: {
          userId,
          model: 'Case',
          recordId: caseId,
          action: 'CREATE',
          title: 'Offence added',
          meta: { description: selectedCharge.description },
          caseId
        }
      })
    }

    await resetReviewCompletionAfterOffenceChange(prisma, caseId, userId)

    delete req.session.data.addOffence

    res.redirect(`/cases/${caseId}/review-variant-2/material`)
  })

  // Change offence — select offence
  router.get('/cases/:caseId/review-variant-2/material/change-offence', async (req, res) => {
    const caseId = parseInt(req.params.caseId)

    const _case = await prisma.case.findUnique({
      where: { id: caseId },
      include: { defendants: { include: { charges: true } } }
    })

    const existingChargeCodes = (_case.defendants[0]?.charges || []).map(c => c.chargeCode)

    if (req.query.reset || !req.session.data.changeOffence) {
      req.session.data.changeOffence = { chargeCodes: existingChargeCodes }
    }

    const offenceItems = charges.map(c => ({ value: c.code, text: c.description }))

    res.render('cases/review-variant-2/change-offence/index', {
      _case, caseId, offenceItems, changeOffence: req.session.data.changeOffence,
      documentBasePath: `/cases/${caseId}/review-variant-2/material`
    })
  })

  router.post('/cases/:caseId/review-variant-2/material/change-offence', (req, res) => {
    const caseId = req.params.caseId

    const chargeCodes = req.body.changeOffence?.chargeCodes
    req.session.data.changeOffence = {
      ...req.session.data.changeOffence,
      chargeCodes: chargeCodes ? [].concat(chargeCodes) : []
    }

    res.redirect(`/cases/${caseId}/review-variant-2/material/change-offence/check`)
  })

  // Change offence — check answers
  router.get('/cases/:caseId/review-variant-2/material/change-offence/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)

    const _case = await prisma.case.findUnique({ where: { id: caseId } })
    const changeOffence = req.session.data.changeOffence || {}
    const selectedCharges = charges.filter(c => (changeOffence.chargeCodes || []).includes(c.code))

    res.render('cases/review-variant-2/change-offence/check', {
      _case, caseId, changeOffence, selectedCharges,
      documentBasePath: `/cases/${caseId}/review-variant-2/material`
    })
  })

  router.post('/cases/:caseId/review-variant-2/material/change-offence/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const userId = req.session.data.user.id

    const _case = await prisma.case.findUnique({
      where: { id: caseId },
      include: { defendants: { include: { charges: { include: { elements: true } } } } }
    })
    const defendant = _case.defendants[0]

    const changeOffence = req.session.data.changeOffence || {}
    const selectedCharges = charges.filter(c => (changeOffence.chargeCodes || []).includes(c.code))

    const existingChargeIds = defendant.charges.map(c => c.id)
    const existingElementIds = defendant.charges.flatMap(c => c.elements.map(e => e.id))

    await prisma.caseReviewAnnotationElement.deleteMany({ where: { elementId: { in: existingElementIds } } })
    await prisma.element.deleteMany({ where: { chargeId: { in: existingChargeIds } } })
    await prisma.charge.deleteMany({ where: { id: { in: existingChargeIds } } })

    for (const selectedCharge of selectedCharges) {
      const charge = await prisma.charge.create({
        data: {
          chargeCode: selectedCharge.code,
          description: selectedCharge.description,
          status: 'Under review',
          offenceDate: new Date(),
          isCount: false,
          defendantId: defendant.id
        }
      })

      const elementDescriptions = elementsByChargeCode[selectedCharge.code] || []
      await prisma.element.createMany({
        data: elementDescriptions.map((description, index) => ({
          description,
          order: index,
          chargeId: charge.id
        }))
      })

      await prisma.activityLog.create({
        data: {
          userId,
          model: 'Case',
          recordId: caseId,
          action: 'UPDATE',
          title: 'Offence changed',
          meta: { description: selectedCharge.description },
          caseId
        }
      })
    }

    await resetReviewCompletionAfterOffenceChange(prisma, caseId, userId)

    delete req.session.data.changeOffence

    res.redirect(`/cases/${caseId}/review-variant-2/material`)
  })

  // Remove offence — confirm GET
  router.get('/cases/:caseId/review-variant-2/material/offences/:chargeId/remove', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const chargeId = parseInt(req.params.chargeId)

    const [_case, charge] = await Promise.all([
      prisma.case.findUnique({ where: { id: caseId } }),
      prisma.charge.findUnique({ where: { id: chargeId }, include: { elements: true } })
    ])

    const elementIds = charge.elements.map(e => e.id)
    const linkedAnnotations = elementIds.length
      ? await prisma.caseReviewAnnotationElement.findMany({
          where: { elementId: { in: elementIds } },
          distinct: ['annotationId']
        })
      : []

    res.render('cases/review-variant-2/offence/remove', {
      _case,
      charge,
      caseId,
      linkedAnnotationCount: linkedAnnotations.length,
      documentBasePath: `/cases/${caseId}/review-variant-2/material`
    })
  })

  // Remove offence — POST
  router.post('/cases/:caseId/review-variant-2/material/offences/:chargeId/remove', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const chargeId = parseInt(req.params.chargeId)
    const userId = req.session.data.user.id

    const charge = await prisma.charge.findUnique({
      where: { id: chargeId },
      include: { elements: true }
    })
    const elementIds = charge.elements.map(e => e.id)

    await prisma.caseReviewAnnotationElement.deleteMany({ where: { elementId: { in: elementIds } } })
    await prisma.element.deleteMany({ where: { chargeId } })
    await prisma.charge.delete({ where: { id: chargeId } })

    await prisma.activityLog.create({
      data: {
        userId,
        model: 'Case',
        recordId: caseId,
        action: 'DELETE',
        title: 'Offence removed',
        meta: { description: charge.description },
        caseId
      }
    })

    await resetReviewCompletionAfterOffenceChange(prisma, caseId, userId)

    res.redirect(`/cases/${caseId}/review-variant-2/material`)
  })

  // Delete annotation — confirm GET (same data as case--review--document.js's
  // equivalent route, just landing back on the combined material page). A
  // selection spanning multiple paragraphs is stored as several
  // CaseReviewAnnotation rows sharing one groupId (see getParagraphSelections
  // in annotation-panel.js) — the whole group is treated as one annotation here.
  router.get('/cases/:caseId/review-variant-2/material/documents/:documentId/annotations/:groupId/delete', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const documentId = parseInt(req.params.documentId)
    const groupId = req.params.groupId

    const [_case, document, rows] = await Promise.all([
      prisma.case.findUnique({ where: { id: caseId } }),
      prisma.document.findUnique({ where: { id: documentId } }),
      prisma.caseReviewAnnotation.findMany({
        where: { groupId },
        orderBy: [{ paragraphIndex: 'asc' }, { occurrenceIndex: 'asc' }],
        include: { elements: { include: { element: { include: { charge: true } } } } }
      })
    ])

    const annotation = {
      ...rows[0],
      selectedText: rows.map(row => row.selectedText).join(' '),
      elementGroups: groupElementsByCharge(rows[0].elements),
      photoUrl: getDocumentPhotoUrls(document)[0]
    }

    res.render('cases/review-variant-2/annotations/delete', {
      _case, document, annotation, caseId, documentId,
      cancelHref: `/cases/${caseId}/review-variant-2/material#document-${documentId}`
    })
  })

  // Delete annotation — POST
  router.post('/cases/:caseId/review-variant-2/material/documents/:documentId/annotations/:groupId/delete', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const documentId = parseInt(req.params.documentId)
    const groupId = req.params.groupId

    const rows = await prisma.caseReviewAnnotation.findMany({ where: { groupId }, select: { id: true } })
    await prisma.caseReviewAnnotationElement.deleteMany({ where: { annotationId: { in: rows.map(row => row.id) } } })
    await prisma.caseReviewAnnotation.deleteMany({ where: { groupId } })

    res.redirect(`/cases/${caseId}/review-variant-2/material#document-${documentId}`)
  })

  // Add annotation
  router.post('/cases/:caseId/review-variant-2/material/documents/:documentId/annotations/add', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const documentId = parseInt(req.params.documentId)
    const userId = req.session.data.user.id

    const review = await findOrCreateReview(prisma, caseId, userId)
    const docReview = await findOrCreateDocumentReview(prisma, review.id, documentId)

    const { type } = req.body
    const timestampSeconds = req.body.timestampSeconds !== undefined && req.body.timestampSeconds !== ''
      ? parseFloat(req.body.timestampSeconds)
      : null

    const reasoningByElementId = req.body.elements || {}
    const elementIds = Object.keys(reasoningByElementId).map(id => parseInt(id))

    // A selection spanning multiple paragraphs arrives as one entry per
    // paragraph it touches (see getParagraphSelections in annotation-panel.js),
    // and is split into one row per entry sharing a groupId. Timestamp-based
    // annotations (video/audio/photo) aren't paragraph-based, so they're
    // always a single entry.
    const selections = timestampSeconds !== null
      ? [{ selectedText: formatTimestamp(timestampSeconds), paragraphIndex: 0, occurrenceIndex: 0 }]
      : JSON.parse(req.body.selections || '[]')
          .sort((a, b) => (a.paragraphIndex - b.paragraphIndex) || (a.occurrenceIndex - b.occurrenceIndex))

    let groupId = null

    // Evidence and issue are only linked to elements when some are selected —
    // if none exist yet (no offence added) they fall back to a plain note, same
    // as information-request, and can be linked later.
    if ((type === 'evidence' || type === 'issue') && selections.length && elementIds.length) {
      const elements = await prisma.element.findMany({
        where: { id: { in: elementIds } }
      })

      const note = elements
        .map(element => element.description + (reasoningByElementId[element.id] ? `: ${reasoningByElementId[element.id]}` : ''))
        .join('; ')

      groupId = crypto.randomUUID()
      const rows = await createAnnotationGroup(prisma, docReview.id, groupId, type, note, timestampSeconds, userId, selections)

      await prisma.caseReviewAnnotationElement.createMany({
        data: elements.map(element => ({
          annotationId: rows[0].id,
          elementId: element.id,
          reasoning: reasoningByElementId[element.id]
        }))
      })
    } else {
      const { note } = req.body
      if (selections.length && type && note) {
        groupId = crypto.randomUUID()
        await createAnnotationGroup(prisma, docReview.id, groupId, type, note, timestampSeconds, userId, selections)
      }
    }

    await respondWithAnnotationUpdate(req, res, prisma, {
      caseId, documentId, docReview, groupId
    })
  })

  // Edit annotation — POST
  // A selection spanning multiple paragraphs is stored as several
  // CaseReviewAnnotation rows sharing one groupId (see getParagraphSelections
  // in annotation-panel.js) — the whole group is edited as one annotation here.
  router.post('/cases/:caseId/review-variant-2/material/documents/:documentId/annotations/:groupId/edit', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const documentId = parseInt(req.params.documentId)
    const groupId = req.params.groupId
    const userId = req.session.data.user.id

    const review = await findOrCreateReview(prisma, caseId, userId)
    const docReview = await findOrCreateDocumentReview(prisma, review.id, documentId)

    const { linkAsType } = req.body
    const reasoningByElementId = req.body.elements || {}
    const elementIds = Object.keys(reasoningByElementId).map(id => parseInt(id))

    const rows = await prisma.caseReviewAnnotation.findMany({
      where: { groupId },
      orderBy: [{ paragraphIndex: 'asc' }, { occurrenceIndex: 'asc' }]
    })
    const primaryRowId = rows[0].id

    if (elementIds.length) {
      const elements = await prisma.element.findMany({
        where: { id: { in: elementIds } }
      })

      const note = elements
        .map(element => element.description + (reasoningByElementId[element.id] ? `: ${reasoningByElementId[element.id]}` : ''))
        .join('; ')

      await prisma.caseReviewAnnotationElement.deleteMany({ where: { annotationId: { in: rows.map(row => row.id) } } })
      await prisma.caseReviewAnnotationElement.createMany({
        data: elements.map(element => ({
          annotationId: primaryRowId,
          elementId: element.id,
          reasoning: reasoningByElementId[element.id]
        }))
      })

      // Linking a note to evidence or issue elements turns it into that
      // type - it stops being a plain note once it's carrying that structure.
      await prisma.caseReviewAnnotation.updateMany({
        where: { groupId },
        data: linkAsType ? { note, type: linkAsType } : { note }
      })
    } else {
      const { note } = req.body
      await prisma.caseReviewAnnotation.updateMany({
        where: { groupId },
        data: { note }
      })
    }

    await respondWithAnnotationUpdate(req, res, prisma, {
      caseId, documentId, docReview, groupId
    })
  })

  // Add redaction
  router.post('/cases/:caseId/review-variant-2/material/documents/:documentId/redactions/add', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const documentId = parseInt(req.params.documentId)
    const userId = req.session.data.user.id

    const review = await findOrCreateReview(prisma, caseId, userId)
    const docReview = await findOrCreateDocumentReview(prisma, review.id, documentId)

    // A selection spanning multiple paragraphs arrives as one entry per
    // paragraph it touches (see getParagraphSelections in annotation-panel.js),
    // since a redaction row can only reference a single paragraph.
    const selections = JSON.parse(req.body.redactions || '[]')
    if (selections.length) {
      const groupId = crypto.randomUUID()
      await prisma.caseReviewRedaction.createMany({
        data: selections.map(selection => ({
          caseReviewDocumentId: docReview.id,
          groupId,
          selectedText: selection.selectedText,
          paragraphIndex: parseInt(selection.paragraphIndex) || 0,
          occurrenceIndex: parseInt(selection.occurrenceIndex) || 0
        }))
      })
    }

    await respondWithRedactionUpdate(req, res, prisma, { documentId, docReviewId: docReview.id })
  })

  // Delete redaction — confirm GET
  // A single user selection can span multiple paragraphs, which is stored as
  // several CaseReviewRedaction rows sharing one groupId (see getParagraphSelections
  // in annotation-panel.js) — the whole group is treated as one redaction here.
  router.get('/cases/:caseId/review-variant-2/material/documents/:documentId/redactions/:groupId/delete', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const documentId = parseInt(req.params.documentId)
    const groupId = req.params.groupId

    const [_case, document, redactionRows] = await Promise.all([
      prisma.case.findUnique({ where: { id: caseId } }),
      prisma.document.findUnique({ where: { id: documentId } }),
      prisma.caseReviewRedaction.findMany({
        where: { groupId },
        orderBy: [{ paragraphIndex: 'asc' }, { occurrenceIndex: 'asc' }]
      })
    ])

    const redaction = { selectedText: redactionRows.map(row => row.selectedText).join(' ') }
    const from = req.query.from || 'document'

    res.render('cases/review-variant-2/redactions/delete', { _case, document, redaction, caseId, documentId, from })
  })

  // Delete redaction
  router.post('/cases/:caseId/review-variant-2/material/documents/:documentId/redactions/:groupId/delete', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const documentId = parseInt(req.params.documentId)
    const groupId = req.params.groupId
    const userId = req.session.data.user.id

    const review = await findOrCreateReview(prisma, caseId, userId)
    const docReview = await findOrCreateDocumentReview(prisma, review.id, documentId)

    await prisma.caseReviewRedaction.deleteMany({ where: { groupId, caseReviewDocumentId: docReview.id } })

    // The document page deletes redactions inline via AJAX (jQuery sets
    // X-Requested-With, so req.xhr is true there); the check page instead
    // posts a plain form and expects a redirect back.
    if (req.xhr) {
      await respondWithRedactionUpdate(req, res, prisma, { documentId, docReviewId: docReview.id })
    } else if (req.body.from === 'check') {
      res.redirect(`/cases/${caseId}/review-variant-2/check`)
    } else {
      res.redirect(`/cases/${caseId}/review-variant-2/material#document-${documentId}`)
    }
  })
}
