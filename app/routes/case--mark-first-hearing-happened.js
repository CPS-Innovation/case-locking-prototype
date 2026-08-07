const prisma = require('../lib/prisma')
const statuses = require('../data/case-statuses')

module.exports = (router) => {
  router.get('/cases/:caseId/mark-first-hearing-happened', async (req, res) => {
    const caseId = parseInt(req.params.caseId)

    const hearing = await prisma.hearing.findFirst({
      where: { caseId, type: 'First hearing' },
      include: { defendants: true },
      orderBy: { startDate: 'asc' },
    })

    await prisma.case.update({
      where: { id: caseId },
      data: { status: statuses.FIRST_HEARING_OUTCOME_NEEDED },
    })

    await prisma.activityLog.create({
      data: {
        userId: req.session.data.user.id,
        model: 'Case',
        recordId: caseId,
        action: 'UPDATE',
        title: 'First hearing marked as happened',
        meta: {
          hearingEventType: 'happened',
          hearingType: 'First hearing',
          hearingDate: hearing?.startDate,
          defendants: hearing?.defendants.map(d => ({ firstName: d.firstName, lastName: d.lastName })),
        },
        caseId,
      },
    })

    res.redirect(`/cases/${caseId}`)
  })
}
