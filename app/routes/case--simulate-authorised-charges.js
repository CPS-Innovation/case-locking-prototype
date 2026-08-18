const prisma = require('../lib/prisma')
const statuses = require('../data/case-statuses')
const hearingStatuses = require('../data/hearing-statuses')

function buildSuggestedFirstHearing() {
  const suggestedDate = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000)
  suggestedDate.setHours(10, 0, 0, 0)
  return { startDate: suggestedDate, venue: "Manchester Magistrates' Court" }
}

module.exports = (router) => {
  router.get('/cases/:caseId/simulate-authorised-charges', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const userId = req.session.data.user.id

    const _case = await prisma.case.findUnique({
      where: { id: caseId },
      include: { defendants: true, policeUnit: true },
    })

    const chargedDefendants = _case.defendants
      .filter(d => d.status === statuses.CHARGES_PENDING)
    const chargedDefendantIds = chargedDefendants.map(d => d.id)

    if (chargedDefendantIds.length) {
      await prisma.defendant.updateMany({
        where: { id: { in: chargedDefendantIds } },
        data: { status: statuses.CHARGED, needsReview: false },
      })
    }

    const document = await prisma.document.create({
      data: {
        caseId,
        name: 'Authorised charges (MG04)',
        description: 'Authorised charges received from the police.',
        type: 'PDF',
        size: 1200,
      },
    })

    await prisma.activityLog.create({
      data: {
        userId: null,
        model: 'Document',
        recordId: document.id,
        action: 'CREATE',
        title: 'Authorised charges received',
        meta: {
          policeUnit: _case.policeUnit ? _case.policeUnit.name : null,
          documents: [{ name: document.name }],
        },
        caseId,
      },
    })

    const hasFirstHearing = (await prisma.hearing.count({
      where: { caseId, type: 'First hearing' },
    })) > 0

    if (!hasFirstHearing && chargedDefendantIds.length) {
      const { startDate, venue } = buildSuggestedFirstHearing()

      const hearing = await prisma.hearing.create({
        data: {
          caseId,
          startDate,
          status: hearingStatuses.PREPARATION_NEEDED,
          type: 'First hearing',
          venue,
          defendants: {
            connect: chargedDefendantIds.map(id => ({ id })),
          },
        },
      })

      await prisma.activityLog.create({
        data: {
          userId,
          model: 'Case',
          recordId: caseId,
          action: 'UPDATE',
          title: 'First hearing added',
          meta: {
            hearingEventType: 'added',
            hearingType: 'First hearing',
            hearingDate: hearing.startDate,
            venue,
          },
          caseId,
        },
      })
    }

    res.redirect(req.query.referrer || `/cases/${caseId}`)
  })
}
