const prisma = require('../lib/prisma')
const { addTimeLimitDates } = require('../helpers/timeLimit')
const { addCaseStatus } = require('../helpers/caseStatus')
const { getCaseDetail } = require('../helpers/caseDetail')
// addTimeLimitDates/addCaseStatus are still used below by the
// complexity-calculation route, which needs its own (lighter) case query.

module.exports = router => {
  router.get("/cases/:caseId", async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    if (isNaN(caseId)) return res.status(404).send('Case not found')

    const { _case, charges, summary, elementsAssessed } = await getCaseDetail(prisma, caseId)

    if (!_case) return res.status(404).send('Case not found')

    res.render("cases/overview/index", { _case, charges, summary, elementsAssessed })
  })

  router.get("/cases/:caseId/complexity-calculation", async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    if (isNaN(caseId)) return res.status(404).send('Case not found')

    let _case = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        unit: true,
        prosecutors: {
          include: {
            user: true
          },
          orderBy: {
            isLead: 'desc'
          }
        },
        paralegalOfficers: {
          include: {
            user: true
          }
        },
        defendants: {
          include: {
            charges: true,
            defenceLawyer: true
          }
        },
        hearings: {
          orderBy: {
            startDate: 'asc'
          },
          take: 1
        },
        location: true,
        tasks: true,
        dga: true
      },
    })

    if (!_case) return res.status(404).send('Case not found')

    addTimeLimitDates(_case)
    addCaseStatus(_case)

    res.render("cases/complexity-calculation/index", { _case })
  })

}
