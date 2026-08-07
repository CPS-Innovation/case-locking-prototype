const prisma = require('../lib/prisma')
const { addTimeLimitDates } = require('../helpers/timeLimit')
const { addCaseStatus } = require('../helpers/caseStatus')

module.exports = router => {
  router.get('/cases/:caseId/hearings', async (req, res) => {
    let _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: {
        hearings: {
          include: { defendants: true }
        },
        unit: true,
        prosecutors: { include: { user: true } },
        paralegalOfficers: { include: { user: true } },
        defendants: { include: { charges: true, defenceLawyer: true } },
        location: true,
        tasks: true,
        dga: true
      }
    })

    addTimeLimitDates(_case)
    addCaseStatus(_case)

    const now = new Date()
    const future = _case.hearings
      .filter(h => new Date(h.startDate) >= now)
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    const past = _case.hearings
      .filter(h => new Date(h.startDate) < now)
      .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
    _case.hearings = [...future, ...past]

    res.render('cases/hearings/index', { _case })
  })
}
