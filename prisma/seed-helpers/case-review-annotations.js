const { faker } = require('@faker-js/faker')
const statuses = require('../../app/data/case-statuses')
const annotationSnippets = require('../../app/data/annotation-snippets')
const { generateDocumentContent } = require('../../app/helpers/documentContent')

const photoTypes = ['JPG', 'PNG']

// Snippets are exact substrings of the fixed templates in documentContent.js,
// each appearing only once, so the review page can highlight just that
// instance rather than every matching string in the document.
function findParagraphOccurrence(document, selectedText) {
  if (photoTypes.includes(document.type) || document.type === 'MP4' || document.type === 'MP3') {
    return { paragraphIndex: 0, occurrenceIndex: 0 }
  }
  const flatParagraphs = generateDocumentContent(document).flatMap(section => section.paragraphs)
  const paragraphIndex = flatParagraphs.findIndex(para => para.includes(selectedText))
  return { paragraphIndex: Math.max(paragraphIndex, 0), occurrenceIndex: 0 }
}

// Mirrors selectTemplate() in app/helpers/documentContent.js so the snippets
// picked here always exist in the paragraphs the review page renders.
function selectSnippets(documentName) {
  const lower = documentName.toLowerCase()
  if (lower.includes('witness statement')) return annotationSnippets.witnessStatement
  if (lower.includes('cctv')) return annotationSnippets.cctvReport
  if (lower.includes('forensic') || lower.includes('lab result')) return annotationSnippets.forensicReport
  if (lower.includes('interview transcript')) return annotationSnippets.interviewTranscript
  if (lower.includes('medical')) return annotationSnippets.medicalReport
  return annotationSnippets.policeReport
}

function formatTimestamp(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

// Builds the candidate list (snippet + selectedText) for a document, ready
// to be picked from without replacement.
function buildCandidates(document) {
  if (document.type === 'MP4') {
    const seconds = faker.helpers.arrayElements([5, 20, 45, 70, 95, 130, 165, 210, 250], 3).sort((a, b) => a - b)
    return annotationSnippets.video.map((snippet, index) => ({
      ...snippet,
      selectedText: formatTimestamp(seconds[index]),
      timestampSeconds: seconds[index]
    }))
  }
  // Timestamps stay within the 10-second placeholder recording.
  if (document.type === 'MP3') {
    const seconds = faker.helpers.arrayElements([1, 2, 3, 4, 5, 6, 7, 8, 9], 3).sort((a, b) => a - b)
    return annotationSnippets.audio.map((snippet, index) => ({
      ...snippet,
      selectedText: formatTimestamp(seconds[index]),
      timestampSeconds: seconds[index]
    }))
  }
  if (photoTypes.includes(document.type)) {
    return annotationSnippets.photo.map(snippet => ({ ...snippet, selectedText: 'Whole photo' }))
  }
  return selectSnippets(document.name)
}

// Evidence annotations link to a real element about half the time,
// mirroring how the review page joins "description: reasoning" into the
// annotation note when elements are selected via the UI.
function buildNoteAndLinks(snippet, elements) {
  if (snippet.type === 'evidence' && elements.length && faker.datatype.boolean()) {
    const element = faker.helpers.arrayElement(elements)
    return {
      note: `${element.description}: ${snippet.note}`,
      links: [{ elementId: element.id, reasoning: snippet.note }]
    }
  }
  return { note: snippet.note, links: [] }
}

async function seedCaseReviewAnnotations(prisma, { users }) {
  const cases = await prisma.case.findMany({
    where: {
      // Case-level review data (document status, annotations) isn't scoped
      // to a single defendant, so a case is only in scope once every
      // defendant is actually charged - otherwise a still-pending charging
      // decision for a co-defendant would show up looking already reviewed.
      AND: [
        { defendants: { some: { status: statuses.CHARGED } } },
        { defendants: { none: { status: statuses.NOT_CHARGED, needsReview: true } } }
      ]
    },
    include: {
      documents: true,
      prosecutors: true,
      defendants: {
        where: { status: statuses.CHARGED },
        include: { charges: { include: { elements: true } } }
      }
    }
  })

  let reviewCount = 0
  let documentReviewCount = 0
  let annotationCount = 0

  for (const _case of cases) {
    const lead = _case.prosecutors.find(p => p.isLead) || _case.prosecutors[0]
    const userId = lead ? lead.userId : faker.helpers.arrayElement(users).id
    const elements = _case.defendants.flatMap(d => d.charges.flatMap(c => c.elements))

    const review = await prisma.caseReview.create({
      data: { caseId: _case.id, userId, status: 'submitted' }
    })
    reviewCount++

    for (const document of _case.documents) {
      const status = faker.helpers.weightedArrayElement([
        { value: 'reviewed', weight: 40 },
        { value: 'in_progress', weight: 25 },
        { value: 'not_started', weight: 35 }
      ])

      const docReview = await prisma.caseReviewDocument.create({
        data: { caseReviewId: review.id, documentId: document.id, status }
      })
      documentReviewCount++

      if (status === 'not_started') continue

      const candidates = buildCandidates(document)
      const numAnnotations = status === 'reviewed'
        ? faker.number.int({ min: 2, max: candidates.length })
        : faker.number.int({ min: 0, max: 2 })

      const chosen = faker.helpers.arrayElements(candidates, Math.min(numAnnotations, candidates.length))

      for (const snippet of chosen) {
        const { note, links } = buildNoteAndLinks(snippet, elements)
        const { paragraphIndex, occurrenceIndex } = findParagraphOccurrence(document, snippet.selectedText)

        const annotation = await prisma.caseReviewAnnotation.create({
          data: {
            caseReviewDocumentId: docReview.id,
            type: snippet.type,
            selectedText: snippet.selectedText,
            paragraphIndex,
            occurrenceIndex,
            note,
            timestampSeconds: snippet.timestampSeconds ?? null
          }
        })
        annotationCount++

        if (links.length) {
          await prisma.caseReviewAnnotationElement.createMany({
            data: links.map(link => ({
              annotationId: annotation.id,
              elementId: link.elementId,
              reasoning: link.reasoning
            }))
          })
        }
      }
    }
  }

  return { reviews: reviewCount, documentReviews: documentReviewCount, annotations: annotationCount }
}

module.exports = { seedCaseReviewAnnotations, buildCandidates, findParagraphOccurrence }
