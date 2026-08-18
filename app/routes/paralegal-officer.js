const prisma = require('../lib/prisma')
const { asyncHandler } = require('../helpers/async-handler')

module.exports = router => {

  router.get("/paralegal-officers/:paralegalOfficerId", asyncHandler(async (req, res) => {
    const paralegalOfficer = await prisma.user.findUnique({
      where: { id: parseInt(req.params.paralegalOfficerId) },
      include: {
        units: {
          include: {
            unit: true
          }
        },
        _count: {
          select: {
            caseParalegalOfficers: true
          }
        }
      }
    })

    res.render("paralegal-officers/show", { paralegalOfficer })
  }))

}
