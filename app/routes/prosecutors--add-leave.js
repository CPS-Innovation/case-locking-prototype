const prisma = require('../lib/prisma')

function buildDate(dateData) {
  if (!dateData || !dateData.day || !dateData.month || !dateData.year) return null
  return new Date(parseInt(dateData.year), parseInt(dateData.month) - 1, parseInt(dateData.day))
}

module.exports = router => {

  router.get("/prosecutors/:prosecutorId/add-leave", async (req, res) => {
    const prosecutor = await prisma.user.findUnique({
      where: { id: parseInt(req.params.prosecutorId) }
    })
    res.render("prosecutors/add-leave/index", { prosecutor })
  })

  router.post("/prosecutors/:prosecutorId/add-leave", async (req, res) => {
    res.redirect(`/prosecutors/${req.params.prosecutorId}/add-leave/check`)
  })

  router.get("/prosecutors/:prosecutorId/add-leave/check", async (req, res) => {
    const prosecutor = await prisma.user.findUnique({
      where: { id: parseInt(req.params.prosecutorId) }
    })
    res.render("prosecutors/add-leave/check", { prosecutor })
  })

  router.post("/prosecutors/:prosecutorId/add-leave/check", async (req, res) => {
    const prosecutorId = parseInt(req.params.prosecutorId)
    const leaveData = req.session.data.addLeave
    const startDate = buildDate(leaveData?.startDate)
    const endDate = buildDate(leaveData?.endDate)

    const leave = await prisma.leave.create({
      data: {
        startDate,
        endDate: endDate || null,
        userId: prosecutorId
      }
    })

    const prosecutor = await prisma.user.findUnique({
      where: { id: prosecutorId },
      select: { id: true, firstName: true, lastName: true }
    })

    await prisma.activityLog.create({
      data: {
        userId: req.session.data.user.id,
        model: 'User',
        recordId: prosecutorId,
        action: 'CREATE',
        title: 'Leave added',
        meta: { prosecutor, leave }
      }
    })

    delete req.session.data.addLeave

    req.flash('success', 'Leave added')
    res.redirect(`/prosecutors/${prosecutorId}`)
  })

}
