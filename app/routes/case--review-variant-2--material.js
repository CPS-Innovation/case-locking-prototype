const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { generateDocumentContent, getDocumentPhotoUrls } = require('../helpers/documentContent')
const {
  findOrCreateReview,
  resetReviewCompletionAfterOffenceChange,
  groupDocumentsByCategory,
} = require('../helpers/caseReview')
const { applyHighlights, applyRedactions, buildOffencesWithAnnotations, groupElementsByCharge } = require('../helpers/documentAnnotations')
const charges = require('../data/charges')
const elementsByChargeCode = require('../data/elements')

// Combined "Material" page for the review-variant-2 flow: every document in
// the case on one page, instead of the existing flow's one-document-per-page
// review/documents/:documentId route (case--review--document.js). Annotation
// add/edit/delete and redaction add/delete are AJAX-driven and document-scoped
// regardless of which page rendered them, so those routes are reused as-is
// from case--review--document.js rather than duplicated here. Only the routes
// that render or redirect to a full page are duplicated, pointing back at
// this combined page instead of the single-document one.
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
      const redactions = (isVideo || isAudio || isPhoto) ? [] : (redactionsByDocReviewId.get(docReview.id) || [])

      const { offences, hasElements } = buildOffencesWithAnnotations(defendantCharges, annotations, caseId, document.id)

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
        annotations,
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

    res.render('cases/review/add-offence/index', {
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

    res.render('cases/review/add-offence/check', {
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

    res.render('cases/review/change-offence/index', {
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

    res.render('cases/review/change-offence/check', {
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

    res.render('cases/review/offence/remove', {
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
  // equivalent route, just landing back on the combined material page)
  router.get('/cases/:caseId/review-variant-2/material/documents/:documentId/annotations/:annotationId/delete', async (req, res) => {
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

    annotation.elementGroups = groupElementsByCharge(annotation.elements)
    annotation.photoUrl = getDocumentPhotoUrls(document)[0]

    res.render('cases/review/annotations/delete', {
      _case, document, annotation, caseId, documentId,
      cancelHref: `/cases/${caseId}/review-variant-2/material#document-${documentId}`
    })
  })

  // Delete annotation — POST
  router.post('/cases/:caseId/review-variant-2/material/documents/:documentId/annotations/:annotationId/delete', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const documentId = parseInt(req.params.documentId)
    const annotationId = parseInt(req.params.annotationId)

    await prisma.caseReviewAnnotationElement.deleteMany({ where: { annotationId } })
    await prisma.caseReviewAnnotation.delete({ where: { id: annotationId } })

    res.redirect(`/cases/${caseId}/review-variant-2/material#document-${documentId}`)
  })
}
