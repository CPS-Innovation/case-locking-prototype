const prisma = require('../lib/prisma')

// Stable links for research participants. The case ID in /cases/:caseId
// changes every time the database is reseeded, so these resolve by
// defendant name instead. Marcus Webb, Daniel Palmer and Ryan Doyle are
// fixed named defendants belonging to Simon Whatley, so we sign straight
// in as Simon and redirect to the current case ID, skipping the "choose
// a user" screen.
const PARTICIPANT_CASE_LINKS = {
  'marcus-webb': { firstName: 'Marcus', lastName: 'Webb' },
  'daniel-palmer': { firstName: 'Daniel', lastName: 'Palmer' },
  'ryan-doyle': { firstName: 'Ryan', lastName: 'Doyle' }
}

module.exports = router => {
  Object.keys(PARTICIPANT_CASE_LINKS).forEach(slug => {
    router.get(`/cases/${slug}`, async (req, res) => {
      const { firstName, lastName } = PARTICIPANT_CASE_LINKS[slug]

      const [simon, defendant] = await Promise.all([
        prisma.user.findUnique({
          where: { email: 'simon@cps.gov.uk' },
          include: { units: { include: { unit: true } } }
        }),
        prisma.defendant.findFirst({
          where: { firstName, lastName },
          include: { cases: true }
        })
      ])

      req.session.data = Object.assign({}, require('../data/session-data-defaults'), { user: simon })
      res.redirect(`/cases/${defendant.cases[0].id}`)
    })
  })
}
