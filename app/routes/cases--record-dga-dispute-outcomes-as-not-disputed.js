const prisma = require('../lib/prisma')

module.exports = (router) => {
  router.get('/cases/record-dga-dispute-outcomes-as-not-disputed/select-all', (req, res) => {
    const selectedCaseIds = req.session.data.applyAction?.cases || []
    const allCaseIds = req.session.data.caseListAllIds || []

    res.render('cases/record-dga-dispute-outcomes-as-not-disputed/select-all', {
      selectedCasesCount: selectedCaseIds.length,
      totalCasesCount: allCaseIds.length,
    })
  })

  router.post('/cases/record-dga-dispute-outcomes-as-not-disputed/select-all', (req, res) => {
    if (req.body.selection === 'all') {
      req.session.data.applyAction = { cases: req.session.data.caseListAllIds }
    }

    res.redirect('/cases/record-dga-dispute-outcomes-as-not-disputed')
  })

  router.get('/cases/record-dga-dispute-outcomes-as-not-disputed', async (req, res) => {
    const selectedCaseIds = req.session.data.applyAction.cases.map(Number)

    const cases = await prisma.case.findMany({
      where: { id: { in: selectedCaseIds } },
      include: {
        defendants: true,
        dga: { include: { failureReasons: true } },
      },
    })

    const mappedCases = cases.map((c) => ({
      ...c,
      totalFailureReasons: c.dga?.failureReasons?.length || 0,
      unresolvedFailureReasons:
        c.dga?.failureReasons?.filter((fr) => fr.didPoliceDisputeFailure === null).length || 0,
    }))

    const caseItems = mappedCases.filter((c) => c.unresolvedFailureReasons > 0)
    const excludedCount = mappedCases.length - caseItems.length

    res.render('cases/record-dga-dispute-outcomes-as-not-disputed/index', { caseItems, excludedCount })
  })

  router.post('/cases/record-dga-dispute-outcomes-as-not-disputed', async (req, res) => {
    const selectedCaseIds = req.session.data.applyAction.cases.map(Number)

    const cases = await prisma.case.findMany({
      where: { id: { in: selectedCaseIds } },
      include: {
        policeUnit: true,
        dga: { include: { failureReasons: true } },
      },
    })

    for (const c of cases) {
      const unresolvedReasons = c.dga?.failureReasons?.filter((fr) => fr.didPoliceDisputeFailure === null) || []

      for (const fr of unresolvedReasons) {
        await prisma.dGAFailureReason.update({
          where: { id: fr.id },
          data: { didPoliceDisputeFailure: 'No' },
        })

        const date = new Date(c.dga.reviewDate)
        const monthName = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

        await prisma.activityLog.create({
          data: {
            userId: req.session.data.user.id,
            model: 'DGAFailureReason',
            recordId: fr.id,
            action: 'UPDATE',
            title: 'DGA dispute outcome recorded',
            caseId: c.id,
            meta: {
              failureReason: fr.reason,
              policeUnit: c.policeUnit?.name || 'Not specified',
              monthName,
              didPoliceDisputeFailure: 'No',
            },
          },
        })
      }
    }

    delete req.session.data.applyAction

    req.flash('success', 'DGA dispute outcomes recorded as not disputed')

    res.redirect('/cases')
  })
}
