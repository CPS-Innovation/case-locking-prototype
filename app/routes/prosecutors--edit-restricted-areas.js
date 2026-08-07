const prisma = require('../lib/prisma')

module.exports = router => {

  router.get("/prosecutors/:prosecutorId/edit-restricted-areas", async (req, res) => {
    const prosecutor = await prisma.user.findUnique({
      where: { id: parseInt(req.params.prosecutorId) },
      include: { restrictedAreas: true }
    })

    const specialisms = await prisma.specialism.findMany()
    const specialismItems = specialisms.map(s => ({ text: s.name, value: `${s.id}` }))
    const currentIds = prosecutor.restrictedAreas.map(s => `${s.id}`)

    res.render("prosecutors/edit-restricted-areas/index", { prosecutor, specialismItems, currentIds })
  })

  router.post("/prosecutors/:prosecutorId/edit-restricted-areas", async (req, res) => {
    res.redirect(`/prosecutors/${req.params.prosecutorId}/edit-restricted-areas/check`)
  })

  router.get("/prosecutors/:prosecutorId/edit-restricted-areas/check", async (req, res) => {
    const prosecutor = await prisma.user.findUnique({
      where: { id: parseInt(req.params.prosecutorId) }
    })

    const restrictedIds = (req.session.data.editRestrictedAreas?.restrictedAreas || []).map(Number)
    const restrictedAreas = await prisma.specialism.findMany({ where: { id: { in: restrictedIds } } })

    res.render("prosecutors/edit-restricted-areas/check", { prosecutor, restrictedAreas })
  })

  router.post("/prosecutors/:prosecutorId/edit-restricted-areas/check", async (req, res) => {
    const prosecutorId = parseInt(req.params.prosecutorId)
    const restrictedIds = (req.session.data.editRestrictedAreas?.restrictedAreas || []).map(Number)

    await prisma.user.update({
      where: { id: prosecutorId },
      data: {
        restrictedAreas: { set: restrictedIds.map(id => ({ id })) }
      }
    })

    const restrictedAreas = await prisma.specialism.findMany({ where: { id: { in: restrictedIds } } })

    await prisma.activityLog.create({
      data: {
        userId: req.session.data.user.id,
        model: 'User',
        recordId: prosecutorId,
        action: 'UPDATE',
        title: 'Restricted areas updated',
        meta: { areas: restrictedAreas.map(s => s.name) }
      }
    })

    delete req.session.data.editRestrictedAreas

    req.flash('success', 'Restricted areas updated')
    res.redirect(`/prosecutors/${prosecutorId}`)
  })

}
