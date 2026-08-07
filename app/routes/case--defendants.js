const _ = require('lodash')
const prisma = require('../lib/prisma')
const { addTimeLimitDates } = require('../helpers/timeLimit')
const { addCaseStatus } = require('../helpers/caseStatus')
const statuses = require('../data/case-statuses')

async function getCaseForDefendant(caseId) {
  return prisma.case.findUnique({
    where: { id: caseId },
    include: {
      unit: true,
      prosecutors: { include: { user: true } },
      paralegalOfficers: { include: { user: true } },
      defendants: { include: { charges: true, defenceLawyer: true } },
      location: true,
      tasks: true,
      dga: true
    }
  })
}

module.exports = router => {
  router.get('/cases/:caseId/defendants/:defendantId', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const defendantId = parseInt(req.params.defendantId)

    let _case = await getCaseForDefendant(caseId)
    addTimeLimitDates(_case)
    addCaseStatus(_case)

    const defendant = _case.defendants.find(d => d.id === defendantId)
    if (!defendant) return res.status(404).send('Defendant not found')

    res.render('cases/defendants/show', { _case, defendant })
  })

  async function getDefendant(caseId, defendantId) {
    const _case = await getCaseForDefendant(caseId)
    const defendant = _case.defendants.find(d => d.id === defendantId)
    addTimeLimitDates(_case)
    addCaseStatus(_case)
    return { _case, defendant }
  }

  function buildDefendantItems(defendants) {
    return defendants.map(d => ({ value: String(d.id), text: `${d.firstName} ${d.lastName}` }))
  }

  // --- Simulate advance ---

  router.get('/cases/:caseId/defendants/:defendantId/simulate-advance', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const defendantId = parseInt(req.params.defendantId)
    const { _case, defendant } = await getDefendant(caseId, defendantId)
    const eligibleDefendants = _case.defendants.filter(d => d.status === statuses.NOT_CHARGED && d.needsReview === defendant.needsReview)
    if (eligibleDefendants.length > 1) {
      const selectedDefendantIds = req.session.data.simulateAdvance?.defendantIds || eligibleDefendants.map(d => String(d.id))
      res.render('cases/defendants/simulate-advance', { _case, defendant, eligibleDefendants, defendantItems: buildDefendantItems(eligibleDefendants), selectedDefendantIds })
    } else {
      res.render('cases/defendants/simulate-advance', { _case, defendant })
    }
  })

  router.post('/cases/:caseId/defendants/:defendantId/simulate-advance', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const defendantId = parseInt(req.params.defendantId)
    if (req.body.simulateAdvance?.defendants) {
      req.session.data.simulateAdvance = {
        defendantIds: [].concat(req.body.simulateAdvance.defendants).filter(id => id !== '_unchecked'),
      }
      res.redirect(`/cases/${caseId}/defendants/${defendantId}/simulate-advance/check`)
    } else {
      await prisma.defendant.update({ where: { id: defendantId }, data: { needsReview: true } })
      req.flash('success', 'Status updated')
      res.redirect(`/cases/${caseId}/defendants/${defendantId}`)
    }
  })

  router.get('/cases/:caseId/defendants/:defendantId/simulate-advance/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const defendantId = parseInt(req.params.defendantId)
    const { _case, defendant } = await getDefendant(caseId, defendantId)
    const { defendantIds } = req.session.data.simulateAdvance || {}
    const selectedDefendants = _case.defendants.filter(d => defendantIds?.includes(String(d.id)))
    res.render('cases/defendants/simulate-advance-check', { _case, defendant, selectedDefendants })
  })

  router.post('/cases/:caseId/defendants/:defendantId/simulate-advance/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const defendantId = parseInt(req.params.defendantId)
    const { defendantIds } = req.session.data.simulateAdvance || {}
    await prisma.defendant.updateMany({
      where: { id: { in: defendantIds.map(id => parseInt(id)) } },
      data: { needsReview: true },
    })
    delete req.session.data.simulateAdvance
    req.flash('success', 'Status updated')
    res.redirect(`/cases/${caseId}/defendants/${defendantId}`)
  })

  router.get('/cases/:caseId/defendants/:defendantId/request-more-information', async (req, res) => {
    const { _case, defendant } = await getDefendant(parseInt(req.params.caseId), parseInt(req.params.defendantId))
    res.render('cases/defendants/request-more-information', { _case, defendant })
  })

  router.post('/cases/:caseId/defendants/:defendantId/request-more-information', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const defendantId = parseInt(req.params.defendantId)
    await prisma.defendant.update({ where: { id: defendantId }, data: { needsReview: false } })
    req.flash('success', 'More information requested')
    res.redirect(`/cases/${caseId}/defendants/${defendantId}`)
  })

  // --- Make charging decision (per-defendant) ---

  // CPS only ever states what the charges should be - it never charges a
  // defendant directly. A "Charge" decision here moves the defendant to
  // Charges pending; they only become Charged once the police or referring
  // agency send back authorised charges.
  const decisionStatusMap = {
    'charge': statuses.CHARGES_PENDING,
    'no-further-action': statuses.NO_FURTHER_ACTION,
  }

  const decisionFlashMap = {
    'charge': 'Charges stated',
    'no-further-action': 'Case marked as no further action',
  }

  router.get('/cases/:caseId/defendants/:defendantId/make-charging-decision', async (req, res) => {
    const { _case, defendant } = await getDefendant(parseInt(req.params.caseId), parseInt(req.params.defendantId))
    res.render('cases/defendants/make-charging-decision', { _case, defendant })
  })

  router.post('/cases/:caseId/defendants/:defendantId/make-charging-decision', async (req, res) => {
    const { caseId, defendantId } = req.params
    req.session.data.chargingDecision = { decision: req.body.decision }
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(caseId) },
      include: { defendants: true },
    })
    const eligibleDefendants = _case.defendants.filter(d => d.status === statuses.NOT_CHARGED && d.needsReview)
    if (eligibleDefendants.length > 1) {
      res.redirect(`/cases/${caseId}/defendants/${defendantId}/make-charging-decision/defendants`)
    } else {
      res.redirect(`/cases/${caseId}/defendants/${defendantId}/make-charging-decision/check`)
    }
  })

  router.get('/cases/:caseId/defendants/:defendantId/make-charging-decision/defendants', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const defendantId = parseInt(req.params.defendantId)
    const { _case, defendant } = await getDefendant(caseId, defendantId)
    const eligibleDefendants = _case.defendants.filter(d => d.status === statuses.NOT_CHARGED && d.needsReview)
    const selectedDefendantIds = req.session.data.chargingDecision?.defendantIds || eligibleDefendants.map(d => String(d.id))
    res.render('cases/defendants/make-charging-decision-defendants', { _case, defendant, defendantItems: buildDefendantItems(eligibleDefendants), selectedDefendantIds })
  })

  router.post('/cases/:caseId/defendants/:defendantId/make-charging-decision/defendants', (req, res) => {
    const { caseId, defendantId } = req.params
    req.session.data.chargingDecision = {
      ...req.session.data.chargingDecision,
      defendantIds: [].concat(req.body.chargingDecision?.defendants || []).filter(id => id !== '_unchecked'),
    }
    res.redirect(`/cases/${caseId}/defendants/${defendantId}/make-charging-decision/check`)
  })

  router.get('/cases/:caseId/defendants/:defendantId/make-charging-decision/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const defendantId = parseInt(req.params.defendantId)
    const { _case, defendant } = await getDefendant(caseId, defendantId)
    const { defendantIds } = req.session.data.chargingDecision || {}
    const selectedDefendants = defendantIds
      ? _case.defendants.filter(d => defendantIds.includes(String(d.id)))
      : null
    res.render('cases/defendants/make-charging-decision-check', { _case, defendant, selectedDefendants })
  })

  router.post('/cases/:caseId/defendants/:defendantId/make-charging-decision/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const defendantId = parseInt(req.params.defendantId)
    const decision = req.session.data.chargingDecision?.decision
    const defendantIds = req.session.data.chargingDecision?.defendantIds
    const status = decisionStatusMap[decision]
    if (status) {
      if (defendantIds?.length) {
        await prisma.defendant.updateMany({
          where: { id: { in: defendantIds.map(id => parseInt(id)) } },
          data: { status, needsReview: false },
        })
      } else {
        await prisma.defendant.update({ where: { id: defendantId }, data: { status, needsReview: false } })
      }
    }
    delete req.session.data.chargingDecision
    req.flash('success', decisionFlashMap[decision] || 'Charging decision recorded')
    res.redirect(`/cases/${caseId}/defendants/${defendantId}`)
  })

  router.get('/cases/:caseId/defendants/:defendantId/no-further-action', async (req, res) => {
    const { _case, defendant } = await getDefendant(parseInt(req.params.caseId), parseInt(req.params.defendantId))
    res.render('cases/defendants/no-further-action', { _case, defendant })
  })

  router.post('/cases/:caseId/defendants/:defendantId/no-further-action', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const defendantId = parseInt(req.params.defendantId)
    await prisma.defendant.update({ where: { id: defendantId }, data: { status: statuses.NO_FURTHER_ACTION } })
    req.flash('success', 'Marked as no further action')
    res.redirect(`/cases/${caseId}/defendants/${defendantId}`)
  })

  router.get('/cases/:caseId/defendants', async (req, res) => {
    let _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: {
        witnesses: true,
        prosecutors: { include: { user: true } },
        paralegalOfficers: { include: { user: true } },
        defendants: { include: { charges: true, defenceLawyer: true } },
        location: true,
        tasks: true,
        dga: true
      }
    })

    addTimeLimitDates(_case)
    addCaseStatus(_case)

    res.render('cases/defendants/index', { _case })
  })
}
