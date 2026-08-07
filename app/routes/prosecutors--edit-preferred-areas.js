const prisma = require('../lib/prisma')

module.exports = router => {

  router.get("/prosecutors/:prosecutorId/edit-preferred-areas", async (req, res) => {
    const prosecutor = await prisma.user.findUnique({
      where: { id: parseInt(req.params.prosecutorId) },
      include: { preferredAreas: true }
    })

    const specialisms = await prisma.specialism.findMany()
    const specialismItems = specialisms.map(s => ({ text: s.name, value: `${s.id}` }))
    const currentIds = prosecutor.preferredAreas.map(s => `${s.id}`)

    res.render("prosecutors/edit-preferred-areas/index", { prosecutor, specialismItems, currentIds })
  })

  router.post("/prosecutors/:prosecutorId/edit-preferred-areas", async (req, res) => {
    res.redirect(`/prosecutors/${req.params.prosecutorId}/edit-preferred-areas/check`)
  })

  router.get("/prosecutors/:prosecutorId/edit-preferred-areas/check", async (req, res) => {
    const prosecutor = await prisma.user.findUnique({
      where: { id: parseInt(req.params.prosecutorId) }
    })

    const preferredIds = (req.session.data.editPreferredAreas?.preferredAreas || []).map(Number)
    const preferredAreas = await prisma.specialism.findMany({ where: { id: { in: preferredIds } } })

    res.render("prosecutors/edit-preferred-areas/check", { prosecutor, preferredAreas })
  })

  router.post("/prosecutors/:prosecutorId/edit-preferred-areas/check", async (req, res) => {
    const prosecutorId = parseInt(req.params.prosecutorId)
    const preferredIds = (req.session.data.editPreferredAreas?.preferredAreas || []).map(Number)

    await prisma.user.update({
      where: { id: prosecutorId },
      data: {
        preferredAreas: { set: preferredIds.map(id => ({ id })) }
      }
    })

    const preferredAreas = await prisma.specialism.findMany({ where: { id: { in: preferredIds } } })

    await prisma.activityLog.create({
      data: {
        userId: req.session.data.user.id,
        model: 'User',
        recordId: prosecutorId,
        action: 'UPDATE',
        title: 'Preferred areas updated',
        meta: { areas: preferredAreas.map(s => s.name) }
      }
    })

    delete req.session.data.editPreferredAreas

    req.flash('success', 'Preferred areas updated')
    res.redirect(`/prosecutors/${prosecutorId}`)
  })

}
