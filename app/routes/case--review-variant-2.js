const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const {
  findOrCreateReviewWithAnswers,
  getEligibleCharges,
  buildDecisionsMap,
  shapeInformationRequest,
  shapeFirstHearing,
} = require('../helpers/caseReview')

// Variant of the review task list that collapses every piece of material
// into a single "Material" task instead of one row per document — see
// case--review-variant-2--material.js for the combined page it links to.
// "Assessment and decisions" and "Check and submit review" are unchanged
// from the existing flow, so this reuses the same routes/data shaping as
// case--review.js for everything except the material rows.
module.exports = (router) => {
  router.get('/cases/:caseId/review-variant-2', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const userId = req.session.data.user.id

    const { _case, eligibleDefendants, charges } = await getEligibleCharges(prisma, caseId)

    const review = await findOrCreateReviewWithAnswers(prisma, caseId, userId)

    const decisions = buildDecisionsMap(review)
    const needsChargingDecision = eligibleDefendants.length > 0
    const chargingDecisionStarted = Object.keys(decisions).length > 0
    const chargingDecisionAllAnswered = needsChargingDecision && charges.every(charge => decisions[charge.id])

    const allElements = charges.flatMap(charge => charge.elements || [])
    const elementAssessed = element => element.strength && element.strength !== 'Not assessed'
    const strengthAssessmentStarted = allElements.some(elementAssessed)
    const strengthAssessmentAllAssessed = needsChargingDecision && allElements.length > 0 && allElements.every(elementAssessed)

    const informationRequest = shapeInformationRequest(review, _case.defendants)
    const reviewFirstHearing = shapeFirstHearing(review)

    res.render('cases/review-variant-2/index', { _case, review, needsChargingDecision, chargingDecisionStarted, chargingDecisionAllAnswered, strengthAssessmentStarted, strengthAssessmentAllAssessed, informationRequest, reviewFirstHearing })
  })
}
