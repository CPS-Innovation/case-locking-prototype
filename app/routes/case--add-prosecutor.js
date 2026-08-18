const _ = require('lodash')
const prisma = require('../lib/prisma')

async function getRecommendedProsecutor(excludedIds = []) {
  const excludeFilter = excludedIds.length ? { NOT: { id: { in: excludedIds } } } : {}

  let prosecutor = await prisma.user.findFirst({
    where: {
      role: 'Prosecutor',
      firstName: 'Michael',
      lastName: 'Chen',
      ...excludeFilter,
    },
    select: { id: true, firstName: true, lastName: true },
  })

  if (!prosecutor) {
    prosecutor = await prisma.user.findFirst({
      where: { role: 'Prosecutor', ...excludeFilter },
      select: { id: true, firstName: true, lastName: true },
    })
  }

  return prosecutor
}

async function getProsecutorListData(excludedIds = []) {
  let prosecutors = await prisma.user.findMany({
    where: {
      role: 'Prosecutor',
      ...(excludedIds.length && { NOT: { id: { in: excludedIds } } }),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      units: {
        include: {
          unit: true,
        },
      },
      specialistAreas: true,
      preferredAreas: true,
      restrictedAreas: true,
      _count: {
        select: {
          caseProsecutors: true,
        },
      },
      caseProsecutors: {
        include: {
          case: {
            select: {
              id: true,
              complexity: true,
              defendants: {
                select: {
                  charges: {
                    select: {
                      custodyTimeLimit: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  prosecutors = prosecutors.map((prosecutor, index) => {
    if (prosecutor.firstName === 'Michael' && prosecutor.lastName === 'Chen') {
      return {
        ...prosecutor,
        _count: { caseProsecutors: 10 },
        basicCases: Array(3).fill({}),
        basicPlusCases: Array(3).fill({}),
        standardCases: Array(2).fill({}),
        highCases: Array(1).fill({}),
        complexCases: Array(1).fill({}),
        ctlCases: Array(2).fill({}),
        stlCases: Array(2).fill({}),
        totalCases: 10,
        ctlCaseCount: 2,
        stlCaseCount: 2,
      }
    }

    const cases = prosecutor.caseProsecutors?.map((cp) => cp.case) || []

    const ctlCases = cases.filter((c) => {
      return c.defendants.some((d) => d.charges.some((ch) => ch.custodyTimeLimit !== null))
    })

    const basicCases = cases.filter((c) => c.complexity === 'Basic')
    const basicPlusCases = cases.filter((c) => c.complexity === 'BasicPlus')
    const standardCases = cases.filter((c) => c.complexity === 'Standard')
    const highCases = cases.filter((c) => c.complexity === 'High')
    const complexCases = cases.filter((c) => c.complexity === 'Complex')

    return {
      ...prosecutor,
      basicCases,
      basicPlusCases,
      standardCases,
      highCases,
      complexCases,
      ctlCases,
      totalCases: prosecutor._count.caseProsecutors,
      ctlCaseCount: ctlCases.length,
    }
  })

  prosecutors.sort((a, b) => a.totalCases - b.totalCases || a.ctlCaseCount - b.ctlCaseCount)

  const michaelChenIndex = prosecutors.findIndex(
    (p) => p.firstName === 'Michael' && p.lastName === 'Chen',
  )
  if (michaelChenIndex !== -1) {
    prosecutors[michaelChenIndex].didInitialReview = true
    prosecutors[michaelChenIndex].recommended = true
    const michaelChen = prosecutors.splice(michaelChenIndex, 1)[0]
    prosecutors.unshift(michaelChen)

    const otherProsecutors = prosecutors.slice(1).filter((p) => p.totalCases <= 10)

    const caseLoadProfiles = [
      { total: 11, ctl: 1, stl: 0, basic: 4, basicPlus: 3, standard: 2, high: 1, complex: 1 },
      { total: 13, ctl: 1, stl: 1, basic: 5, basicPlus: 3, standard: 2, high: 2, complex: 1 },
      { total: 15, ctl: 2, stl: 1, basic: 5, basicPlus: 4, standard: 3, high: 2, complex: 1 },
      { total: 17, ctl: 2, stl: 1, basic: 6, basicPlus: 4, standard: 3, high: 2, complex: 2 },
      { total: 20, ctl: 2, stl: 2, basic: 7, basicPlus: 5, standard: 4, high: 2, complex: 2 },
      { total: 22, ctl: 3, stl: 2, basic: 8, basicPlus: 5, standard: 4, high: 3, complex: 2 },
      { total: 24, ctl: 3, stl: 2, basic: 8, basicPlus: 6, standard: 5, high: 3, complex: 2 },
      { total: 27, ctl: 3, stl: 3, basic: 9, basicPlus: 7, standard: 6, high: 3, complex: 2 },
      { total: 29, ctl: 4, stl: 3, basic: 10, basicPlus: 7, standard: 6, high: 4, complex: 2 },
      { total: 31, ctl: 4, stl: 3, basic: 10, basicPlus: 8, standard: 7, high: 4, complex: 2 },
      { total: 33, ctl: 4, stl: 4, basic: 11, basicPlus: 8, standard: 7, high: 4, complex: 3 },
      { total: 36, ctl: 5, stl: 4, basic: 12, basicPlus: 9, standard: 8, high: 5, complex: 2 },
      { total: 38, ctl: 5, stl: 5, basic: 13, basicPlus: 9, standard: 8, high: 5, complex: 3 },
      { total: 40, ctl: 6, stl: 5, basic: 14, basicPlus: 10, standard: 8, high: 5, complex: 3 },
    ]

    const enrichedOthers = otherProsecutors.slice(0, 14).map((prosecutor, i) => {
      const p = caseLoadProfiles[i]
      return {
        ...prosecutor,
        _count: { caseProsecutors: p.total },
        basicCases: Array(p.basic).fill({}),
        basicPlusCases: Array(p.basicPlus).fill({}),
        standardCases: Array(p.standard).fill({}),
        highCases: Array(p.high).fill({}),
        complexCases: Array(p.complex).fill({}),
        ctlCases: Array(p.ctl).fill({}),
        stlCases: Array(p.stl).fill({}),
        totalCases: p.total,
        ctlCaseCount: p.ctl,
      }
    })

    prosecutors = [michaelChen, ...enrichedOthers]
  } else {
    prosecutors[0].didInitialReview = true
    prosecutors[0].recommended = true
    prosecutors = prosecutors.slice(0, 15)
  }

  return prosecutors.map((prosecutor) => {
    return {
      name: `${prosecutor.firstName} ${prosecutor.lastName}`,
      recommended: prosecutor.recommended || false,
      value: `${prosecutor.id}`,
      didInitialReview: prosecutor.didInitialReview || false,
      specialistAreas: prosecutor.specialistAreas.map((a) => a.name),
      totalCases: prosecutor._count.caseProsecutors,
      ctlCases: prosecutor.ctlCases?.length || 0,
      stlCases: prosecutor.stlCases?.length || 0,
      basicCases: prosecutor.basicCases?.length || 0,
      basicPlusCases: prosecutor.basicPlusCases?.length || 0,
      standardCases: prosecutor.standardCases?.length || 0,
      highCases: prosecutor.highCases?.length || 0,
      complexCases: prosecutor.complexCases?.length || 0,
    }
  })
}

module.exports = (router) => {
  router.get('/cases/:caseId/add-prosecutor', async (req, res) => {
    const caseId = parseInt(req.params.caseId)

    const _case = await prisma.case.findUnique({
      where: { id: caseId },
    })

    const assigned = await prisma.caseProsecutor.findMany({
      where: { caseId },
      select: { userId: true },
    })
    const excludedIds = assigned.map((a) => a.userId)

    const selectedProsecutorId = req.session.data.assignProsecutor?.prosecutor
    const prosecutorItems = (await getProsecutorListData(excludedIds)).map((p) => ({
      ...p,
      selected: p.value === selectedProsecutorId,
    }))

    res.render('cases/add-prosecutor/index', {
      _case,
      prosecutorItems,
    })
  })

  router.post('/cases/:caseId/add-prosecutor', async (req, res) => {
    res.redirect(`/cases/${req.params.caseId}/add-prosecutor/check`)
  })

  router.get('/cases/:caseId/add-prosecutor/choose', (req, res) => {
    res.redirect(`/cases/${req.params.caseId}/add-prosecutor`)
  })

  router.get('/cases/:caseId/add-prosecutor/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)

    const _case = await prisma.case.findUnique({
      where: { id: caseId },
    })

    const prosecutor = await prisma.user.findUnique({
      where: { id: parseInt(req.session.data.assignProsecutor.prosecutor) },
      include: {
        caseProsecutors: {
          include: {
            case: { select: { id: true, complexity: true } },
          },
        },
        _count: { select: { caseProsecutors: true } },
      },
    })

    res.render('cases/add-prosecutor/check', {
      _case,
      prosecutor,
    })
  })

  router.post('/cases/:caseId/add-prosecutor/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const prosecutorId = parseInt(req.session.data.assignProsecutor.prosecutor)

    const existingCount = await prisma.caseProsecutor.count({ where: { caseId } })

    await prisma.caseProsecutor.create({
      data: {
        caseId: caseId,
        userId: prosecutorId,
        isLead: existingCount === 0,
      },
    })

    const prosecutor = await prisma.user.findUnique({
      where: { id: prosecutorId },
      select: { id: true, firstName: true, lastName: true },
    })

    await prisma.activityLog.create({
      data: {
        userId: req.session.data.user.id,
        model: 'Case',
        recordId: caseId,
        action: 'UPDATE',
        title: 'Prosecutor added to case',
        caseId: caseId,
        meta: { prosecutor },
      },
    })

    delete req.session.data.assignProsecutor

    req.flash('success', 'Prosecutor added to case')
    res.redirect(`/cases/${req.params.caseId}`)
  })
}
