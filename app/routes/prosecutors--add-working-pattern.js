const prisma = require('../lib/prisma')

function buildWorkingPattern(sessionData) {
  const days = [].concat(sessionData?.days || [])
  const hours = sessionData?.hours || {}
  return days.map(day => ({ day, hours: hours[day] || '' }))
}

module.exports = router => {

  router.get("/prosecutors/:prosecutorId/add-working-pattern", async (req, res) => {
    const prosecutor = await prisma.user.findUnique({
      where: { id: parseInt(req.params.prosecutorId) }
    })

    res.render("prosecutors/add-working-pattern/index", { prosecutor })
  })

  router.post("/prosecutors/:prosecutorId/add-working-pattern", async (req, res) => {
    res.redirect(`/prosecutors/${req.params.prosecutorId}/add-working-pattern/check`)
  })

  router.get("/prosecutors/:prosecutorId/add-working-pattern/check", async (req, res) => {
    const prosecutor = await prisma.user.findUnique({
      where: { id: parseInt(req.params.prosecutorId) }
    })

    const workingPattern = buildWorkingPattern(req.session.data.addWorkingPattern)

    res.render("prosecutors/add-working-pattern/check", { prosecutor, workingPattern })
  })

  router.post("/prosecutors/:prosecutorId/add-working-pattern/check", async (req, res) => {
    const prosecutorId = parseInt(req.params.prosecutorId)
    const workingPattern = buildWorkingPattern(req.session.data.addWorkingPattern)

    await prisma.user.update({
      where: { id: prosecutorId },
      data: {
        workingPattern: {
          deleteMany: {},
          create: workingPattern
        }
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
        action: 'UPDATE',
        title: 'Working pattern added',
        meta: { prosecutor, workingPattern }
      }
    })

    delete req.session.data.addWorkingPattern

    req.flash('success', 'Working pattern added')
    res.redirect(`/prosecutors/${prosecutorId}`)
  })

}
