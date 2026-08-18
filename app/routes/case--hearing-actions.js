const prisma = require('../lib/prisma')
const hearingStatuses = require('../data/hearing-statuses')
const statuses = require('../data/case-statuses')

const outcomesByHearingType = {
  'First hearing': [
    { value: 'trial-in-mags', text: 'Trial in Magistrates Court' },
    { value: 'trial-in-crown-court', text: 'Trial in Crown Court' },
    { value: 'sentencing-hearing', text: 'Sentencing hearing' },
  ],
  'PTPH': [
    { value: 'goes-to-trial', text: 'Goes to trial' },
    { value: 'pleads-guilty', text: 'Pleads guilty' },
    { value: 'no-further-action', text: 'No further action' },
  ],
  'Trial': [
    { value: 'not-guilty', text: 'Not guilty' },
    { value: 'found-guilty', text: 'Found guilty' },
    { value: 'pleads-guilty', text: 'Pleads guilty' },
  ],
  'Sentencing': [
    { value: 'sentenced', text: 'Sentenced' },
    { value: 'adjourned', text: 'Adjourned' },
  ],
}

const nextHearingTypeMap = {
  'trial-in-mags': 'Trial',
  'trial-in-crown-court': 'PTPH',
  'sentencing-hearing': 'Sentencing',
  'goes-to-trial': 'Trial',
  'pleads-guilty': 'Sentencing',
  'found-guilty': 'Sentencing',
  'adjourned': 'Sentencing',
}

const outcomeLabelMap = {
  'trial-in-mags': 'Trial in Magistrates Court',
  'trial-in-crown-court': 'Trial in Crown Court',
  'sentencing-hearing': 'Sentencing hearing',
  'goes-to-trial': 'Goes to trial',
  'pleads-guilty': 'Pleads guilty',
  'no-further-action': 'No further action',
  'not-guilty': 'Not guilty',
  'found-guilty': 'Found guilty',
  'sentenced': 'Sentenced',
  'adjourned': 'Adjourned',
}

const defendantStatusMap = {
  'not-guilty': statuses.NOT_GUILTY,
  'no-further-action': statuses.NO_FURTHER_ACTION,
  'sentenced': statuses.SENTENCED,
}

module.exports = (router) => {
  router.post('/cases/:caseId/hearings/:hearingId/mark-preparation-complete', async (req, res) => {
    const hearingId = parseInt(req.params.hearingId)
    const caseId = parseInt(req.params.caseId)

    const hearing = await prisma.hearing.findUnique({
      where: { id: hearingId },
      include: { defendants: true },
    })

    await prisma.hearing.update({
      where: { id: hearingId },
      data: { status: hearingStatuses.PENDING },
    })

    await prisma.activityLog.create({
      data: {
        userId: req.session.data.user.id,
        model: 'Case',
        recordId: caseId,
        action: 'UPDATE',
        title: `${hearing.type} preparation marked as complete`,
        meta: {
          hearingEventType: 'prep',
          hearingType: hearing.type,
          hearingDate: hearing.startDate,
          defendants: hearing.defendants.map(d => ({ firstName: d.firstName, lastName: d.lastName })),
        },
        caseId,
      },
    })

    req.flash('success', `${hearing.type} preparation marked as complete`)
    res.redirect(req.query.referrer || `/cases/${caseId}/hearings/${hearingId}`)
  })

  router.post('/cases/:caseId/hearings/:hearingId/mark-as-happened', async (req, res) => {
    const hearingId = parseInt(req.params.hearingId)
    const caseId = parseInt(req.params.caseId)

    const hearing = await prisma.hearing.findUnique({
      where: { id: hearingId },
      include: { defendants: true },
    })

    await prisma.hearing.update({
      where: { id: hearingId },
      data: { status: hearingStatuses.OUTCOME_NEEDED },
    })

    await prisma.activityLog.create({
      data: {
        userId: req.session.data.user.id,
        model: 'Case',
        recordId: caseId,
        action: 'UPDATE',
        title: `${hearing.type} marked as happened`,
        meta: {
          hearingEventType: 'happened',
          hearingType: hearing.type,
          hearingDate: hearing.startDate,
          defendants: hearing.defendants.map(d => ({ firstName: d.firstName, lastName: d.lastName })),
        },
        caseId,
      },
    })

    req.flash('success', `${hearing.type} marked as happened`)
    res.redirect(req.query.referrer || `/cases/${caseId}/hearings/${hearingId}`)
  })

  router.get('/cases/:caseId/hearings/:hearingId/record-outcome', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { defendants: true },
    })

    const hearing = await prisma.hearing.findUnique({
      where: { id: parseInt(req.params.hearingId) },
      include: { defendants: true },
    })

    const outcomeItems = outcomesByHearingType[hearing.type] || []

    res.render('cases/hearings/record-outcome/index', {
      _case,
      hearing,
      outcomeItems,
      selectedOutcome: req.session.data.recordHearingOutcome?.outcome,
    })
  })

  router.post('/cases/:caseId/hearings/:hearingId/record-outcome', async (req, res) => {
    const { caseId, hearingId } = req.params
    req.session.data.recordHearingOutcome = { outcome: req.body.outcome }

    if (req.body.outcome === 'trial-in-crown-court') {
      const _case = await prisma.case.findUnique({
        where: { id: parseInt(caseId) },
        include: { unit: true },
      })
      if (_case.unit.type === 'Magistrates') {
        return res.redirect(`/cases/${caseId}/hearings/${hearingId}/record-outcome/select-unit`)
      } else {
        return res.redirect(`/cases/${caseId}/hearings/${hearingId}/record-outcome/change-unit`)
      }
    }

    const nextHearingType = nextHearingTypeMap[req.body.outcome]
    if (nextHearingType) {
      res.redirect(`/cases/${caseId}/hearings/${hearingId}/record-outcome/next-hearing-date`)
    } else {
      res.redirect(`/cases/${caseId}/hearings/${hearingId}/record-outcome/check`)
    }
  })

  router.get('/cases/:caseId/hearings/:hearingId/record-outcome/change-unit', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { unit: true },
    })
    const hearing = await prisma.hearing.findUnique({
      where: { id: parseInt(req.params.hearingId) },
    })
    res.render('cases/hearings/record-outcome/change-unit', {
      _case,
      hearing,
      selectedChangeUnit: req.session.data.recordHearingOutcome?.changeUnit,
    })
  })

  router.post('/cases/:caseId/hearings/:hearingId/record-outcome/change-unit', (req, res) => {
    const { caseId, hearingId } = req.params
    req.session.data.recordHearingOutcome = {
      ...req.session.data.recordHearingOutcome,
      changeUnit: req.body.changeUnit,
    }
    if (req.body.changeUnit === 'Yes') {
      res.redirect(`/cases/${caseId}/hearings/${hearingId}/record-outcome/select-unit`)
    } else {
      res.redirect(`/cases/${caseId}/hearings/${hearingId}/record-outcome/next-hearing-date`)
    }
  })

  router.get('/cases/:caseId/hearings/:hearingId/record-outcome/select-unit', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { unit: true },
    })
    const hearing = await prisma.hearing.findUnique({
      where: { id: parseInt(req.params.hearingId) },
    })
    const units = await prisma.unit.findMany({
      where: { type: { in: ['Crown Court', 'RASSO', 'CCU'] } },
      orderBy: { name: 'asc' },
    })
    const unitItems = units.map(u => ({ value: String(u.id), text: u.name }))
    res.render('cases/hearings/record-outcome/select-unit', {
      _case,
      hearing,
      unitItems,
      selectedUnitId: req.session.data.recordHearingOutcome?.unitId,
    })
  })

  router.post('/cases/:caseId/hearings/:hearingId/record-outcome/select-unit', (req, res) => {
    const { caseId, hearingId } = req.params
    req.session.data.recordHearingOutcome = {
      ...req.session.data.recordHearingOutcome,
      unitId: req.body.unitId,
    }
    res.redirect(`/cases/${caseId}/hearings/${hearingId}/record-outcome/next-hearing-date`)
  })

  router.get('/cases/:caseId/hearings/:hearingId/record-outcome/next-hearing-date', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
    })

    const hearing = await prisma.hearing.findUnique({
      where: { id: parseInt(req.params.hearingId) },
    })

    const outcome = req.session.data.recordHearingOutcome?.outcome
    const nextHearingType = nextHearingTypeMap[outcome]

    res.render('cases/hearings/record-outcome/next-hearing-date', {
      _case,
      hearing,
      nextHearingType,
    })
  })

  router.post('/cases/:caseId/hearings/:hearingId/record-outcome/next-hearing-date', (req, res) => {
    const { caseId, hearingId } = req.params
    req.session.data.recordHearingOutcome = {
      ...req.session.data.recordHearingOutcome,
      nextHearingDate: req.body.recordHearingOutcome?.nextHearingDate,
    }
    res.redirect(`/cases/${caseId}/hearings/${hearingId}/record-outcome/next-hearing-venue`)
  })

  router.get('/cases/:caseId/hearings/:hearingId/record-outcome/next-hearing-venue', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
    })

    const hearing = await prisma.hearing.findUnique({
      where: { id: parseInt(req.params.hearingId) },
    })

    const outcome = req.session.data.recordHearingOutcome?.outcome
    const nextHearingType = nextHearingTypeMap[outcome]

    res.render('cases/hearings/record-outcome/next-hearing-venue', {
      _case,
      hearing,
      nextHearingType,
    })
  })

  router.post('/cases/:caseId/hearings/:hearingId/record-outcome/next-hearing-venue', (req, res) => {
    const { caseId, hearingId } = req.params
    req.session.data.recordHearingOutcome = {
      ...req.session.data.recordHearingOutcome,
      nextHearingVenue: req.body.recordHearingOutcome?.nextHearingVenue,
    }
    res.redirect(`/cases/${caseId}/hearings/${hearingId}/record-outcome/check`)
  })

  router.get('/cases/:caseId/hearings/:hearingId/record-outcome/check', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { defendants: true, unit: true },
    })

    const hearing = await prisma.hearing.findUnique({
      where: { id: parseInt(req.params.hearingId) },
    })

    const outcome = req.session.data.recordHearingOutcome?.outcome
    const nextHearingType = nextHearingTypeMap[outcome]
    const outcomeLabel = outcomeLabelMap[outcome]

    let newUnit = null
    const unitId = req.session.data.recordHearingOutcome?.unitId
    if (unitId) {
      newUnit = await prisma.unit.findUnique({ where: { id: parseInt(unitId) } })
    }

    res.render('cases/hearings/record-outcome/check', {
      _case,
      hearing,
      nextHearingType,
      outcomeLabel,
      newUnit,
    })
  })

  router.post('/cases/:caseId/hearings/:hearingId/record-outcome/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const hearingId = parseInt(req.params.hearingId)
    const { outcome, nextHearingDate, nextHearingVenue, unitId, changeUnit } = req.session.data.recordHearingOutcome

    const [hearing, _case] = await Promise.all([
      prisma.hearing.findUnique({ where: { id: hearingId }, include: { defendants: true } }),
      prisma.case.findUnique({ where: { id: caseId }, include: { defendants: true } }),
    ])

    const defendants = hearing.defendants.length > 0 ? hearing.defendants : _case.defendants

    await prisma.hearing.update({
      where: { id: hearingId },
      data: { status: hearingStatuses.COMPLETE },
    })

    const newDefendantStatus = defendantStatusMap[outcome]
    if (newDefendantStatus) {
      const defendantIds = defendants.map(d => d.id)
      await prisma.defendant.updateMany({
        where: { id: { in: defendantIds } },
        data: { status: newDefendantStatus },
      })

      if (newDefendantStatus === statuses.SENTENCED) {
        await prisma.activityLog.create({
          data: {
            userId: req.session.data.user.id,
            model: 'Case',
            recordId: caseId,
            action: 'UPDATE',
            title: 'Sentenced',
            meta: {
              defendants: defendants.map(d => ({ firstName: d.firstName, lastName: d.lastName })),
              hearingDate: hearing.startDate,
              venue: hearing.venue,
            },
            caseId,
          },
        })
      }
    }

    if (outcome === 'trial-in-crown-court' && changeUnit !== 'No' && unitId) {
      await prisma.caseProsecutor.deleteMany({ where: { caseId } })
      await prisma.caseParalegalOfficer.deleteMany({ where: { caseId } })
      await prisma.case.update({
        where: { id: caseId },
        data: { unitId: parseInt(unitId) },
      })
    }

    const nextHearingType = nextHearingTypeMap[outcome]
    const nextStart = nextHearingDate
      ? new Date(nextHearingDate.year, nextHearingDate.month - 1, nextHearingDate.day)
      : null

    if (nextHearingType && nextStart) {
      await prisma.hearing.create({
        data: {
          caseId,
          startDate: nextStart,
          status: hearingStatuses.PREPARATION_NEEDED,
          type: nextHearingType,
          venue: nextHearingVenue,
          defendants: {
            connect: defendants.map(d => ({ id: d.id })),
          },
        },
      })
    }

    await prisma.activityLog.create({
      data: {
        userId: req.session.data.user.id,
        model: 'Case',
        recordId: caseId,
        action: 'UPDATE',
        title: `${hearing.type} outcome recorded`,
        meta: {
          hearingEventType: 'outcome',
          hearingType: hearing.type,
          hearingDate: hearing.startDate,
          venue: hearing.venue,
          defendants: defendants.map(d => ({ firstName: d.firstName, lastName: d.lastName })),
          outcome,
          outcomeLabel: outcomeLabelMap[outcome],
          nextHearingType: nextHearingType || null,
          nextHearingDate: nextStart,
          nextHearingVenue: nextHearingVenue || null,
        },
        caseId,
      },
    })

    delete req.session.data.recordHearingOutcome

    req.flash('success', 'Hearing outcome recorded')
    res.redirect(`/cases/${caseId}`)
  })
}
