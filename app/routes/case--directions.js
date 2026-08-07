const _ = require('lodash')
const prisma = require('../lib/prisma')
const { groupDirections } = require('../helpers/directionGrouping')
const { getDirectionStatus } = require('../helpers/directionState')
const { addTimeLimitDates } = require('../helpers/timeLimit')
const { addCaseStatus } = require('../helpers/caseStatus')

module.exports = router => {
  router.get("/cases/:caseId/directions", async (req, res) => {
    let _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: {
        directions: {
          where: { completedDate: null },
          orderBy: [
            { dueDate: 'asc' }
          ],
          include: {
            defendant: true,
            notes: {
              orderBy: {
                createdAt: 'desc'
              },
              take: 1
            }
          }
        },
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
      }
    })

    addTimeLimitDates(_case)
    addCaseStatus(_case)

    // Add status to each direction
    _case.directions = _case.directions.map(direction => {
      direction.status = getDirectionStatus(direction)
      return direction
    })

    // Add grouping metadata
    _case.directions = groupDirections(_case.directions)

    // Sort by date group, then by due date
    _case.directions.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder
      }
      return new Date(a.dueDate) - new Date(b.dueDate)
    })

    res.render("cases/directions/index", { _case })
  })
}
