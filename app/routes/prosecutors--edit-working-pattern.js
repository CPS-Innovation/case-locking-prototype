const prisma = require('../lib/prisma')

function buildWorkingPattern(sessionData) {
  const days = [].concat(sessionData?.days || [])
  const hours = sessionData?.hours || {}
  return days.map(day => ({ day, hours: hours[day] || '' }))
}

module.exports = router => {

  router.get("/prosecutors/:prosecutorId/edit-working-pattern", async (req, res) => {
    const prosecutor = await prisma.user.findUnique({
      where: { id: parseInt(req.params.prosecutorId) },
      include: { workingPattern: true }
    })

    const currentDays = prosecutor.workingPattern.map(w => w.day)
    const currentHours = Object.fromEntries(prosecutor.workingPattern.map(w => [w.day, w.hours]))

    res.render("prosecutors/edit-working-pattern/index", { prosecutor, currentDays, currentHours })
  })

  router.post("/prosecutors/:prosecutorId/edit-working-pattern", async (req, res) => {
    res.redirect(`/prosecutors/${req.params.prosecutorId}/edit-working-pattern/check`)
  })

  router.get("/prosecutors/:prosecutorId/edit-working-pattern/check", async (req, res) => {
    const prosecutor = await prisma.user.findUnique({
      where: { id: parseInt(req.params.prosecutorId) }
    })

    const workingPattern = buildWorkingPattern(req.session.data.editWorkingPattern)

    res.render("prosecutors/edit-working-pattern/check", { prosecutor, workingPattern })
  })

  router.post("/prosecutors/:prosecutorId/edit-working-pattern/check", async (req, res) => {
    const prosecutorId = parseInt(req.params.prosecutorId)
    const workingPattern = buildWorkingPattern(req.session.data.editWorkingPattern)

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
        title: 'Working pattern updated',
        meta: { prosecutor, workingPattern }
      }
    })

    delete req.session.data.editWorkingPattern

    req.flash('success', 'Working pattern updated')
    res.redirect(`/prosecutors/${prosecutorId}`)
  })

}
