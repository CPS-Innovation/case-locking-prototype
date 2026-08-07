const prisma = require('../lib/prisma')
const statuses = require('../data/case-statuses')

module.exports = (router) => {
  router.get('/cases/:caseId/no-further-action', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { defendants: true },
    })

    res.render('cases/no-further-action/index', { _case })
  })

  router.post('/cases/:caseId/no-further-action', async (req, res) => {
    const caseId = parseInt(req.params.caseId)

    await prisma.defendant.updateMany({
      where: { cases: { some: { id: caseId } } },
      data: { status: statuses.NO_FURTHER_ACTION },
    })

    await prisma.activityLog.create({
      data: {
        userId: req.session.data.user.id,
        model: 'Case',
        recordId: caseId,
        action: 'UPDATE',
        title: 'Marked as no further action',
        caseId,
      },
    })

    req.flash('success', 'Case marked as no further action')
    res.redirect(`/cases/${caseId}`)
  })
}
