const _ = require('lodash')
const prisma = require('../lib/prisma')
const { getTaskSeverity } = require('../helpers/taskState')
const { addTimeLimitDates } = require('../helpers/timeLimit')
const { addCaseStatus } = require('../helpers/caseStatus')
const { getDateGroup, getPaceClockGroup } = require('../helpers/taskGrouping')
const { getDateGroup: getCaseDateGroup, getPaceClockGroup: getCasePaceClockGroup } = require('../helpers/caseGrouping')
const statuses = require('../data/case-statuses')

module.exports = router => {

  router.get("/overview", async (req, res) => {
    const currentUser = req.session.data.user
    const userUnitIds = currentUser?.units?.map(uu => uu.unitId) || []

    const unitFilter = userUnitIds.length ? { unitId: { in: userUnitIds } } : {}

    const prosecutorScopeFilter = currentUser.role === 'Prosecutor'
      ? { prosecutors: { some: { userId: currentUser.id } } }
      : {}

    const unassignedCaseCount = await prisma.case.count({
      where: {
        ...unitFilter,
        prosecutors: {
          none: {}
        }
      }
    })

    const needsReviewCaseCount = await prisma.case.count({
      where: { ...unitFilter, ...prosecutorScopeFilter, defendants: { some: { needsReview: true } } }
    })

    const chargedCaseCount = await prisma.case.count({
      where: { ...unitFilter, defendants: { some: { status: statuses.CHARGED } } }
    })

    const chargesPendingCaseCount = await prisma.case.count({
      where: { ...unitFilter, ...prosecutorScopeFilter, defendants: { some: { status: statuses.CHARGES_PENDING } } }
    })

    const firstHearingNeededCount = await prisma.case.count({
      where: {
        ...unitFilter,
        defendants: {
          some: {
            status: statuses.CHARGED,
            hearings: { none: { type: 'First hearing' } },
          },
        },
      }
    })

    const hearingPrepNeededCaseCount = await prisma.case.count({
      where: { ...unitFilter, ...prosecutorScopeFilter, hearings: { some: { status: 'Hearing preparation needed' } } }
    })

    const hearingOutcomeNeededCaseCount = await prisma.case.count({
      where: { ...unitFilter, hearings: { some: { status: 'Hearing outcome needed' } } }
    })

    const activeStatuses = [
      statuses.NOT_CHARGED,
      statuses.CHARGES_PENDING,
      statuses.CHARGED
    ]

    const needsProsecutorCount = await prisma.case.count({
      where: {
        ...unitFilter,
        prosecutors: { none: {} },
        defendants: { some: { status: { in: activeStatuses } } }
      }
    })

    const needsParalegalOfficerCount = await prisma.case.count({
      where: {
        ...unitFilter,
        paralegalOfficers: { none: {} },
        defendants: { some: { status: { in: activeStatuses } } }
      }
    })

    const magsNeedsProsecutorCount = await prisma.case.count({
      where: {
        ...unitFilter,
        unit: { type: 'Magistrates' },
        prosecutors: { none: {} },
        defendants: {
          some: {
            status: {
              in: [
                statuses.NOT_CHARGED,
                statuses.CHARGES_PENDING,
                statuses.CHARGED
              ]
            }
          }
        }
      }
    })

    const crownNeedsProsecutorCount = await prisma.case.count({
      where: {
        ...unitFilter,
        unit: { type: 'Crown Court' },
        prosecutors: { none: {} },
        defendants: { some: { status: { in: activeStatuses } } }
      }
    })

    const crownNeedsParalegalOfficerCount = await prisma.case.count({
      where: {
        ...unitFilter,
        unit: { type: 'Crown Court' },
        paralegalOfficers: { none: {} },
        defendants: { some: { status: { in: activeStatuses } } }
      }
    })

    // Count prosecutors with incomplete profiles (no specialist, preferred, or restricted areas)
    const allProsecutors = await prisma.user.findMany({
      where: {
        role: 'Prosecutor'
      },
      include: {
        specialistAreas: true,
        preferredAreas: true,
        restrictedAreas: true
      }
    })

    const incompleteProfileCount = allProsecutors.filter(prosecutor =>
      prosecutor.specialistAreas.length === 0 &&
      prosecutor.preferredAreas.length === 0 &&
      prosecutor.restrictedAreas.length === 0
    ).length

    const needsDGAReviewCount = await prisma.case.count({
      where: {
        dga: {
          failureReasons: {
            some: {
              didPoliceDisputeFailure: null
            }
          }
        }
      }
    })

    // Find the latest DGA month with cases needing outcomes
    const dgaCasesNeedingOutcomes = await prisma.dGA.findMany({
      where: {
        reviewDate: { not: null },
        failureReasons: {
          some: {
            didPoliceDisputeFailure: null
          }
        }
      },
      include: {
        failureReasons: true
      }
    })

    // Group by month and find the latest one
    let latestDGAMonth = null
    if (dgaCasesNeedingOutcomes.length > 0) {
      const monthGroups = {}
      dgaCasesNeedingOutcomes.forEach(dga => {
        const date = new Date(dga.reviewDate)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        if (!monthGroups[monthKey]) {
          monthGroups[monthKey] = {
            key: monthKey,
            deadline: dga.recordDisputeOutcomesDeadline,
            count: 0
          }
        }
        monthGroups[monthKey].count++
      })

      const sortedMonths = Object.values(monthGroups).sort((a, b) => b.key.localeCompare(a.key))
      if (sortedMonths.length > 0) {
        const latest = sortedMonths[0]
        const [year, month] = latest.key.split('-')
        const monthName = new Date(year, parseInt(month) - 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' })
        latestDGAMonth = {
          key: latest.key,
          name: monthName,
          deadline: latest.deadline,
          count: latest.count
        }
      }
    }

    // Count urgent tasks assigned to current user
    const urgentTaskCount = await prisma.task.count({
      where: {
        AND: [
          { completedDate: null },
          { assignedToUserId: currentUser.id },
          { case: { unitId: { in: userUnitIds } } },
          { isUrgent: true }
        ]
      }
    })

    // Count priority charging tasks assigned to current user
    const priorityChargingTaskCount = await prisma.task.count({
      where: {
        AND: [
          { completedDate: null },
          { assignedToUserId: currentUser.id },
          { case: { unitId: { in: userUnitIds } } },
          {
            OR: [
              { name: 'Priority PCD review' },
              { name: 'Priority resubmitted PCD case' }
            ]
          }
        ]
      }
    })

    const adminPoolTaskCount = await prisma.task.count({
      where: {
        AND: [
          { completedDate: null },
          { case: { unitId: { in: userUnitIds } } },
          { assignedToTeam: { name: 'Admin pool' } }
        ]
      }
    })

    const unitPriorityChargingTaskCount = await prisma.task.count({
      where: {
        AND: [
          { completedDate: null },
          { case: { unitId: { in: userUnitIds } } },
          {
            OR: [
              { name: 'Priority PCD review' },
              { name: 'Priority resubmitted PCD case' }
            ]
          }
        ]
      }
    })

    // Fetch tasks assigned to current user with case and defendant info for time limit calculation
    let tasks = await prisma.task.findMany({
      where: {
        AND: [
          { completedDate: null },
          { assignedToUserId: currentUser.id },
          { case: { unitId: { in: userUnitIds } } }
        ]
      },
      include: {
        case: {
          include: {
            defendants: {
              include: {
                charges: true
              }
            }
          }
        }
      }
    })

    // Calculate severity for each task and group by severity
    const tasksBySeverity = {
      'Critically overdue': [],
      'Overdue': [],
      'Due soon': [],
      'Not due yet': []
    }

    // Initialize counters for each time limit type and range
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const ctlCountsByRange = {
      overdue: 0,
      today: 0,
      tomorrow: 0,
      thisWeek: 0,
      nextWeek: 0,
      later: 0
    }

    const stlCountsByRange = {
      overdue: 0,
      today: 0,
      tomorrow: 0,
      thisWeek: 0,
      nextWeek: 0,
      later: 0
    }

    const paceClockCountsByRange = {
      expired: 0,
      lessThan1Hour: 0,
      lessThan2Hours: 0,
      lessThan3Hours: 0,
      moreThan3Hours: 0
    }

    tasks.forEach(task => {
      const severity = getTaskSeverity(task)
      if (tasksBySeverity[severity]) {
        tasksBySeverity[severity].push(task)
      }

      // Calculate time limit info for this task's case
      addTimeLimitDates(task.case)
      addCaseStatus(task.case)

      // Count by CTL date range
      if (task.case.custodyTimeLimit) {
        const ctlGroupKey = getDateGroup(task.case.custodyTimeLimit, today)
        if (ctlGroupKey !== 'noDate' && ctlCountsByRange[ctlGroupKey] !== undefined) {
          ctlCountsByRange[ctlGroupKey]++
        }
      }

      // Count by STL date range
      if (task.case.statutoryTimeLimit) {
        const stlGroupKey = getDateGroup(task.case.statutoryTimeLimit, today)
        if (stlGroupKey !== 'noDate' && stlCountsByRange[stlGroupKey] !== undefined) {
          stlCountsByRange[stlGroupKey]++
        }
      }

      // Count by PACE clock time range
      if (task.case.paceClock) {
        const paceGroupKey = getPaceClockGroup(task.case.paceClock)
        if (paceGroupKey !== 'noPaceClock' && paceClockCountsByRange[paceGroupKey] !== undefined) {
          paceClockCountsByRange[paceGroupKey]++
        }
      }
    })

    // Fetch cases for high priority section — role scoped
    const casePriorityWhere = { unitId: { in: userUnitIds } }
    if (currentUser.role === 'Prosecutor') {
      casePriorityWhere.prosecutors = { some: { userId: currentUser.id } }
    }

    const priorityCases = await prisma.case.findMany({
      where: casePriorityWhere,
      include: {
        defendants: { include: { charges: true } },
        hearings: { select: { status: true, startDate: true } }
      }
    })

    const caseCTLCountsByRange = { overdue: 0, today: 0, tomorrow: 0 }
    const caseSTLCountsByRange = { overdue: 0, today: 0, tomorrow: 0 }
    const casePaceClockCountsByRange = { expired: 0, lessThan1Hour: 0, lessThan2Hours: 0, lessThan3Hours: 0, moreThan3Hours: 0 }
    const caseHearingPrepCountsByRange = { overdue: 0, today: 0, tomorrow: 0, thisWeek: 0, nextWeek: 0 }

    const overviewToday = new Date()
    overviewToday.setHours(0, 0, 0, 0)

    priorityCases.forEach(_case => {
      addTimeLimitDates(_case)
      const ctlGroup = getCaseDateGroup(_case.custodyTimeLimit, overviewToday)
      if (caseCTLCountsByRange[ctlGroup] !== undefined) caseCTLCountsByRange[ctlGroup]++
      const stlGroup = getCaseDateGroup(_case.statutoryTimeLimit, overviewToday)
      if (caseSTLCountsByRange[stlGroup] !== undefined) caseSTLCountsByRange[stlGroup]++
      const paceGroup = getCasePaceClockGroup(_case.paceClock)
      if (casePaceClockCountsByRange[paceGroup] !== undefined) casePaceClockCountsByRange[paceGroup]++

      const prepHearings = _case.hearings.filter(h => h.status === 'Hearing preparation needed')
      if (prepHearings.length) {
        const nearestPrep = new Date(Math.min(...prepHearings.map(h => new Date(h.startDate))))
        const prepGroup = getCaseDateGroup(nearestPrep, overviewToday)
        if (caseHearingPrepCountsByRange[prepGroup] !== undefined) caseHearingPrepCountsByRange[prepGroup]++
      }
    })

    // Fetch directions for cases assigned to current user (as prosecutor or paralegal officer)
    // Only include directions assigned to Prosecution
    const directionWhere = {
      AND: [
        { completedDate: null },
        { assignee: 'Prosecution' },
        {
          case: {
            unitId: { in: userUnitIds }
          }
        }
      ]
    }

    // Filter by current user's role
    if (currentUser.role === 'Prosecutor') {
      directionWhere.AND.push({
        case: {
          prosecutors: {
            some: { userId: currentUser.id }
          }
        }
      })
    } else if (currentUser.role === 'Paralegal officer') {
      directionWhere.AND.push({
        case: {
          paralegalOfficers: {
            some: { userId: currentUser.id }
          }
        }
      })
    }

    let directions = await prisma.direction.findMany({
      where: directionWhere
    })

    // Categorize directions by due date (reuse today from above)
    // const today is already defined earlier for time limit grouping

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    let dueTodayDirectionCount = 0
    let dueTomorrowDirectionCount = 0
    let overdueDirectionCount = 0

    directions.forEach(direction => {
      const dueDate = new Date(direction.dueDate)
      dueDate.setHours(0, 0, 0, 0)

      if (dueDate < today) {
        overdueDirectionCount++
      } else if (dueDate.getTime() === today.getTime()) {
        dueTodayDirectionCount++
      } else if (dueDate.getTime() === tomorrow.getTime()) {
        dueTomorrowDirectionCount++
      }
    })

    // Count cases assigned to current user as prosecutor
    let prosecutorCaseCount = 0
    if (currentUser.role === 'Prosecutor') {
      prosecutorCaseCount = await prisma.case.count({
        where: {
          prosecutors: {
            some: {
              userId: currentUser.id
            }
          }
        }
      })
    }

    // Count cases assigned to current user as paralegal officer
    let paralegalOfficerCaseCount = 0
    if (currentUser.role === 'Paralegal officer') {
      paralegalOfficerCaseCount = await prisma.case.count({
        where: {
          paralegalOfficers: {
            some: {
              userId: currentUser.id
            }
          }
        }
      })
    }

    const unitBreakdownActiveStatuses = [
      statuses.NOT_CHARGED,
      statuses.CHARGES_PENDING,
      statuses.CHARGED
    ]

    let unitBreakdown = []
    if (userUnitIds.length > 1) {
      unitBreakdown = await Promise.all(
        currentUser.units.map(async ({ unit }) => {
          const f = { unitId: unit.id }
          const isCrownCourt = unit.type === 'Crown Court'

          const [notCharged, needsProsecutor, needsParalegalOfficer, firstHearingNeeded] = await Promise.all([
            prisma.case.count({ where: { ...f, defendants: { some: { status: statuses.NOT_CHARGED } } } }),
            prisma.case.count({ where: { ...f, prosecutors: { none: {} }, defendants: { some: { status: { in: unitBreakdownActiveStatuses } } } } }),
            isCrownCourt
              ? prisma.case.count({ where: { ...f, paralegalOfficers: { none: {} }, defendants: { some: { status: { in: unitBreakdownActiveStatuses } } } } })
              : Promise.resolve(null),
            prisma.case.count({ where: { ...f, defendants: { some: { status: statuses.CHARGED, hearings: { none: { type: 'First hearing' } } } } } }),
          ])

          return { unit, isCrownCourt, counts: { notCharged, needsProsecutor, needsParalegalOfficer, firstHearingNeeded } }
        })
      )
    }

    const unitBreakdownHasCrownUnits = unitBreakdown.some(row => row.isCrownCourt)

    const recentCases = await prisma.recentCase.findMany({
      where: { userId: currentUser.id },
      orderBy: { openedAt: 'desc' },
      take: 5,
      include: {
        case: {
          include: {
            defendants: true
          }
        }
      }
    })

    res.render('overview/index', {
      unassignedCaseCount,
      needsReviewCaseCount,
      chargedCaseCount,
      chargesPendingCaseCount,
      firstHearingNeededCount,
      hearingPrepNeededCaseCount,
      hearingOutcomeNeededCaseCount,
      needsProsecutorCount,
      needsParalegalOfficerCount,
      magsNeedsProsecutorCount,
      crownNeedsProsecutorCount,
      crownNeedsParalegalOfficerCount,
      incompleteProfileCount,
      needsDGAReviewCount,
      latestDGAMonth,
      urgentTaskCount,
      priorityChargingTaskCount,
      adminPoolTaskCount,
      unitPriorityChargingTaskCount,
      ctlCountsByRange,
      stlCountsByRange,
      paceClockCountsByRange,
      criticallyOverdueTaskCount: tasksBySeverity['Critically overdue'].length,
      overdueTaskCount: tasksBySeverity['Overdue'].length,
      dueSoonTaskCount: tasksBySeverity['Due soon'].length,
      notDueYetTaskCount: tasksBySeverity['Not due yet'].length,
      dueTodayDirectionCount,
      dueTomorrowDirectionCount,
      overdueDirectionCount,
      prosecutorCaseCount,
      paralegalOfficerCaseCount,
      recentCases,
      unitBreakdown,
      unitBreakdownHasCrownUnits,
      caseCTLCountsByRange,
      caseSTLCountsByRange,
      casePaceClockCountsByRange,
      caseHearingPrepCountsByRange
    })
  })

}