const prisma = require('../lib/prisma')
const statuses = require('../data/case-statuses')

const outcomeStatusMap = {
  'goes-to-trial': statuses.TRIAL_PREPARATION_NEEDED,
  'pleads-guilty': statuses.SENTENCING_HEARING_PENDING,
  'no-further-action': statuses.NO_FURTHER_ACTION,
}

const outcomeLabelMap = {
  'goes-to-trial': 'Goes to trial',
  'pleads-guilty': 'Pleads guilty',
  'no-further-action': 'No further action',
}

module.exports = (router) => {
  router.get('/cases/:caseId/record-ptph-hearing-outcome', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { defendants: true },
    })

    res.render('cases/record-ptph-hearing-outcome/index', {
      _case,
      selectedOutcome: req.session.data.recordPtphHearingOutcome?.outcome,
    })
  })

  router.post('/cases/:caseId/record-ptph-hearing-outcome', (req, res) => {
    const caseId = req.params.caseId
    req.session.data.recordPtphHearingOutcome = { outcome: req.body.outcome }
    res.redirect(`/cases/${caseId}/record-ptph-hearing-outcome/check`)
  })

  router.get('/cases/:caseId/record-ptph-hearing-outcome/check', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { defendants: true },
    })

    res.render('cases/record-ptph-hearing-outcome/check', { _case })
  })

  router.post('/cases/:caseId/record-ptph-hearing-outcome/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const outcome = req.session.data.recordPtphHearingOutcome?.outcome
    const status = outcomeStatusMap[outcome]

    const hearing = await prisma.hearing.findFirst({
      where: { caseId, type: 'PTPH' },
      include: { defendants: true },
      orderBy: { startDate: 'asc' },
    })

    await prisma.case.update({
      where: { id: caseId },
      data: { status },
    })

    await prisma.activityLog.create({
      data: {
        userId: req.session.data.user.id,
        model: 'Case',
        recordId: caseId,
        action: 'UPDATE',
        title: 'PTPH outcome recorded',
        meta: {
          hearingEventType: 'outcome',
          hearingType: 'PTPH',
          hearingDate: hearing?.startDate,
          venue: hearing?.venue,
          defendants: hearing?.defendants.map(d => ({ firstName: d.firstName, lastName: d.lastName })),
          outcome,
          outcomeLabel: outcomeLabelMap[outcome],
        },
        caseId,
      },
    })

    delete req.session.data.recordPtphHearingOutcome

    req.flash('success', 'PTPH outcome recorded')
    res.redirect(`/cases/${caseId}`)
  })
}
