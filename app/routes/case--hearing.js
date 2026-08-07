const prisma = require('../lib/prisma')
const hearingTypes = require('../data/hearing-types')
const { addTimeLimitDates } = require('../helpers/timeLimit')
const { addCaseStatus } = require('../helpers/caseStatus')

const hearingTypeItems = hearingTypes.map(t => ({ value: t, text: t }))

module.exports = router => {
  router.get('/cases/:caseId/hearings/:hearingId', async (req, res) => {
    let _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
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

    addTimeLimitDates(_case)
    addCaseStatus(_case)

    const hearing = await prisma.hearing.findUnique({
      where: { id: parseInt(req.params.hearingId) },
      include: { defendants: true }
    })

    res.render('cases/hearings/show', { _case, hearing })
  })

  router.get('/cases/:caseId/hearings/:hearingId/edit/type', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) }
    })
    const hearing = await prisma.hearing.findUnique({
      where: { id: parseInt(req.params.hearingId) }
    })
    res.render('cases/hearings/edit/type', { _case, hearing, hearingTypeItems })
  })

  router.post('/cases/:caseId/hearings/:hearingId/edit/type', async (req, res) => {
    const hearingId = parseInt(req.params.hearingId)
    const caseId = parseInt(req.params.caseId)
    await prisma.hearing.update({
      where: { id: hearingId },
      data: { type: req.body.type }
    })
    req.flash('success', 'Hearing type updated')
    res.redirect(`/cases/${caseId}/hearings/${hearingId}`)
  })

  router.get('/cases/:caseId/hearings/:hearingId/edit/date', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) }
    })
    const hearing = await prisma.hearing.findUnique({
      where: { id: parseInt(req.params.hearingId) }
    })
    const d = new Date(hearing.startDate)
    const hearingDateParts = {
      day: d.getDate(),
      month: d.getMonth() + 1,
      year: d.getFullYear()
    }
    res.render('cases/hearings/edit/date', { _case, hearing, hearingDateParts })
  })

  router.post('/cases/:caseId/hearings/:hearingId/edit/date', async (req, res) => {
    const hearingId = parseInt(req.params.hearingId)
    const caseId = parseInt(req.params.caseId)
    const { day, month, year } = req.body.hearingDate
    const startDate = new Date(year, month - 1, day)
    await prisma.hearing.update({
      where: { id: hearingId },
      data: { startDate }
    })
    req.flash('success', 'Hearing date updated')
    res.redirect(`/cases/${caseId}/hearings/${hearingId}`)
  })

  router.get('/cases/:caseId/hearings/:hearingId/edit/venue', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) }
    })
    const hearing = await prisma.hearing.findUnique({
      where: { id: parseInt(req.params.hearingId) }
    })
    res.render('cases/hearings/edit/venue', { _case, hearing })
  })

  router.post('/cases/:caseId/hearings/:hearingId/edit/venue', async (req, res) => {
    const hearingId = parseInt(req.params.hearingId)
    const caseId = parseInt(req.params.caseId)
    await prisma.hearing.update({
      where: { id: hearingId },
      data: { venue: req.body.venue }
    })
    req.flash('success', 'Hearing venue updated')
    res.redirect(`/cases/${caseId}/hearings/${hearingId}`)
  })
}
