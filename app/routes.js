const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const flash = require('connect-flash')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const checkSignedIn = require('./middleware/checkSignedIn')
const setLocals = require('./middleware/setLocals')

router.use(flash())
router.use(setLocals)

require('./routes/home')(router)
require('./routes/static')(router)
require('./routes/account')(router)
require('./routes/clear-data')(router)
require('./routes/case-links')(router)

router.use(checkSignedIn)

require('./routes/overview')(router)
require('./routes/activity')(router)
require('./routes/tasks')(router)
require('./routes/directions')(router)
require('./routes/prosecutors')(router)
require('./routes/prosecutors--add-specialist-area')(router)
require('./routes/prosecutors--add-working-pattern')(router)
require('./routes/prosecutors--edit-working-pattern')(router)
require('./routes/prosecutors--add-leave')(router)
require('./routes/prosecutors--remove-leave')(router)
require('./routes/prosecutors--edit-specialist-areas')(router)
require('./routes/prosecutors--edit-preferred-areas')(router)
require('./routes/prosecutors--edit-restricted-areas')(router)
require('./routes/paralegal-officers')(router)
require('./routes/paralegal-officer')(router)

// DGA reporting routes
require('./routes/dga-reporting--export')(router)
require('./routes/dga-reporting')(router)

// Record recent case views
router.get('/cases/:caseId*', async (req, res, next) => {
  const caseId = parseInt(req.params.caseId)
  const userId = req.session.data.user.id
  if (caseId && userId) {
    await prisma.recentCase.upsert({
      where: { userId_caseId: { userId, caseId } },
      update: { openedAt: new Date() },
      create: { userId, caseId },
    })
  }
  next()
})

const hearingStatusOrder = ['Hearing preparation needed', 'Hearing pending', 'Hearing outcome needed']

// Make hearing data available to all case pages (used by identity bar)
router.use('/cases/:caseId*', async (req, res, next) => {
  const caseId = parseInt(req.params.caseId)
  if (!isNaN(caseId)) {
    const hearings = await prisma.hearing.findMany({
      where: { caseId },
      select: { id: true, type: true, status: true }
    })
    res.locals.firstHearings = hearings.filter(h => h.type === 'First hearing')
    const uniqueActive = [...new Set(hearings.map(h => h.status).filter(s => s && s !== 'Hearing complete'))]
    res.locals.hearingStatuses = hearingStatusOrder.filter(s => uniqueActive.includes(s))
    res.locals.caseHearings = hearings
    res.locals.activeHearings = hearings.filter(h => h.status !== 'Hearing complete')

    const pendingInformationRequestItemCount = await prisma.informationRequestItem.count({
      where: { informationRequest: { caseId }, receivedDate: null, cancelledDate: null }
    })
    res.locals.hasPendingInformationRequest = pendingInformationRequestItemCount > 0
  }
  next()
})

require('./routes/hearings')(router)

// Case routes
require('./routes/cases')(router)
// require('./routes/cases--select-all')(router)
require('./routes/cases--record-dga-dispute-outcomes-as-not-disputed')(router)
require('./routes/case--dga')(router)
require('./routes/case--dga--record-dispute-outcome')(router)
require('./routes/case--dga--update-dispute-outcome')(router)
require('./routes/case--add-prosecutor')(router)
require('./routes/case--add-paralegal-officer')(router)
require('./routes/case--prosecutors')(router)
require('./routes/case--paralegal-officers')(router)
require('./routes/case--overview')(router)
require('./routes/case--review--charging-decision')(router)
require('./routes/case--review--strength-assessment')(router)
require('./routes/case--review--document')(router)
require('./routes/case--review--summary')(router)
require('./routes/case--review--information-request')(router)
require('./routes/case--review--first-hearing')(router)
require('./routes/case--elements')(router)
require('./routes/case--simulate-authorised-charges')(router)
require('./routes/case--no-further-action')(router)
require('./routes/case--hearing-actions')(router)
require('./routes/case--edit-complexity')(router)
require('./routes/case--notes--add-note')(router)
require('./routes/case--notes')(router)
require('./routes/case--ctl-log--add-entry')(router)
require('./routes/case--ctl-log')(router)
require('./routes/case--information-requests')(router)
require('./routes/case--activity')(router)
require('./routes/case--tasks')(router)
require('./routes/case--directions')(router)
require('./routes/case--task--new')(router)
require('./routes/case--task')(router)
require('./routes/case--task--check-new-pcd-case')(router)
require('./routes/case--task--early-advice-manager-triage')(router)
require('./routes/case--task--priority-pcd-review')(router)
require('./routes/case--task--complete')(router)
require('./routes/case--task--mark-as-urgent')(router)
require('./routes/case--task--mark-as-not-urgent')(router)
require('./routes/case--task--notes')(router)
require('./routes/case--direction')(router)
require('./routes/case--direction--notes')(router)
require('./routes/case--direction--complete')(router)
require('./routes/case--documents')(router)
require('./routes/case--witnesses')(router)
require('./routes/case--witness')(router)
require('./routes/case--defendants')(router)
require('./routes/case--witness--mark-as-required-to-attend-court')(router)
require('./routes/case--witness--mark-as-not-required-to-attend-court')(router)
require('./routes/case--witness-statement--mark-as-section9')(router)
require('./routes/case--witness-statement--unmark-as-section9')(router)
require('./routes/case--hearings')(router)
require('./routes/case--hearings--add')(router)
require('./routes/case--hearing')(router)
require('./routes/case--key-evidence')(router)
require('./routes/case--review')(router)
