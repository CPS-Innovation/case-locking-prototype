const prisma = require('../lib/prisma')
const { getDgaReportStatus } = require('../helpers/dgaReportStatus')
const { addCaseStatus } = require('../helpers/caseStatus')

module.exports = router => {

  router.get('/cases/:caseId/dga', async (req, res) => {
    const caseId = parseInt(req.params.caseId)

    const _case = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        unit: true,
        prosecutors: { include: { user: true }, orderBy: { isLead: 'desc' } },
        paralegalOfficers: { include: { user: true } },
        defendants: { include: { charges: true, defenceLawyer: true } },
        hearings: { orderBy: { startDate: 'asc' }, take: 1 },
        location: true,
        tasks: true,
        dga: { include: { failureReasons: true } }
      }
    })

    addCaseStatus(_case)

    const outcomesTotal = _case.dga?.failureReasons?.length || 0
    const outcomesCompleted = _case.dga?.failureReasons?.filter(fr => fr.didPoliceDisputeFailure !== null).length || 0
    const outcomesRemaining = outcomesTotal - outcomesCompleted

    const hasDeadlinePassed = !!(
      _case.dga?.recordDisputeOutcomesDeadline &&
      new Date() > new Date(_case.dga.recordDisputeOutcomesDeadline)
    )

    res.render('cases/dga/index', {
      _case,
      outcomesRemaining,
      hasDeadlinePassed,
      reportStatus: getDgaReportStatus(_case)
    })
  })

}
