const prisma = require('../lib/prisma')
const statuses = require('../data/case-statuses')

module.exports = (router) => {
  router.get('/cases/:caseId/add-ptph-hearing', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { defendants: true },
    })

    res.render('cases/add-ptph-hearing/index', { _case })
  })

  router.post('/cases/:caseId/add-ptph-hearing', (req, res) => {
    const caseId = req.params.caseId
    req.session.data.addPtphHearing = {
      ...req.session.data.addPtphHearing,
      hearingDate: req.body.addPtphHearing?.hearingDate,
    }
    res.redirect(`/cases/${caseId}/add-ptph-hearing/venue`)
  })

  router.get('/cases/:caseId/add-ptph-hearing/venue', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { defendants: true },
    })

    res.render('cases/add-ptph-hearing/venue', { _case })
  })

  router.post('/cases/:caseId/add-ptph-hearing/venue', (req, res) => {
    const caseId = req.params.caseId
    req.session.data.addPtphHearing = {
      ...req.session.data.addPtphHearing,
      venue: req.body.addPtphHearing?.venue,
    }
    res.redirect(`/cases/${caseId}/add-ptph-hearing/check`)
  })

  router.get('/cases/:caseId/add-ptph-hearing/check', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { defendants: true },
    })

    res.render('cases/add-ptph-hearing/check', { _case })
  })

  router.post('/cases/:caseId/add-ptph-hearing/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const { hearingDate, venue } = req.session.data.addPtphHearing
    const startDate = new Date(hearingDate.year, hearingDate.month - 1, hearingDate.day, 10, 0, 0)

    const _case = await prisma.case.findUnique({
      where: { id: caseId },
      include: { defendants: true },
    })

    const hearing = await prisma.hearing.create({
      data: {
        caseId,
        startDate,
        status: 'Scheduled',
        type: 'PTPH',
        venue,
        defendants: {
          connect: _case.defendants.map(d => ({ id: d.id })),
        },
      },
    })

    await prisma.case.update({
      where: { id: caseId },
      data: { status: statuses.PTPH_HEARING_PENDING },
    })

    await prisma.activityLog.create({
      data: {
        userId: req.session.data.user.id,
        model: 'Case',
        recordId: caseId,
        action: 'UPDATE',
        title: 'PTPH hearing added',
        meta: {
          hearingEventType: 'added',
          hearingType: 'PTPH',
          hearingDate: hearing.startDate,
          venue,
          defendants: _case.defendants.map(d => ({ firstName: d.firstName, lastName: d.lastName })),
        },
        caseId,
      },
    })

    delete req.session.data.addPtphHearing

    req.flash('success', 'PTPH hearing added')
    res.redirect(`/cases/${caseId}`)
  })
}
