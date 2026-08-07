const _ = require('lodash')
const { getDocumentPhotoUrls } = require('./documentContent')

const witnessTypeLabels = [
  ['isChild', 'Child'],
  ['isExpert', 'Expert'],
  ['isInterpreter', 'Interpreter'],
  ['isPolice', 'Police'],
  ['isProfessional', 'Professional'],
  ['isPrisoner', 'Prisoner'],
  ['isVulnerable', 'Vulnerable'],
  ['isIntimidated', 'Intimidated']
]

function getWitnessTypeListHtml(witness) {
  const labels = witnessTypeLabels
    .filter(([field]) => witness[field])
    .map(([, label]) => label)

  if (!labels.length) return 'Not entered'
  return '<ul class="govuk-list govuk-list--bullet">' + labels.map(label => `<li>${label}</li>`).join('') + '</ul>'
}

function toWitnessItem(witness) {
  return {
    id: witness.id,
    firstName: witness.firstName,
    lastName: witness.lastName,
    dateOfBirth: witness.dateOfBirth,
    isVictim: witness.isVictim,
    isKeyWitness: witness.isKeyWitness,
    typeListHtml: getWitnessTypeListHtml(witness)
  }
}

function getElementWitnesses(links) {
  const witnesses = links
    .map(link => link.annotation.caseReviewDocument.document.witnessStatement?.witness)
    .filter(Boolean)
  return _.uniqBy(witnesses, 'id').map(toWitnessItem)
}

function toAnnotationItem(annotation, reasoning, joinedByGroup) {
  const { document, documentId } = annotation.caseReviewDocument
  return {
    id: annotation.id,
    groupId: annotation.groupId,
    documentId,
    documentName: document.name,
    documentType: document.type,
    selectedText: joinedByGroup.get(annotation.groupId) ?? annotation.selectedText,
    timestampSeconds: annotation.timestampSeconds,
    photoUrl: getDocumentPhotoUrls(document)[0],
    addedByName: annotation.user ? `${annotation.user.firstName} ${annotation.user.lastName}` : null,
    createdAt: annotation.createdAt,
    reasoning: reasoning || null
  }
}

function buildOverviewElement(element, links, submittedReview, joinedByGroup) {
  if (!submittedReview) {
    return {
      id: element.id,
      description: element.description,
      strength: null,
      strengthReasoning: null,
      evidence: [],
      issues: [],
      witnesses: []
    }
  }

  return {
    id: element.id,
    description: element.description,
    strength: element.strength,
    strengthReasoning: element.strengthReasoning,
    evidence: links.filter(link => link.annotation.type === 'evidence').map(link => toAnnotationItem(link.annotation, link.reasoning, joinedByGroup)),
    issues: links.filter(link => link.annotation.type === 'issue').map(link => toAnnotationItem(link.annotation, link.reasoning, joinedByGroup)),
    witnesses: getElementWitnesses(links)
  }
}

// Shapes the case's charges/elements for the overview page so the view can
// just loop over evidence/issues/witnesses without working out how to split
// or dedupe anything itself. joinedByGroup maps a grouped annotation's
// groupId to its full selected text across every paragraph it touched (see
// joinSelectedTextByGroup in documentAnnotations.js) - each link's annotation
// is only ever the primary row of its group, so its own selectedText alone
// would just be the first paragraph.
function buildOverviewCharges(defendants, annotationLinks, submittedReview, joinedByGroup) {
  const linksByElementId = _.groupBy(annotationLinks, 'elementId')

  return defendants.flatMap(defendant =>
    defendant.charges.map(charge => ({
      id: charge.id,
      description: charge.description,
      elements: charge.elements.map(element =>
        buildOverviewElement(element, linksByElementId[element.id] || [], submittedReview, joinedByGroup)
      )
    }))
  )
}

module.exports = { buildOverviewCharges }
