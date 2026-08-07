const prisma = require('../lib/prisma')
const { addTimeLimitDates } = require('../helpers/timeLimit')
const { addCaseStatus } = require('../helpers/caseStatus')

module.exports = router => {

  router.get('/cases/:caseId/ctl-log/new', async (req, res) => {
    const caseId = parseInt(req.params.caseId)

    let _case = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        defendants: {
          include: {
            charges: true
          }
        },
        witnesses: true
      }
    })

    addTimeLimitDates(_case)
    addCaseStatus(_case)

    res.render('cases/ctl-log/new/index', { _case })
  })

  router.post('/cases/:caseId/ctl-log/new', (req, res) => {
    res.redirect(`/cases/${req.params.caseId}/ctl-log/new/check`)
  })

  router.get('/cases/:caseId/ctl-log/new/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)

    let _case = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        defendants: {
          include: {
            charges: true
          }
        },
        witnesses: true
      }
    })

    addTimeLimitDates(_case)
    addCaseStatus(_case)

    const { description, otherDescription } = req.session.data.addCtlLogEntry || {}
    const effectiveDescription = description === 'Other' ? otherDescription : description

    res.render('cases/ctl-log/new/check', { _case, effectiveDescription })
  })

  router.post('/cases/:caseId/ctl-log/new/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const userId = req.session.data.user.id
    const { description, otherDescription } = req.session.data.addCtlLogEntry
    const effectiveDescription = description === 'Other' ? otherDescription : description

    const entry = await prisma.ctlLogEntry.create({
      data: {
        description: effectiveDescription,
        caseId,
        userId
      }
    })

    await prisma.activityLog.create({
      data: {
        userId,
        model: 'CtlLogEntry',
        recordId: entry.id,
        action: 'CREATE',
        title: 'CTL log entry added',
        caseId,
        meta: {
          description: effectiveDescription
        }
      }
    })

    delete req.session.data.addCtlLogEntry

    req.flash('success', 'CTL log entry added')
    res.redirect(`/cases/${caseId}/ctl-log`)
  })

}
