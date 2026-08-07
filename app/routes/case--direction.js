const _ = require('lodash')
const prisma = require('../lib/prisma')
const { getDirectionStatus } = require('../helpers/directionState')
const { addTimeLimitDates } = require('../helpers/timeLimit')
const { addCaseStatus } = require('../helpers/caseStatus')

module.exports = router => {
  router.get("/cases/:caseId/directions/:directionId", async (req, res) => {
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
      where: { id: parseInt(req.params.directionId) },
      include: {
        case: {
          include: {
            defendants: {
              include: {
                charges: true,
                defenceLawyer: true
              }
            },
            unit: true
          }
        },
        defendant: true,
        notes: {
          include: {
            user: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    // Add status to direction
    direction.status = getDirectionStatus(direction)

    res.render("cases/directions/show", { _case, direction })
  })
}
