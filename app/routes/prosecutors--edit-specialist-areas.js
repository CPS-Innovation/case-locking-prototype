const prisma = require('../lib/prisma')

module.exports = router => {

  router.get("/prosecutors/:prosecutorId/edit-specialist-areas", async (req, res) => {
    const prosecutor = await prisma.user.findUnique({
      where: { id: parseInt(req.params.prosecutorId) },
      include: { specialistAreas: true }
    })

    const specialisms = await prisma.specialism.findMany()
    const specialismItems = specialisms.map(s => ({ text: s.name, value: `${s.id}` }))
    const currentIds = prosecutor.specialistAreas.map(s => `${s.id}`)

    res.render("prosecutors/edit-specialist-areas/index", { prosecutor, specialismItems, currentIds })
  })

  router.post("/prosecutors/:prosecutorId/edit-specialist-areas", async (req, res) => {
    res.redirect(`/prosecutors/${req.params.prosecutorId}/edit-specialist-areas/check`)
  })

  router.get("/prosecutors/:prosecutorId/edit-specialist-areas/check", async (req, res) => {
    const prosecutor = await prisma.user.findUnique({
      where: { id: parseInt(req.params.prosecutorId) }
    })

    const specialismIds = (req.session.data.editSpecialistAreas?.specialisms || []).map(Number)
    const specialistAreas = await prisma.specialism.findMany({ where: { id: { in: specialismIds } } })

    res.render("prosecutors/edit-specialist-areas/check", { prosecutor, specialistAreas })
  })

  router.post("/prosecutors/:prosecutorId/edit-specialist-areas/check", async (req, res) => {
    const prosecutorId = parseInt(req.params.prosecutorId)
    const specialismIds = (req.session.data.editSpecialistAreas?.specialisms || []).map(Number)

    await prisma.user.update({
      where: { id: prosecutorId },
      data: {
        specialistAreas: { set: specialismIds.map(id => ({ id })) }
      }
    })

    const specialistAreas = await prisma.specialism.findMany({ where: { id: { in: specialismIds } } })

    await prisma.activityLog.create({
      data: {
        userId: req.session.data.user.id,
        model: 'User',
        recordId: prosecutorId,
        action: 'UPDATE',
        title: 'Specialist areas updated',
        meta: { areas: specialistAreas.map(s => s.name) }
      }
    })

    delete req.session.data.editSpecialistAreas

    req.flash('success', 'Specialist areas updated')
    res.redirect(`/prosecutors/${prosecutorId}`)
  })

}
