const prisma = require('../lib/prisma')
const statuses = require('../data/case-statuses')

module.exports = (router) => {
  router.get('/cases/:caseId/mark-trial-preparation-complete', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { defendants: true },
    })

    res.render('cases/mark-trial-preparation-complete/index', { _case })
  })

  router.post('/cases/:caseId/mark-trial-preparation-complete', async (req, res) => {
    const caseId = parseInt(req.params.caseId)

    await prisma.case.update({
      where: { id: caseId },
      data: { status: statuses.TRIAL_PENDING },
    })

    await prisma.activityLog.create({
      data: {
        userId: req.session.data.user.id,
        model: 'Case',
        recordId: caseId,
        action: 'UPDATE',
        title: 'Trial preparation marked as complete',
        caseId,
      },
    })

    req.flash('success', 'Trial preparation marked as complete')
    res.redirect(`/cases/${caseId}`)
  })
}
