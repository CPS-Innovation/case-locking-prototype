const prisma = require('../lib/prisma')
const statuses = require('../data/case-statuses')

const outcomeStatusMap = {
  'trial-in-magistrates-court': statuses.TRIAL_PREPARATION_NEEDED,
  'pleads-guilty': statuses.SENTENCING_HEARING_PENDING,
}

const outcomeLabelMap = {
  'sent-to-crown-court': 'Sent to Crown Court',
  'trial-in-magistrates-court': 'Trial in Magistrates Court',
  'pleads-guilty': 'Pleads guilty',
}

module.exports = (router) => {
  router.get('/cases/:caseId/record-first-hearing-outcome', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { defendants: true },
    })

    res.render('cases/record-first-hearing-outcome/index', {
      _case,
      selectedOutcome: req.session.data.recordFirstHearingOutcome?.outcome,
    })
  })

  router.post('/cases/:caseId/record-first-hearing-outcome', async (req, res) => {
    const caseId = req.params.caseId
    req.session.data.recordFirstHearingOutcome = { outcome: req.body.outcome }

    if (req.body.outcome === 'sent-to-crown-court') {
      const _case = await prisma.case.findUnique({
        where: { id: parseInt(caseId) },
        include: { unit: true },
      })

      if (_case.unit.type === 'Magistrates') {
        res.redirect(`/cases/${caseId}/record-first-hearing-outcome/select-unit`)
      } else {
        res.redirect(`/cases/${caseId}/record-first-hearing-outcome/change-unit`)
      }
    } else {
      res.redirect(`/cases/${caseId}/record-first-hearing-outcome/check`)
    }
  })

  // Only shown for cases already in a crown court unit
  router.get('/cases/:caseId/record-first-hearing-outcome/change-unit', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { defendants: true, unit: true },
    })

    res.render('cases/record-first-hearing-outcome/change-unit', {
      _case,
      selectedChangeUnit: req.session.data.recordFirstHearingOutcome?.changeUnit,
    })
  })

  router.post('/cases/:caseId/record-first-hearing-outcome/change-unit', (req, res) => {
    const caseId = req.params.caseId
    req.session.data.recordFirstHearingOutcome = {
      ...req.session.data.recordFirstHearingOutcome,
      changeUnit: req.body.changeUnit,
    }

    if (req.body.changeUnit === 'Yes') {
      res.redirect(`/cases/${caseId}/record-first-hearing-outcome/select-unit`)
    } else {
      res.redirect(`/cases/${caseId}/record-first-hearing-outcome/ptph-date`)
    }
  })

  // Shown for mags units (mandatory) and crown court units that want to change
  router.get('/cases/:caseId/record-first-hearing-outcome/select-unit', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { defendants: true, unit: true },
    })

    const units = await prisma.unit.findMany({
      where: { type: { in: ['Crown Court', 'RASSO', 'CCU'] } },
      orderBy: { name: 'asc' },
    })

    const unitItems = units.map(unit => ({
      value: `${unit.id}`,
      text: unit.name,
    }))

    res.render('cases/record-first-hearing-outcome/select-unit', {
      _case,
      unitItems,
      selectedUnitId: req.session.data.recordFirstHearingOutcome?.unitId,
    })
  })

  router.post('/cases/:caseId/record-first-hearing-outcome/select-unit', (req, res) => {
    const caseId = req.params.caseId
    req.session.data.recordFirstHearingOutcome = {
      ...req.session.data.recordFirstHearingOutcome,
      unitId: req.body.unitId,
    }
    res.redirect(`/cases/${caseId}/record-first-hearing-outcome/ptph-date`)
  })

  router.get('/cases/:caseId/record-first-hearing-outcome/ptph-date', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { defendants: true },
    })

    res.render('cases/record-first-hearing-outcome/ptph-date', { _case })
  })

  router.post('/cases/:caseId/record-first-hearing-outcome/ptph-date', (req, res) => {
    const caseId = req.params.caseId
    req.session.data.recordFirstHearingOutcome = {
      ...req.session.data.recordFirstHearingOutcome,
      ptphDate: req.body.recordFirstHearingOutcome?.ptphDate,
    }
    res.redirect(`/cases/${caseId}/record-first-hearing-outcome/ptph-venue`)
  })

  router.get('/cases/:caseId/record-first-hearing-outcome/ptph-venue', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { defendants: true },
    })

    res.render('cases/record-first-hearing-outcome/ptph-venue', { _case })
  })

  router.post('/cases/:caseId/record-first-hearing-outcome/ptph-venue', (req, res) => {
    const caseId = req.params.caseId
    req.session.data.recordFirstHearingOutcome = {
      ...req.session.data.recordFirstHearingOutcome,
      ptphVenue: req.body.recordFirstHearingOutcome?.ptphVenue,
    }
    res.redirect(`/cases/${caseId}/record-first-hearing-outcome/check`)
  })

  router.get('/cases/:caseId/record-first-hearing-outcome/check', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { defendants: true, unit: true },
    })

    const { outcome, unitId } = req.session.data.recordFirstHearingOutcome || {}
    let newUnit = null

    if (outcome === 'sent-to-crown-court' && unitId) {
      newUnit = await prisma.unit.findUnique({ where: { id: parseInt(unitId) } })
    }

    res.render('cases/record-first-hearing-outcome/check', { _case, newUnit })
  })

  router.post('/cases/:caseId/record-first-hearing-outcome/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const { outcome, unitId, changeUnit, ptphDate, ptphVenue } = req.session.data.recordFirstHearingOutcome

    const hearing = await prisma.hearing.findFirst({
      where: { caseId, type: 'First hearing' },
      include: { defendants: true },
      orderBy: { startDate: 'asc' },
    })

    if (outcome === 'sent-to-crown-court') {
      // changeUnit is only set for cases already in a crown court unit (the optional step)
      // For mags cases changeUnit is undefined, and changing unit is mandatory
      const isChangingUnit = changeUnit !== 'No' && unitId

      if (isChangingUnit) {
        await prisma.caseProsecutor.deleteMany({ where: { caseId } })
        await prisma.caseParalegalOfficer.deleteMany({ where: { caseId } })
        await prisma.case.update({
          where: { id: caseId },
          data: { unitId: parseInt(unitId), status: statuses.PROSECUTOR_NEEDED },
        })
      } else {
        await prisma.case.update({
          where: { id: caseId },
          data: { status: statuses.PTPH_HEARING_PENDING },
        })
      }

      const startDate = new Date(ptphDate.year, ptphDate.month - 1, ptphDate.day, 10, 0, 0)
      await prisma.hearing.create({
        data: {
          caseId,
          startDate,
          status: 'Scheduled',
          type: 'PTPH',
          venue: ptphVenue,
        },
      })
    } else {
      await prisma.case.update({
        where: { id: caseId },
        data: { status: outcomeStatusMap[outcome] },
      })
    }

    const nextHearingDate = outcome === 'sent-to-crown-court' && ptphDate
      ? new Date(ptphDate.year, ptphDate.month - 1, ptphDate.day, 10, 0, 0)
      : null

    await prisma.activityLog.create({
      data: {
        userId: req.session.data.user.id,
        model: 'Case',
        recordId: caseId,
        action: 'UPDATE',
        title: 'First hearing outcome recorded',
        meta: {
          hearingEventType: 'outcome',
          hearingType: 'First hearing',
          hearingDate: hearing?.startDate,
          venue: hearing?.venue,
          defendants: hearing?.defendants.map(d => ({ firstName: d.firstName, lastName: d.lastName })),
          outcome,
          outcomeLabel: outcomeLabelMap[outcome],
          nextHearingType: outcome === 'sent-to-crown-court' ? 'PTPH' : null,
          nextHearingDate,
          nextHearingVenue: ptphVenue || null,
        },
        caseId,
      },
    })

    delete req.session.data.recordFirstHearingOutcome

    req.flash('success', 'First hearing outcome recorded')
    res.redirect(`/cases/${caseId}`)
  })
}
