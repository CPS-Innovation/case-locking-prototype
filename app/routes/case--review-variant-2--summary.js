const prisma = require('../lib/prisma')
const { findOrCreateReview } = require('../helpers/caseReview')

module.exports = (router) => {
  // Summary form — GET
  router.get('/cases/:caseId/review-variant-2/summary', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const userId = req.session.data.user.id

    const _case = await prisma.case.findUnique({ where: { id: caseId } })
    const review = await findOrCreateReview(prisma, caseId, userId)

    res.render('cases/review-variant-2/summary/index', { _case, caseId, summary: review.summary || '' })
  })

  // Summary form — POST
  router.post('/cases/:caseId/review-variant-2/summary', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const userId = req.session.data.user.id

    const review = await findOrCreateReview(prisma, caseId, userId)
    await prisma.caseReview.update({
      where: { id: review.id },
      data: { summary: req.body.summary || '' }
    })

    res.redirect(`/cases/${caseId}/review-variant-2/summary/check`)
  })

  // Summary — check answers
  router.get('/cases/:caseId/review-variant-2/summary/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const userId = req.session.data.user.id

    const _case = await prisma.case.findUnique({ where: { id: caseId } })
    const review = await findOrCreateReview(prisma, caseId, userId)

    res.render('cases/review-variant-2/summary/check', { _case, caseId, review })
  })

  router.post('/cases/:caseId/review-variant-2/summary/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const userId = req.session.data.user.id

    const review = await findOrCreateReview(prisma, caseId, userId)
    await prisma.caseReview.update({
      where: { id: review.id },
      data: { summaryComplete: req.body.complete === 'yes' }
    })

    res.redirect(`/cases/${caseId}/review-variant-2`)
  })
}
