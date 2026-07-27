const _ = require('lodash')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { generateDocumentContent, getDocumentPhotoUrls } = require('../helpers/documentContent')
const { findOrCreateReview, findOrCreateDocumentReview, getElementAnnotations, resetReviewCompletionAfterOffenceChange } = require('../helpers/caseReview')
const { applyHighlights, applyRedactions, buildOffencesWithAnnotations, groupElementsByCharge } = require('../helpers/documentAnnotations')
const charges = require('../data/charges')
const elementsByChargeCode = require('../data/elements')

function formatTimestamp(totalSeconds) {
  const seconds = Math.max(0, Math.round(totalSeconds))
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
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
  const { offences, hasElements } = buildOffencesWithAnnotations(defendantCharges, annotations, caseId, documentId)
  return { annotations, offences, hasElements }
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

async function respondWithAnnotationUpdate(req, res, prisma, { caseId, documentId, docReview, annotationId }) {
  const document = await prisma.document.findUnique({ where: { id: documentId } })
  const { annotations, offences, hasElements } = await loadAnnotationSidebarData(prisma, caseId, documentId, docReview.id)
  // Render just the inner content of the sidebar/document panes, not the
  // wrapper elements around them — the client swaps this into those wrappers'
  // existing `.html()`, so rendering the wrappers too would nest a duplicate
  // copy of them inside themselves.
  const sidebarHtml = await renderView(res, '_includes/review/annotation-sidebar-inner.njk', {
    annotations, offences, hasElements, caseId, documentId, user: req.session.data.user
  })

  const isTextDocument = !['MP4', 'MP3', 'JPG', 'PNG'].includes(document.type)
  const documentHtml = isTextDocument
    ? await renderView(res, 'cases/documents/_document-pane-text-inner.njk', {
        sections: await loadDocumentBodySections(prisma, document, docReview.id, annotations)
      })
    : null

  res.json({ sidebarHtml, documentHtml, annotationId })
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

module.exports = (router) => {
  // Document viewer
  router.get('/cases/:caseId/review/documents/:documentId', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const documentId = parseInt(req.params.documentId)
    const userId = req.session.data.user.id

    const [_case, document] = await Promise.all([
      prisma.case.findUnique({
        where: { id: caseId },
        include: {
          defendants: {
            include: { charges: { include: { elements: { orderBy: { order: 'asc' } } } } }
          }
        }
      }),
      prisma.document.findUnique({ where: { id: documentId } })
    ])

    const review = await findOrCreateReview(prisma, caseId, userId)
    const docReview = await findOrCreateDocumentReview(prisma, review.id, documentId)

    if (docReview.status === 'not_started') {
      await prisma.caseReviewDocument.update({
        where: { id: docReview.id },
        data: { status: 'in_progress' }
      })
    }

    const isVideo = document.type === 'MP4'
    const isAudio = document.type === 'MP3'
    const isPhoto = document.type === 'JPG' || document.type === 'PNG'

    const annotations = await prisma.caseReviewAnnotation.findMany({
      where: { caseReviewDocumentId: docReview.id },
      orderBy: { createdAt: 'asc' },
      include: { elements: { include: { element: { include: { charge: true } } } } }
    })

    const redactions = (isVideo || isAudio || isPhoto) ? [] : await prisma.caseReviewRedaction.findMany({
      where: { caseReviewDocumentId: docReview.id },
      orderBy: { createdAt: 'asc' }
    })

    const defendantCharges = _case.defendants[0]?.charges || []

    const { offences, hasElements } = buildOffencesWithAnnotations(defendantCharges, annotations, caseId, documentId)

    let sections = []
    if (!isVideo && !isAudio && !isPhoto) {
      const rawSections = generateDocumentContent(document)
      const annotatedSections = applyHighlights(rawSections, annotations)
      sections = applyRedactions(annotatedSections, redactions)
    }

    let template = 'cases/review/document/index'
    if (isVideo) template = 'cases/review/video/index'
    if (isAudio) template = 'cases/review/audio/index'
    if (isPhoto) template = 'cases/review/photo/index'

    res.render(template, {
      _case,
      document,
      offences,
      hasElements,
      sections,
      annotations,
      redactions,
      isVideo,
      isAudio,
      isPhoto,
      videoUrl: isVideo ? '/public/videos/cctv-placeholder.mp4' : null,
      audioUrl: isAudio ? '/public/audio/999-call-placeholder.mp3' : null,
      photoUrls: isPhoto ? getDocumentPhotoUrls(document) : null,
      caseId,
      documentId,
      docReviewId: docReview.id,
      user: req.session.data.user,
      isReviewMode: true
    })
  })

  // Element — edit strength
  router.get('/cases/:caseId/review/documents/:documentId/elements/:elementId/edit', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const documentId = parseInt(req.params.documentId)
    const elementId = parseInt(req.params.elementId)

    const [_case, element, annotations] = await Promise.all([
      prisma.case.findUnique({ where: { id: caseId } }),
      prisma.element.findUnique({ where: { id: elementId } }),
      getElementAnnotations(prisma, elementId)
    ])

    res.render('cases/review/elements/edit', { _case, element, annotations, caseId, documentId })
  })

  router.post('/cases/:caseId/review/documents/:documentId/elements/:elementId/edit', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const documentId = parseInt(req.params.documentId)
    const elementId = parseInt(req.params.elementId)

    const { strength } = req.body
    const strengthReasoning = req.body.strengthReasoning?.[strength] || null

    await prisma.element.update({
      where: { id: elementId },
      data: { strength, strengthReasoning }
    })

    res.redirect(`/cases/${caseId}/review/documents/${documentId}`)
  })

  // Add offence — select offence
  router.get('/cases/:caseId/review/documents/:documentId/add-offence', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const documentId = parseInt(req.params.documentId)

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
      .map(c => ({
        value: c.code,
        text: c.description
      }))

    res.render('cases/review/add-offence/index', { _case, caseId, documentId, offenceItems, addOffence: req.session.data.addOffence })
  })

  router.post('/cases/:caseId/review/documents/:documentId/add-offence', (req, res) => {
    const caseId = req.params.caseId
    const documentId = req.params.documentId

    const chargeCodes = req.body.addOffence?.chargeCodes
    req.session.data.addOffence = {
      ...req.session.data.addOffence,
      chargeCodes: chargeCodes ? [].concat(chargeCodes) : []
    }

    res.redirect(`/cases/${caseId}/review/documents/${documentId}/add-offence/check`)
  })

  // Add offence — check answers
  router.get('/cases/:caseId/review/documents/:documentId/add-offence/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const documentId = parseInt(req.params.documentId)

    const _case = await prisma.case.findUnique({ where: { id: caseId } })
    const addOffence = req.session.data.addOffence || {}
    const selectedCharges = charges.filter(c => (addOffence.chargeCodes || []).includes(c.code))

    res.render('cases/review/add-offence/check', { _case, caseId, documentId, addOffence, selectedCharges })
  })

  router.post('/cases/:caseId/review/documents/:documentId/add-offence/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const documentId = parseInt(req.params.documentId)
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
          meta: { documentId, description: selectedCharge.description },
          caseId
        }
      })
    }

    await resetReviewCompletionAfterOffenceChange(prisma, caseId, userId)

    delete req.session.data.addOffence

    res.redirect(`/cases/${caseId}/review/documents/${documentId}`)
  })

  // Change offence — select offence
  router.get('/cases/:caseId/review/documents/:documentId/change-offence', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const documentId = parseInt(req.params.documentId)

    const _case = await prisma.case.findUnique({
      where: { id: caseId },
      include: { defendants: { include: { charges: true } } }
    })

    const existingChargeCodes = (_case.defendants[0]?.charges || []).map(c => c.chargeCode)

    if (req.query.reset || !req.session.data.changeOffence) {
      req.session.data.changeOffence = { chargeCodes: existingChargeCodes }
    }

    const offenceItems = charges.map(c => ({
      value: c.code,
      text: c.description
    }))

    res.render('cases/review/change-offence/index', { _case, caseId, documentId, offenceItems, changeOffence: req.session.data.changeOffence })
  })

  router.post('/cases/:caseId/review/documents/:documentId/change-offence', (req, res) => {
    const caseId = req.params.caseId
    const documentId = req.params.documentId

    const chargeCodes = req.body.changeOffence?.chargeCodes
    req.session.data.changeOffence = {
      ...req.session.data.changeOffence,
      chargeCodes: chargeCodes ? [].concat(chargeCodes) : []
    }

    res.redirect(`/cases/${caseId}/review/documents/${documentId}/change-offence/check`)
  })

  // Change offence — check answers
  router.get('/cases/:caseId/review/documents/:documentId/change-offence/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const documentId = parseInt(req.params.documentId)

    const _case = await prisma.case.findUnique({ where: { id: caseId } })
    const changeOffence = req.session.data.changeOffence || {}
    const selectedCharges = charges.filter(c => (changeOffence.chargeCodes || []).includes(c.code))

    res.render('cases/review/change-offence/check', { _case, caseId, documentId, changeOffence, selectedCharges })
  })

  router.post('/cases/:caseId/review/documents/:documentId/change-offence/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const documentId = parseInt(req.params.documentId)
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
          meta: { documentId, description: selectedCharge.description },
          caseId
        }
      })
    }

    await resetReviewCompletionAfterOffenceChange(prisma, caseId, userId)

    delete req.session.data.changeOffence

    res.redirect(`/cases/${caseId}/review/documents/${documentId}`)
  })

  // Remove offence — confirm GET
  router.get('/cases/:caseId/review/documents/:documentId/offences/:chargeId/remove', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const documentId = parseInt(req.params.documentId)
    const chargeId = parseInt(req.params.chargeId)

    const [_case, document, charge] = await Promise.all([
      prisma.case.findUnique({ where: { id: caseId } }),
      prisma.document.findUnique({ where: { id: documentId } }),
      prisma.charge.findUnique({ where: { id: chargeId }, include: { elements: true } })
    ])

    const elementIds = charge.elements.map(e => e.id)
    const linkedAnnotations = elementIds.length
      ? await prisma.caseReviewAnnotationElement.findMany({
          where: { elementId: { in: elementIds } },
          distinct: ['annotationId']
        })
      : []

    res.render('cases/review/offence/remove', {
      _case,
      document,
      charge,
      caseId,
      documentId,
      linkedAnnotationCount: linkedAnnotations.length
    })
  })

  // Remove offence — POST
  router.post('/cases/:caseId/review/documents/:documentId/offences/:chargeId/remove', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const documentId = parseInt(req.params.documentId)
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
        meta: { documentId, description: charge.description },
        caseId
      }
    })

    await resetReviewCompletionAfterOffenceChange(prisma, caseId, userId)

    res.redirect(`/cases/${caseId}/review/documents/${documentId}`)
  })

  // Add annotation
  router.post('/cases/:caseId/review/documents/:documentId/annotations/add', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const documentId = parseInt(req.params.documentId)
    const userId = req.session.data.user.id

    const review = await findOrCreateReview(prisma, caseId, userId)
    const docReview = await findOrCreateDocumentReview(prisma, review.id, documentId)

    const { type } = req.body
    const timestampSeconds = req.body.timestampSeconds !== undefined && req.body.timestampSeconds !== ''
      ? parseFloat(req.body.timestampSeconds)
      : null
    const selectedText = timestampSeconds !== null ? formatTimestamp(timestampSeconds) : req.body.selectedText
    const paragraphIndex = parseInt(req.body.paragraphIndex) || 0
    const occurrenceIndex = parseInt(req.body.occurrenceIndex) || 0

    const reasoningByElementId = req.body.elements || {}
    const elementIds = Object.keys(reasoningByElementId)
      // Reason capture disabled — restore to re-enable:
      // .filter(id => reasoningByElementId[id])
      .map(id => parseInt(id))

    let annotation = null

    // Evidence and disclosure are only linked to elements when some are selected —
    // if none exist yet (no offence added) they fall back to a plain note, same
    // as information-request, and can be linked later.
    if ((type === 'evidence' || type === 'disclosure') && selectedText && elementIds.length) {
      const elements = await prisma.element.findMany({
        where: { id: { in: elementIds } }
      })

      const note = elements
        .map(element => `${element.description}: ${reasoningByElementId[element.id]}`)
        .join('; ')

      annotation = await prisma.caseReviewAnnotation.create({
        data: { caseReviewDocumentId: docReview.id, type, selectedText, paragraphIndex, occurrenceIndex, note, timestampSeconds }
      })

      await prisma.caseReviewAnnotationElement.createMany({
        data: elements.map(element => ({
          annotationId: annotation.id,
          elementId: element.id,
          reasoning: reasoningByElementId[element.id]
        }))
      })
    } else {
      const { note } = req.body
      if (selectedText && type && note) {
        annotation = await prisma.caseReviewAnnotation.create({
          data: { caseReviewDocumentId: docReview.id, type, selectedText, paragraphIndex, occurrenceIndex, note, timestampSeconds }
        })
      }
    }

    await respondWithAnnotationUpdate(req, res, prisma, {
      caseId, documentId, docReview, annotationId: annotation?.id ?? null
    })
  })

  // Edit annotation — POST
  router.post('/cases/:caseId/review/documents/:documentId/annotations/:annotationId/edit', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const documentId = parseInt(req.params.documentId)
    const annotationId = parseInt(req.params.annotationId)
    const userId = req.session.data.user.id

    const review = await findOrCreateReview(prisma, caseId, userId)
    const docReview = await findOrCreateDocumentReview(prisma, review.id, documentId)

    const { linkAsType } = req.body
    const reasoningByElementId = req.body.elements || {}
    const elementIds = Object.keys(reasoningByElementId)
      // Reason capture disabled — restore to re-enable:
      // .filter(id => reasoningByElementId[id])
      .map(id => parseInt(id))

    if (elementIds.length) {
      const elements = await prisma.element.findMany({
        where: { id: { in: elementIds } }
      })

      const note = elements
        .map(element => `${element.description}: ${reasoningByElementId[element.id]}`)
        .join('; ')

      await prisma.caseReviewAnnotationElement.deleteMany({ where: { annotationId } })
      await prisma.caseReviewAnnotationElement.createMany({
        data: elements.map(element => ({
          annotationId,
          elementId: element.id,
          reasoning: reasoningByElementId[element.id]
        }))
      })

      // Linking a note to evidence or disclosure elements turns it into that
      // type - it stops being a plain note once it's carrying that structure.
      await prisma.caseReviewAnnotation.update({
        where: { id: annotationId },
        data: linkAsType ? { note, type: linkAsType } : { note }
      })
    } else {
      const { note } = req.body
      await prisma.caseReviewAnnotation.update({
        where: { id: annotationId },
        data: { note }
      })
    }

    await respondWithAnnotationUpdate(req, res, prisma, {
      caseId, documentId, docReview, annotationId
    })
  })

  // Delete annotation — confirm GET
  router.get('/cases/:caseId/review/documents/:documentId/annotations/:annotationId/delete', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const documentId = parseInt(req.params.documentId)
    const annotationId = parseInt(req.params.annotationId)

    const [_case, document, annotation] = await Promise.all([
      prisma.case.findUnique({ where: { id: caseId } }),
      prisma.document.findUnique({ where: { id: documentId } }),
      prisma.caseReviewAnnotation.findUnique({
        where: { id: annotationId },
        include: { elements: { include: { element: { include: { charge: true } } } } }
      })
    ])

    const from = req.query.from || 'list'
    annotation.elementGroups = groupElementsByCharge(annotation.elements)

    res.render('cases/review/annotations/delete', { _case, document, annotation, caseId, documentId, from })
  })

  // Delete annotation — POST
  router.post('/cases/:caseId/review/documents/:documentId/annotations/:annotationId/delete', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const documentId = parseInt(req.params.documentId)
    const annotationId = parseInt(req.params.annotationId)

    await prisma.caseReviewAnnotationElement.deleteMany({ where: { annotationId } })
    await prisma.caseReviewAnnotation.delete({ where: { id: annotationId } })

    const from = req.body.from
    if (from === 'document') {
      res.redirect(`/cases/${caseId}/review/documents/${documentId}`)
    } else if (from === 'check') {
      res.redirect(`/cases/${caseId}/review/check`)
    } else {
      res.redirect(`/cases/${caseId}/review`)
    }
  })

  // Add redaction
  router.post('/cases/:caseId/review/documents/:documentId/redactions/add', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const documentId = parseInt(req.params.documentId)
    const userId = req.session.data.user.id

    const review = await findOrCreateReview(prisma, caseId, userId)
    const docReview = await findOrCreateDocumentReview(prisma, review.id, documentId)

    const { selectedText, paragraphIndex, occurrenceIndex } = req.body
    if (selectedText) {
      await prisma.caseReviewRedaction.create({
        data: {
          caseReviewDocumentId: docReview.id,
          selectedText,
          paragraphIndex: parseInt(paragraphIndex) || 0,
          occurrenceIndex: parseInt(occurrenceIndex) || 0
        }
      })
    }

    await respondWithRedactionUpdate(req, res, prisma, { documentId, docReviewId: docReview.id })
  })

  // Delete redaction — confirm GET
  router.get('/cases/:caseId/review/documents/:documentId/redactions/:redactionId/delete', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const documentId = parseInt(req.params.documentId)
    const redactionId = parseInt(req.params.redactionId)

    const [_case, document, redaction] = await Promise.all([
      prisma.case.findUnique({ where: { id: caseId } }),
      prisma.document.findUnique({ where: { id: documentId } }),
      prisma.caseReviewRedaction.findUnique({ where: { id: redactionId } })
    ])

    const from = req.query.from || 'document'

    res.render('cases/review/redactions/delete', { _case, document, redaction, caseId, documentId, from })
  })

  // Delete redaction
  router.post('/cases/:caseId/review/documents/:documentId/redactions/:redactionId/delete', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const documentId = parseInt(req.params.documentId)
    const redactionId = parseInt(req.params.redactionId)
    const userId = req.session.data.user.id

    const review = await findOrCreateReview(prisma, caseId, userId)
    const docReview = await findOrCreateDocumentReview(prisma, review.id, documentId)

    await prisma.caseReviewRedaction.delete({ where: { id: redactionId } })

    // The document page deletes redactions inline via AJAX (jQuery sets
    // X-Requested-With, so req.xhr is true there); the check page instead
    // posts a plain form and expects a redirect back.
    if (req.xhr) {
      await respondWithRedactionUpdate(req, res, prisma, { documentId, docReviewId: docReview.id })
    } else if (req.body.from === 'check') {
      res.redirect(`/cases/${caseId}/review/check`)
    } else {
      res.redirect(`/cases/${caseId}/review/documents/${documentId}`)
    }
  })

  // Mark document as reviewed
  router.post('/cases/:caseId/review/documents/:documentId/mark-reviewed', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const documentId = parseInt(req.params.documentId)
    const userId = req.session.data.user.id

    const review = await findOrCreateReview(prisma, caseId, userId)
    const docReview = await findOrCreateDocumentReview(prisma, review.id, documentId)
    await prisma.caseReviewDocument.update({
      where: { id: docReview.id },
      data: { status: 'reviewed' }
    })

    res.redirect(`/cases/${caseId}/review`)
  })

  // Save document progress (in progress)
  router.post('/cases/:caseId/review/documents/:documentId/save-progress', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const documentId = parseInt(req.params.documentId)
    const userId = req.session.data.user.id

    const review = await findOrCreateReview(prisma, caseId, userId)
    const docReview = await findOrCreateDocumentReview(prisma, review.id, documentId)
    await prisma.caseReviewDocument.update({
      where: { id: docReview.id },
      data: { status: 'in_progress' }
    })

    res.redirect(`/cases/${caseId}/review`)
  })

  // Return confirmation — GET
  router.get('/cases/:caseId/review/documents/:documentId/return', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const documentId = parseInt(req.params.documentId)

    const [_case, document] = await Promise.all([
      prisma.case.findUnique({ where: { id: caseId } }),
      prisma.document.findUnique({ where: { id: documentId } })
    ])

    res.render('cases/review/document-return', { _case, document, caseId, documentId })
  })

  // Return confirmation — POST
  router.post('/cases/:caseId/review/documents/:documentId/return', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const documentId = parseInt(req.params.documentId)
    const userId = req.session.data.user.id

    if (req.body.markAsReviewed === 'yes') {
      const review = await findOrCreateReview(prisma, caseId, userId)
      const docReview = await findOrCreateDocumentReview(prisma, review.id, documentId)
      await prisma.caseReviewDocument.update({
        where: { id: docReview.id },
        data: { status: 'reviewed' }
      })
    }

    res.redirect(`/cases/${caseId}/review`)
  })
}
