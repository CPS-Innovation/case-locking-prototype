const _ = require('lodash')
const prisma = require('../lib/prisma')
const { getCompletionStatus } = require('../helpers/dgaReportStatus')

module.exports = router => {
  router.get('/dga-reporting', async (req, res) => {
    const currentUser = req.session.data.user

    // Get user's unit IDs for filtering
    const userUnitIds = currentUser?.units?.map(uu => uu.unitId) || []

    // Get all cases with DGA that have a reviewDate
    const dgaCases = await prisma.case.findMany({
      where: {
        AND: [
          { dga: { isNot: null } },
          { dga: { reviewDate: { not: null } } },
          { unitId: { in: userUnitIds } }
        ]
      },
      include: {
        dga: {
          include: {
            failureReasons: true
          }
        }
      }
    })

    // Group cases by month (YYYY-MM format)
    const monthsMap = new Map()

    dgaCases.forEach(_case => {
      if (!_case.dga?.reviewDate) return

      const date = new Date(_case.dga.reviewDate)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthName = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

      if (!monthsMap.has(monthKey)) {
        monthsMap.set(monthKey, {
          key: monthKey,
          name: monthName,
          deadline: _case.dga.recordDisputeOutcomesDeadline,
          totalCases: 0,
          compliantCases: 0,
          nonCompliantCases: 0,
          completedCases: 0,
          date: date
        })
      }

      const monthData = monthsMap.get(monthKey)
      monthData.totalCases++

      const isNonCompliant = _case.dga.failureReasons.length > 0
      if (isNonCompliant) {
        monthData.nonCompliantCases++
        // Check if all failure reasons have outcomes
        const allCompleted = _case.dga.failureReasons.every(fr => fr.didPoliceDisputeFailure !== null)
        if (allCompleted) {
          monthData.completedCases++
        }
      } else {
        monthData.compliantCases++
      }
    })

    // Convert to array, add status, and sort by date (most recent first)
    // Status is based on non-compliant cases only (compliant cases don't need outcomes recorded)
    const months = Array.from(monthsMap.values())
      .map(month => ({
        ...month,
        status: getCompletionStatus(month.completedCases, month.nonCompliantCases, month.deadline)
      }))
      .sort((a, b) => b.date - a.date)

    res.render('dga-reporting/index', {
      months
    })
  })

  // Show cases for a specific month, grouped by police unit
  router.get('/dga-reporting/:month', async (req, res) => {
    const monthKey = req.params.month // Expected format: YYYY-MM (e.g., "2024-10")
    const currentUser = req.session.data.user

    // Get user's unit IDs for filtering
    const userUnitIds = currentUser?.units?.map(uu => uu.unitId) || []

    // Parse the month key
    const [year, month] = monthKey.split('-').map(Number)

    if (!year || !month || month < 1 || month > 12) {
      return res.redirect('/dga-reporting')
    }

    // Create date range for the month
    const startDate = new Date(year, month - 1, 1) // First day of month
    const endDate = new Date(year, month, 0, 23, 59, 59, 999) // Last day of month

    // Get all cases with DGA for this month
    const dgaCases = await prisma.case.findMany({
      where: {
        AND: [
          { dga: { isNot: null } },
          {
            dga: {
              reviewDate: {
                gte: startDate,
                lte: endDate
              }
            }
          },
          { unitId: { in: userUnitIds } }
        ]
      },
      include: {
        unit: true,
        policeUnit: true,
        defendants: {
          include: {
            charges: true
          }
        },
        dga: {
          include: {
            failureReasons: true
          }
        }
      },
      orderBy: {
        policeUnit: {
          name: 'asc'
        }
      }
    })

    if (dgaCases.length === 0) {
      return res.redirect('/dga-reporting')
    }

    // Group cases by police unit
    const policeUnitsMap = new Map()

    dgaCases.forEach(_case => {
      const policeUnitId = _case.policeUnitId || 0
      const policeUnitName = _case.policeUnit?.name || 'Not specified'

      if (!policeUnitsMap.has(policeUnitId)) {
        policeUnitsMap.set(policeUnitId, {
          id: policeUnitId,
          name: policeUnitName,
          cases: [],
          totalCases: 0,
          compliantCases: 0,
          nonCompliantCases: 0,
          completedCases: 0,
          hasAnyProgress: false,
          sentDate: null,
          hasSentToPolice: false
        })
      }

      const unitData = policeUnitsMap.get(policeUnitId)
      unitData.cases.push(_case)
      unitData.totalCases++

      // Check if this case has been sent to police (they all should have same date)
      if (_case.dga.sentToPoliceDate && !unitData.hasSentToPolice) {
        unitData.sentDate = _case.dga.sentToPoliceDate
        unitData.hasSentToPolice = true
      }

      // Check compliance: non-compliant if has failure reasons
      const isNonCompliant = _case.dga.failureReasons.length > 0
      if (isNonCompliant) {
        unitData.nonCompliantCases++

        // Check if all failure reasons have outcomes (case is fully complete)
        const allCompleted = _case.dga.failureReasons.every(fr => fr.didPoliceDisputeFailure !== null)
        if (allCompleted) {
          unitData.completedCases++
        }

        // Check if any failure reason has an outcome (case has progress)
        const hasAnyOutcome = _case.dga.failureReasons.some(fr => fr.didPoliceDisputeFailure !== null)
        if (hasAnyOutcome) {
          unitData.hasAnyProgress = true
        }
      } else {
        unitData.compliantCases++
      }
    })

    // Get month details
    const monthName = startDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    const deadline = dgaCases.find(c => c.dga?.recordDisputeOutcomesDeadline)?.dga?.recordDisputeOutcomesDeadline
    const isDeadlinePassed = !!(deadline && new Date() > new Date(deadline))

    // Convert to array, add status, and sort alphabetically by police unit name
    // Status is based on non-compliant cases only (compliant cases don't need outcomes recorded)
    const policeUnits = Array.from(policeUnitsMap.values())
      .map(unit => {
        let status
        if (unit.nonCompliantCases === 0 || unit.completedCases === unit.nonCompliantCases) {
          status = 'Completed'
        } else if (isDeadlinePassed) {
          status = 'Deadline passed'
        } else if (unit.hasAnyProgress) {
          status = 'In progress'
        } else {
          status = 'Not started'
        }
        const casesNeedingOutcomes = unit.nonCompliantCases - unit.completedCases
        return { ...unit, status, casesNeedingOutcomes }
      })
      .sort((a, b) => a.name.localeCompare(b.name))

    res.render('dga-reporting/month', {
      monthKey,
      monthName,
      deadline,
      isDeadlinePassed,
      policeUnits,
      totalCases: dgaCases.length
    })
  })

}
