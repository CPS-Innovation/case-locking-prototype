const _ = require('lodash')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { getEligibleCharges, getElementAnnotations, findOrCreateReview } = require('../helpers/caseReview')
const { groupElementsByCharge } = require('../helpers/documentAnnotations')

function elementAssessed (element) {
  return Boolean(element.strength) && element.strength !== 'Not assessed'
}

// Elements across all eligible charges, flattened into a single ordered list
// so the task can step through them one per page.
function flattenElements (charges) {
  return charges.flatMap(charge => (charge.elements || []).map(element => ({ ...element, charge })))
}

module.exports = (router) => {
  // Entry point — send the reviewer to the first unassessed element
  router.get('/cases/:caseId/review/strength-assessment', async (req, res) => {
    const caseId = parseInt(req.params.caseId)

    const { charges } = await getEligibleCharges(prisma, caseId)
    const elements = flattenElements(charges)
    if (!elements.length) {
      return res.redirect(`/cases/${caseId}/review`)
    }

    const nextElement = elements.find(element => !elementAssessed(element)) || elements[0]
    res.redirect(`/cases/${caseId}/review/strength-assessment/${nextElement.id}`)
  })

  // Strength assessment — check answers
  // Registered before the /:elementId routes below so "check" isn't matched as an elementId.
  router.get('/cases/:caseId/review/strength-assessment/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const userId = req.session.data.user.id
    const { _case, eligibleDefendants, charges } = await getEligibleCharges(prisma, caseId)
    const review = await findOrCreateReview(prisma, caseId, userId)

    const chargeSections = charges.map(charge => ({
      ...charge,
      elementRows: (charge.elements || []).map(element => ({
        key: { text: element.description },
        value: {
          html: _.escape(element.strength || 'Not assessed') +
            (element.strengthReasoning
              ? `<br><span class="govuk-hint govuk-!-margin-bottom-0">${_.escape(element.strengthReasoning)}</span>`
              : '')
        },
        actions: {
          items: [{
            href: `/cases/${caseId}/review/strength-assessment/${element.id}?from=check`,
            text: 'Change',
            visuallyHiddenText: element.description
          }]
        }
      }))
    }))

    res.render('cases/review/strength-assessment/check', {
      _case,
      review,
      chargeSections,
      showDefendantName: eligibleDefendants.length > 1,
    })
  })

  router.post('/cases/:caseId/review/strength-assessment/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const userId = req.session.data.user.id
    const review = await findOrCreateReview(prisma, caseId, userId)

    await prisma.caseReview.update({
      where: { id: review.id },
      data: { strengthAssessmentComplete: req.body.complete === 'yes' },
    })

    res.redirect(`/cases/${caseId}/review`)
  })

  // Strength assessment — one element per page
  router.get('/cases/:caseId/review/strength-assessment/:elementId', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const elementId = parseInt(req.params.elementId)
    const { _case, eligibleDefendants, charges } = await getEligibleCharges(prisma, caseId)

    const elements = flattenElements(charges)
    const elementIndex = elements.findIndex(element => element.id === elementId)
    if (elementIndex === -1) {
      return res.redirect(`/cases/${caseId}/review/strength-assessment`)
    }

    const element = elements[elementIndex]

    // Only show the reasoning relevant to the element being assessed, not
    // every element an annotation happens to be linked to.
    const annotations = (await getElementAnnotations(prisma, elementId)).map(annotation => {
      const elements = annotation.elements.filter(link => link.elementId === elementId)
      return { ...annotation, elements, elementGroups: groupElementsByCharge(elements) }
    })

    res.render('cases/review/strength-assessment/index', {
      _case,
      element,
      charge: element.charge,
      annotations,
      showDefendantName: eligibleDefendants.length > 1,
      isFirstElement: elementIndex === 0,
      from: req.query.from,
    })
  })

  router.post('/cases/:caseId/review/strength-assessment/:elementId', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const elementId = parseInt(req.params.elementId)
    const { charges } = await getEligibleCharges(prisma, caseId)

    const elements = flattenElements(charges)
    const elementIndex = elements.findIndex(element => element.id === elementId)
    if (elementIndex === -1) {
      return res.redirect(`/cases/${caseId}/review/strength-assessment`)
    }

    const { strength } = req.body
    const strengthReasoning = req.body.strengthReasoning?.[strength] || null

    await prisma.element.update({
      where: { id: elementId },
      data: { strength, strengthReasoning }
    })

    if (req.body.from === 'check') {
      return res.redirect(`/cases/${caseId}/review/strength-assessment/check`)
    }

    if (req.body.from === 'overview') {
      return res.redirect(`/cases/${caseId}`)
    }

    const nextElement = elements[elementIndex + 1]
    if (nextElement) {
      res.redirect(`/cases/${caseId}/review/strength-assessment/${nextElement.id}`)
    } else {
      res.redirect(`/cases/${caseId}/review/strength-assessment/check`)
    }
  })
}
