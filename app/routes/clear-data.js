const { resetAllData } = require('../../prisma/reset-data')
const { main: seedDatabase } = require('../../prisma/seed')
const resetState = require('../state/reset-state')

module.exports = (router, prisma) => {
  router.get('/clear-data', async (req, res) => {
    delete req.session.data
    const redirectUrl = req.query.returnUrl || '/'

    resetState.inProgress = true
    try {
      await resetAllData(prisma)
      await seedDatabase()
      res.redirect(redirectUrl)
    } catch (err) {
      console.error('Error resetting database:', err)
      res.status(500).json({ error: 'Failed to reset database' })
    } finally {
      resetState.inProgress = false
    }
  })
}
