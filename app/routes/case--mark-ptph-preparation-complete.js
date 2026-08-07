const prisma = require('../lib/prisma')
const statuses = require('../data/case-statuses')

module.exports = (router) => {
  router.get('/cases/:caseId/mark-ptph-preparation-complete', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { defendants: true },
    })

    res.render('cases/mark-ptph-preparation-complete/index', { _case })
  })

  router.post('/cases/:caseId/mark-ptph-preparation-complete', async (req, res) => {
    const caseId = parseInt(req.params.caseId)

    const hearing = await prisma.hearing.findFirst({
      where: { caseId, type: 'PTPH' },
      include: { defendants: true },
      orderBy: { startDate: 'asc' },
    })

    await prisma.case.update({
      where: { id: caseId },
      data: { status: statuses.PTPH_HEARING_PENDING },
    })

    await prisma.activityLog.create({
      data: {
        userId: req.session.data.user.id,
        model: 'Case',
        recordId: caseId,
        action: 'UPDATE',
        title: 'PTPH preparation marked as complete',
        meta: {
          hearingEventType: 'prep',
          hearingType: 'PTPH',
          hearingDate: hearing?.startDate,
          defendants: hearing?.defendants.map(d => ({ firstName: d.firstName, lastName: d.lastName })),
        },
        caseId,
      },
    })

    req.flash('success', 'PTPH preparation marked as complete')
    res.redirect(`/cases/${caseId}`)
  })
}
