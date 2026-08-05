const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const sessionDataDefaults = require('../data/session-data-defaults')

// Temporary: skip the sign-in screen and sign straight in as Simon Whatley
// while testing only covers the reviewing lawyer process. Set to false to
// restore the normal sign-in screen.
const AUTO_SIGN_IN_AS_SIMON = true

module.exports = router => {
  router.get('/', async (req, res) => {
    if (AUTO_SIGN_IN_AS_SIMON) {
      req.session.data = Object.assign({}, sessionDataDefaults)
      req.session.data.user = await prisma.user.findUnique({
        where: { email: 'simon@cps.gov.uk' },
        include: {
          units: {
            include: {
              unit: true
            }
          }
        }
      })
      return res.redirect('/overview')
    }
    res.render("index")
  })
}
