const { DateTime } = require('luxon')
const prisma = require('../lib/prisma')

function formatLeaveDate(leave) {
  const start = DateTime.fromJSDate(leave.startDate).toFormat('d MMMM yyyy')
  if (leave.endDate) {
    const end = DateTime.fromJSDate(leave.endDate).toFormat('d MMMM yyyy')
    return `${start} to ${end}`
  }
  return start
}

module.exports = router => {

  router.get("/prosecutors/:prosecutorId/leave/:leaveId/remove", async (req, res) => {
    const prosecutor = await prisma.user.findUnique({
      where: { id: parseInt(req.params.prosecutorId) }
    })
    const leave = await prisma.leave.findUnique({
      where: { id: parseInt(req.params.leaveId) }
    })
    const leaveDisplay = formatLeaveDate(leave)
    res.render("prosecutors/leave/remove/index", { prosecutor, leave, leaveDisplay })
  })

  router.post("/prosecutors/:prosecutorId/leave/:leaveId/remove", async (req, res) => {
    const prosecutorId = parseInt(req.params.prosecutorId)
    const leaveId = parseInt(req.params.leaveId)

    const leave = await prisma.leave.findUnique({
      where: { id: leaveId }
    })

    await prisma.leave.delete({
      where: { id: leaveId }
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
        action: 'DELETE',
        title: 'Leave removed',
        meta: { prosecutor, leave }
      }
    })

    req.flash('success', 'Leave removed')
    res.redirect(`/prosecutors/${prosecutorId}`)
  })

}
