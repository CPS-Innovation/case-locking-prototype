const prisma = require('../lib/prisma')
const hearingTypes = require('../data/hearing-types')
const hearingStatuses = require('../data/hearing-statuses')

const hearingTypeItems = hearingTypes.map(t => ({ value: t, text: t }))

module.exports = router => {
  router.get('/cases/:caseId/hearings/add', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) }
    })
    res.render('cases/hearings/add/index', { _case, hearingTypeItems })
  })

  router.post('/cases/:caseId/hearings/add', (req, res) => {
    const caseId = req.params.caseId
    req.session.data.addHearing = {
      ...req.session.data.addHearing,
      type: req.body.addHearing?.type
    }
    res.redirect(`/cases/${caseId}/hearings/add/date`)
  })

  router.get('/cases/:caseId/hearings/add/date', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) }
    })
    res.render('cases/hearings/add/date', { _case })
  })

  router.post('/cases/:caseId/hearings/add/date', (req, res) => {
    const caseId = req.params.caseId
    req.session.data.addHearing = {
      ...req.session.data.addHearing,
      hearingDate: req.body.addHearing?.hearingDate
    }
    res.redirect(`/cases/${caseId}/hearings/add/venue`)
  })

  router.get('/cases/:caseId/hearings/add/venue', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) }
    })
    res.render('cases/hearings/add/venue', { _case })
  })

  router.post('/cases/:caseId/hearings/add/venue', async (req, res) => {
    const caseId = req.params.caseId
    req.session.data.addHearing = {
      ...req.session.data.addHearing,
      venue: req.body.addHearing?.venue
    }

    const _case = await prisma.case.findUnique({
      where: { id: parseInt(caseId) },
      include: { defendants: true }
    })

    if (_case.defendants.length > 1) {
      res.redirect(`/cases/${caseId}/hearings/add/defendants`)
    } else {
      res.redirect(`/cases/${caseId}/hearings/add/check`)
    }
  })

  router.get('/cases/:caseId/hearings/add/defendants', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { defendants: true }
    })

    const selectedDefendantIds = req.session.data.addHearing?.defendantIds ||
      _case.defendants.map(d => String(d.id))

    const defendantItems = _case.defendants.map(d => ({
      value: String(d.id),
      text: `${d.firstName} ${d.lastName}`
    }))

    res.render('cases/hearings/add/defendants', { _case, defendantItems, selectedDefendantIds })
  })

  router.post('/cases/:caseId/hearings/add/defendants', (req, res) => {
    const caseId = req.params.caseId
    const defendantIds = [].concat(req.body.addHearing?.defendants || [])
    req.session.data.addHearing = {
      ...req.session.data.addHearing,
      defendantIds
    }
    res.redirect(`/cases/${caseId}/hearings/add/check`)
  })

  router.get('/cases/:caseId/hearings/add/check', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { defendants: true }
    })
    res.render('cases/hearings/add/check', { _case })
  })

  router.post('/cases/:caseId/hearings/add/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const { type, hearingDate, venue } = req.session.data.addHearing

    const startDate = new Date(hearingDate.year, hearingDate.month - 1, hearingDate.day, 10, 0, 0)

    const _case = await prisma.case.findUnique({
      where: { id: caseId },
      include: { defendants: true }
    })

    const rawIds = req.session.data.addHearing?.defendantIds ||
      _case.defendants.map(d => String(d.id))
    const defendantIds = rawIds.map(id => parseInt(id)).filter(id => !isNaN(id))

    const hearing = await prisma.hearing.create({
      data: {
        caseId,
        startDate,
        status: hearingStatuses.PREPARATION_NEEDED,
        type,
        venue,
        defendants: {
          connect: defendantIds.map(id => ({ id }))
        }
      }
    })

    const selectedDefendants = _case.defendants
      .filter(d => defendantIds.includes(d.id))
      .map(d => ({ firstName: d.firstName, lastName: d.lastName }))

    await prisma.activityLog.create({
      data: {
        userId: req.session.data.user.id,
        model: 'Case',
        recordId: caseId,
        action: 'UPDATE',
        title: `${type} hearing added`,
        meta: {
          hearingEventType: 'added',
          hearingType: type,
          hearingDate: hearing.startDate,
          venue,
          defendants: selectedDefendants,
        },
        caseId
      }
    })

    delete req.session.data.addHearing

    req.flash('success', 'Hearing added')
    res.redirect(`/cases/${caseId}/hearings`)
  })
}
