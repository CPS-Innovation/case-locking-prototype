const prisma = require('../lib/prisma')

module.exports = router => {
  router.get("/cases/:caseId/edit-complexity", async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) }
    })

    res.render("cases/edit-complexity/index", { _case })
  })

  router.post("/cases/:caseId/edit-complexity", async (req, res) => {
    res.redirect(`/cases/${req.params.caseId}/edit-complexity/check`)
  })

  router.get("/cases/:caseId/edit-complexity/check", async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) }
    })

    res.render("cases/edit-complexity/check", { _case })
  })

  router.post("/cases/:caseId/edit-complexity/check", async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const complexity = req.session.data.editComplexity.complexity

    await prisma.case.update({
      where: { id: caseId },
      data: { complexity }
    })

    await prisma.activityLog.create({
      data: {
        userId: req.session.data.user.id,
        model: 'Case',
        recordId: caseId,
        action: 'UPDATE',
        title: 'Complexity updated',
        caseId,
        meta: { complexity }
      }
    })

    delete req.session.data.editComplexity

    req.flash('success', 'Complexity updated')
    res.redirect(`/cases/${caseId}`)
  })
}
