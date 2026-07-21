const _ = require('lodash')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { mediaTypes, fileTypesByMediaType, getMediaType } = require('../data/document-media-types')
const documentCategories = require('../data/document-categories')
const { addTimeLimitDates } = require('../helpers/timeLimit')
const { addCaseStatus } = require('../helpers/caseStatus')
const { generateDocumentContent, getDocumentPhotoUrls } = require('../helpers/documentContent')

function deriveDocumentType(filename) {
  return (filename || '').split('.').pop().toUpperCase()
}

// Targets the exact paragraph/occurrence the user selected, rather than
// replacing every matching string across the document.
function applyHighlights(sections, annotations) {
  if (!annotations.length) return sections
  const flatParagraphs = sections.flatMap(s => s.paragraphs)
  annotations.forEach(annotation => {
    const paraIdx = annotation.paragraphIndex
    if (paraIdx < 0 || paraIdx >= flatParagraphs.length) return
    const escaped = annotation.selectedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escaped, 'g')
    const cls = `app-annotation app-annotation--${annotation.type}`
    const target = annotation.occurrenceIndex
    let count = 0
    flatParagraphs[paraIdx] = flatParagraphs[paraIdx].replace(regex, function(match) {
      if (count++ === target) {
        return `<mark class="${cls}" data-annotation-id="${annotation.id}">${annotation.selectedText}</mark>`
      }
      return match
    })
  })
  let flatIdx = 0
  return sections.map(section => ({
    heading: section.heading,
    paragraphs: section.paragraphs.map(() => flatParagraphs[flatIdx++])
  }))
}

function resetFilters(req) {
  _.set(req, 'session.data.documentListFilters.types', null)
  _.set(req, 'session.data.documentListFilters.categories', null)
}

module.exports = router => {
  router.get("/cases/:caseId/documents", async (req, res) => {
    const caseId = parseInt(req.params.caseId)

    let selectedMediaTypeFilters = _.get(req.session.data.documentListFilters, 'types', [])
    let selectedCategoryFilters = _.get(req.session.data.documentListFilters, 'categories', [])

    let selectedFilters = { categories: [] }

    // Selected filter chip display
    if (selectedMediaTypeFilters?.length) {
      selectedFilters.categories.push({
        heading: { text: 'Type' },
        items: selectedMediaTypeFilters.map(function(label) {
          return { text: label, href: `/cases/${caseId}/documents/remove-type/${label}` }
        })
      })
    }

    if (selectedCategoryFilters?.length) {
      selectedFilters.categories.push({
        heading: { text: 'Category' },
        items: selectedCategoryFilters.map(function(label) {
          return { text: label, href: `/cases/${caseId}/documents/remove-category/${label}` }
        })
      })
    }

    // Build Prisma where clause for documents
    let where = { caseId: caseId, AND: [] }

    if (selectedMediaTypeFilters?.length) {
      const fileTypes = selectedMediaTypeFilters.flatMap(mediaType => fileTypesByMediaType[mediaType])
      where.AND.push({ type: { in: fileTypes } })
    }

    if (selectedCategoryFilters?.length) {
      where.AND.push({ category: { in: selectedCategoryFilters } })
    }

    if (where.AND.length === 0) {
      delete where.AND
    }

    // Fetch case
    let _case = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        witnesses: { include: { statements: true } },
        prosecutors: {
          include: {
            user: true
          }
        },
        paralegalOfficers: {
          include: {
            user: true
          }
        },
        defendants: { include: { charges: true } },
        hearings: true,
        location: true,
        tasks: true,
        dga: true
      }
    })

    addTimeLimitDates(_case)
    addCaseStatus(_case)

    // Fetch documents with filters
    let documents = await prisma.document.findMany({
      where: where
    })

    documents = documents.map(document => ({ ...document, mediaType: getMediaType(document.type) }))

    // Search by material name or description
    let keywords = _.get(req.session.data.documentSearch, 'keywords')

    if(keywords) {
      keywords = keywords.toLowerCase()
      documents = documents.filter(document => {
        let name = document.name.toLowerCase()
        let description = (document.description || '').toLowerCase()
        return name.indexOf(keywords) > -1 || description.indexOf(keywords) > -1
      })
    }

    let mediaTypeItems = mediaTypes.map(mediaType => ({
      text: mediaType,
      value: mediaType
    }))

    let categoryItems = documentCategories.map(category => ({
      text: category,
      value: category
    }))

    res.render("cases/documents/index", {
      _case,
      documents,
      mediaTypeItems,
      categoryItems,
      selectedFilters
    })
  })

  router.get('/cases/:caseId/documents/remove-type/:type', (req, res) => {
    _.set(req, 'session.data.documentListFilters.types', _.pull(req.session.data.documentListFilters.types, req.params.type))
    res.redirect(`/cases/${req.params.caseId}/documents`)
  })

  router.get('/cases/:caseId/documents/remove-category/:category', (req, res) => {
    _.set(req, 'session.data.documentListFilters.categories', _.pull(req.session.data.documentListFilters.categories, req.params.category))
    res.redirect(`/cases/${req.params.caseId}/documents`)
  })

  router.get('/cases/:caseId/documents/clear-filters', (req, res) => {
    resetFilters(req)
    res.redirect(`/cases/${req.params.caseId}/documents`)
  })

  router.get('/cases/:caseId/documents/clear-search', (req, res) => {
    _.set(req, 'session.data.documentSearch.keywords', '')
    res.redirect(`/cases/${req.params.caseId}/documents`)
  })

  router.get('/cases/:caseId/documents/upload', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const _case = await prisma.case.findUnique({ where: { id: caseId } })

    res.render('cases/documents/upload', { _case })
  })

  router.post('/cases/:caseId/documents/upload', (req, res) => {
    const caseId = req.params.caseId
    const { name, description } = req.body.uploadMaterial || {}

    req.session.data.uploadMaterial = {
      name,
      type: deriveDocumentType(name),
      description,
    }

    res.redirect(`/cases/${caseId}/documents/upload/check`)
  })

  router.get('/cases/:caseId/documents/upload/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const _case = await prisma.case.findUnique({ where: { id: caseId } })

    res.render('cases/documents/upload-check', { _case })
  })

  router.post('/cases/:caseId/documents/upload/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const { name, type, description } = req.session.data.uploadMaterial || {}

    const document = await prisma.document.create({
      data: {
        caseId,
        name,
        description: description || null,
        type,
        size: 1200,
      },
    })

    await prisma.defendant.updateMany({
      where: { cases: { some: { id: caseId } } },
      data: { needsReview: true },
    })

    await prisma.activityLog.create({
      data: {
        userId: req.session.data.user.id,
        model: 'Document',
        recordId: document.id,
        action: 'CREATE',
        title: 'Material uploaded',
        meta: { name, type, description: description || null },
        caseId,
      },
    })

    delete req.session.data.uploadMaterial

    req.flash('success', 'Material uploaded')
    res.redirect(`/cases/${caseId}/documents`)
  })

  router.get('/cases/:caseId/documents/:documentId', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const documentId = parseInt(req.params.documentId)
    const userId = req.session.data.user.id

    const [_case, document] = await Promise.all([
      prisma.case.findUnique({ where: { id: caseId } }),
      prisma.document.findUnique({ where: { id: documentId } })
    ])

    const review = await prisma.caseReview.findFirst({
      where: { caseId, userId },
      orderBy: { updatedAt: 'desc' }
    })

    let annotations = []
    if (review) {
      const docReview = await prisma.caseReviewDocument.findFirst({
        where: { caseReviewId: review.id, documentId }
      })
      if (docReview) {
        annotations = await prisma.caseReviewAnnotation.findMany({
          where: { caseReviewDocumentId: docReview.id },
          orderBy: { createdAt: 'asc' }
        })
      }
    }

    const isVideo = document.type === 'MP4'
    const isAudio = document.type === 'MP3'
    const isPhoto = document.type === 'JPG' || document.type === 'PNG'
    const sections = (isVideo || isAudio || isPhoto) ? [] : applyHighlights(generateDocumentContent(document), annotations)

    res.render('cases/documents/document', {
      _case,
      document,
      sections,
      annotations,
      caseId,
      documentId,
      isVideo,
      isAudio,
      isPhoto,
      videoUrl: isVideo ? '/public/videos/cctv-placeholder.mp4' : null,
      audioUrl: isAudio ? '/public/audio/999-call-placeholder.mp3' : null,
      photoUrls: isPhoto ? getDocumentPhotoUrls(document) : null,
      user: req.session.data.user
    })
  })

}