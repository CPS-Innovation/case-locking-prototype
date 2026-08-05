const path = require('path')
const { execFile } = require('child_process')
const { promisify } = require('util')
const { resetAllData } = require('../../prisma/reset-data')
const resetState = require('../state/reset-state')

const execFileAsync = promisify(execFile)
const seedScript = path.join(__dirname, '../../prisma/seed.js')

module.exports = (router, prisma) => {
  router.get('/clear-data', async (req, res) => {
    delete req.session.data
    const redirectUrl = req.query.returnUrl || '/'

    resetState.inProgress = true
    try {
      await resetAllData(prisma)
      // Seeding runs in a separate process, not in-process, so its memory
      // (thousands of faker-generated records) is fully released back to
      // the OS when it exits, instead of bloating the long-running web
      // process's heap for the rest of its life. Runs `node` directly
      // rather than the `prisma` CLI, since that's pruned from the
      // production slug.
      const { stdout, stderr } = await execFileAsync('node', [seedScript])
      console.log(stdout)
      if (stderr) console.error(stderr)
      res.redirect(redirectUrl)
    } catch (err) {
      console.error('Error resetting database:', err)
      res.status(500).json({ error: 'Failed to reset database' })
    } finally {
      resetState.inProgress = false
    }
  })
}
