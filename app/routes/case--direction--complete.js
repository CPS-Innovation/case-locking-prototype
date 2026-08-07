const prisma = require('../lib/prisma')
const { addTimeLimitDates } = require('../helpers/timeLimit')
const { addCaseStatus } = require('../helpers/caseStatus')

module.exports = router => {
  router.get("/cases/:caseId/directions/:directionId/complete", async (req, res) => {
    let _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: {
        unit: true,
        prosecutors: {
          include: {
            user: true
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

    addTimeLimitDates(_case)
    addCaseStatus(_case)

    const direction = await prisma.direction.findUnique({
      where: { id: parseInt(req.params.directionId) }
    })

    res.render("cases/directions/complete/index", { _case, direction })
  })

  router.post("/cases/:caseId/directions/:directionId/complete", async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const directionId = parseInt(req.params.directionId)

    const direction = await prisma.direction.update({
      where: { id: directionId },
      data: {
        completedDate: new Date()
      }
    })

    await prisma.activityLog.create({
      data: {
        userId: req.session.data.user.id,
        model: 'Direction',
        recordId: direction.id,
        action: 'UPDATE',
        title: 'Direction completed',
        caseId,
        meta: {
          direction: {
            id: direction.id,
            description: direction.description
          }
        }
      }
    })

    req.flash('success', 'Direction completed')
    res.redirect(`/cases/${caseId}/directions`)
  })
}
