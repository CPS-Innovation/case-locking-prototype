const _ = require('lodash')
const prisma = require('../lib/prisma')
const { getEligibleCharges, findOrCreateReview, findOrCreateReviewWithAnswers, buildDecisionsMap } = require('../helpers/caseReview')

module.exports = (router) => {
  // Entry point — send the reviewer to the first charge that still needs a decision
  router.get('/cases/:caseId/review/charging-decision', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const userId = req.session.data.user.id

    if (req.query.referrer) {
      req.session.data.caseReviewReferrer = req.query.referrer
    }

    const { charges } = await getEligibleCharges(prisma, caseId)
    if (!charges.length) {
      return res.redirect(`/cases/${caseId}/review`)
    }

    const review = await findOrCreateReviewWithAnswers(prisma, caseId, userId)
    const decisions = buildDecisionsMap(review)
    const nextCharge = charges.find(charge => !decisions[charge.id]) || charges[0]
    res.redirect(`/cases/${caseId}/review/charging-decision/${nextCharge.id}`)
  })

  // Charging decision — check answers
  // Registered before the /:chargeId routes below so "check" isn't matched as a chargeId.
  router.get('/cases/:caseId/review/charging-decision/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const userId = req.session.data.user.id
    const { _case, eligibleDefendants, charges } = await getEligibleCharges(prisma, caseId)
    const review = await findOrCreateReviewWithAnswers(prisma, caseId, userId)

    const decisions = buildDecisionsMap(review)
    const chargeRows = charges.map(charge => ({
      ...charge,
      decision: decisions[charge.id],
    }))

    res.render('cases/review/charging-decision/check', {
      _case,
      review,
      charges: chargeRows,
      showDefendantName: eligibleDefendants.length > 1,
    })
  })

  router.post('/cases/:caseId/review/charging-decision/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const userId = req.session.data.user.id
    const review = await findOrCreateReview(prisma, caseId, userId)

    await prisma.caseReview.update({
      where: { id: review.id },
      data: { chargingDecisionComplete: req.body.complete === 'yes' },
    })

    res.redirect(`/cases/${caseId}/review`)
  })

  // Charge decision — one charge per page
  router.get('/cases/:caseId/review/charging-decision/:chargeId', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const chargeId = parseInt(req.params.chargeId)
    const userId = req.session.data.user.id
    const { _case, eligibleDefendants, charges } = await getEligibleCharges(prisma, caseId)

    const chargeIndex = charges.findIndex(charge => charge.id === chargeId)
    if (chargeIndex === -1) {
      return res.redirect(`/cases/${caseId}/review/charging-decision`)
    }

    const charge = charges[chargeIndex]
    const elementRows = (charge.elements || []).map(element => ({
      key: { text: element.description },
      value: {
        html: _.escape(element.strength || 'Not assessed') +
          (element.strengthReasoning
            ? `<br><span class="govuk-hint govuk-!-margin-bottom-0">${_.escape(element.strengthReasoning)}</span>`
            : '')
      }
    }))

    const review = await findOrCreateReviewWithAnswers(prisma, caseId, userId)

    res.render('cases/review/charging-decision/index', {
      _case,
      charge,
      elementRows,
      chargeNumber: chargeIndex + 1,
      totalCharges: charges.length,
      showDefendantName: eligibleDefendants.length > 1,
      selectedDecision: buildDecisionsMap(review)[chargeId],
      isFirstCharge: chargeIndex === 0,
      from: req.query.from,
    })
  })

  router.post('/cases/:caseId/review/charging-decision/:chargeId', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const chargeId = parseInt(req.params.chargeId)
    const userId = req.session.data.user.id

    const review = await findOrCreateReview(prisma, caseId, userId)
    await prisma.caseReviewChargeDecision.upsert({
      where: { caseReviewId_chargeId: { caseReviewId: review.id, chargeId } },
      update: { decision: req.body.decision },
      create: { caseReviewId: review.id, chargeId, decision: req.body.decision },
    })

    if (req.body.from === 'check') {
      return res.redirect(`/cases/${caseId}/review/charging-decision/check`)
    }

    const { charges } = await getEligibleCharges(prisma, caseId)
    const chargeIndex = charges.findIndex(charge => charge.id === chargeId)
    const nextCharge = charges[chargeIndex + 1]

    if (nextCharge) {
      res.redirect(`/cases/${caseId}/review/charging-decision/${nextCharge.id}`)
    } else {
      res.redirect(`/cases/${caseId}/review/charging-decision/check`)
    }
  })
}
