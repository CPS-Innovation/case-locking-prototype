const prisma = require('../lib/prisma')
const { addTimeLimitDates } = require('../helpers/timeLimit')
const { addCaseStatus } = require('../helpers/caseStatus')

module.exports = router => {

  router.get('/cases/:caseId/ctl-log', async (req, res) => {
    const caseId = parseInt(req.params.caseId)

    let _case = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        defendants: {
          include: {
            charges: true
          }
        },
        witnesses: true,
        dga: true
      }
    })

    addTimeLimitDates(_case)
    addCaseStatus(_case)

    const entries = await prisma.ctlLogEntry.findMany({
      where: { caseId },
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    })

    _case.ctlLogEntries = entries

    res.render('cases/ctl-log/index', { _case })
  })

  router.get('/cases/:caseId/ctl-log/:entryId', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const entryId = parseInt(req.params.entryId)

    const _case = await prisma.case.findUnique({
      where: { id: caseId },
      include: { defendants: true, witnesses: true }
    })

    const entry = await prisma.ctlLogEntry.findUnique({
      where: { id: entryId },
      include: { user: true }
    })

    res.render('cases/ctl-log/show', { _case, entry })
  })

}
