const _ = require('lodash')
const prisma = require('../lib/prisma')
const { calculateLegacyOutcome, isFinalFailure } = require('../helpers/dgaLegacyOutcome')

async function fetchCase(caseId, failureReasonId) {
  return prisma.case.findUnique({
    where: { id: caseId },
    include: {
      dga: {
        include: {
          failureReasons: failureReasonId
            ? { where: { id: failureReasonId } }
            : true
        }
      }
    }
  })
}

function populateSession(req, failureReason) {
  if (req.session.data.updateOutcome) return
  req.session.data.updateOutcome = {
    didPoliceDisputeFailure: failureReason.didPoliceDisputeFailure,
    didCpsAcceptDispute: failureReason.didCpsAcceptDispute,
    reasonForOutcome: failureReason.reasonForOutcome,
    discussionMethods: failureReason.discussionMethods
      ? failureReason.discussionMethods.split(', ')
      : []
  }
}

module.exports = router => {

  // Step 1: Did the police dispute this failure?
  router.get('/cases/:caseId/dga/:failureReasonId/update-dispute-outcome', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const failureReasonId = parseInt(req.params.failureReasonId)
    const caseData = await fetchCase(caseId, failureReasonId)
    const failureReason = caseData.dga.failureReasons[0]

    populateSession(req, failureReason)

    if (req.query.returnUrl === 'check') {
      req.session.data.updateOutcomeFrom = 'check'
    }

    res.render('cases/dga/update-dispute-outcome/index', {
      case: caseData,
      failureReason,
      selectedDisputed: req.session.data.updateOutcome?.didPoliceDisputeFailure
    })
  })

  router.post('/cases/:caseId/dga/:failureReasonId/update-dispute-outcome', (req, res) => {
    const caseId = req.params.caseId
    const failureReasonId = req.params.failureReasonId
    const didPoliceDisputeFailure = req.body.updateOutcome?.didPoliceDisputeFailure
    const returnToCheck = req.session.data.updateOutcomeFrom === 'check'

    _.set(req, 'session.data.updateOutcome.didPoliceDisputeFailure', didPoliceDisputeFailure)

    if (didPoliceDisputeFailure === 'No') {
      _.set(req, 'session.data.updateOutcome.didCpsAcceptDispute', null)
      _.set(req, 'session.data.updateOutcome.reasonForOutcome', null)
      _.set(req, 'session.data.updateOutcome.discussionMethods', null)
      delete req.session.data.updateOutcomeFrom
      return res.redirect(`/cases/${caseId}/dga/${failureReasonId}/update-dispute-outcome/check`)
    }

    if (returnToCheck) {
      delete req.session.data.updateOutcomeFrom
      return res.redirect(`/cases/${caseId}/dga/${failureReasonId}/update-dispute-outcome/check`)
    }

    res.redirect(`/cases/${caseId}/dga/${failureReasonId}/update-dispute-outcome/cps-accepted`)
  })

  // Step 1b: Did CPS accept the dispute?
  router.get('/cases/:caseId/dga/:failureReasonId/update-dispute-outcome/cps-accepted', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const failureReasonId = parseInt(req.params.failureReasonId)
    const caseData = await fetchCase(caseId, failureReasonId)
    const failureReason = caseData.dga.failureReasons[0]

    populateSession(req, failureReason)

    if (req.query.returnUrl === 'check') {
      req.session.data.updateOutcomeFrom = 'check'
    }

    res.render('cases/dga/update-dispute-outcome/cps-accepted', {
      case: caseData,
      failureReason,
      selectedCpsAccepted: req.session.data.updateOutcome?.didCpsAcceptDispute
    })
  })

  router.post('/cases/:caseId/dga/:failureReasonId/update-dispute-outcome/cps-accepted', (req, res) => {
    const caseId = req.params.caseId
    const failureReasonId = req.params.failureReasonId
    const returnToCheck = req.session.data.updateOutcomeFrom === 'check'

    _.set(req, 'session.data.updateOutcome.didCpsAcceptDispute', req.body.updateOutcome?.didCpsAcceptDispute)

    if (returnToCheck) {
      delete req.session.data.updateOutcomeFrom
      return res.redirect(`/cases/${caseId}/dga/${failureReasonId}/update-dispute-outcome/check`)
    }

    res.redirect(`/cases/${caseId}/dga/${failureReasonId}/update-dispute-outcome/reason`)
  })

  // Step 2a: Reason for outcome
  router.get('/cases/:caseId/dga/:failureReasonId/update-dispute-outcome/reason', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const failureReasonId = parseInt(req.params.failureReasonId)
    const caseData = await fetchCase(caseId, failureReasonId)
    const failureReason = caseData.dga.failureReasons[0]

    populateSession(req, failureReason)

    if (req.query.returnUrl === 'check') {
      req.session.data.updateOutcomeFrom = 'check'
    }

    res.render('cases/dga/update-dispute-outcome/reason', {
      case: caseData,
      failureReason,
      reasonForOutcome: req.session.data.updateOutcome?.reasonForOutcome
    })
  })

  router.post('/cases/:caseId/dga/:failureReasonId/update-dispute-outcome/reason', (req, res) => {
    const caseId = req.params.caseId
    const failureReasonId = req.params.failureReasonId
    const returnToCheck = req.session.data.updateOutcomeFrom === 'check'

    _.set(req, 'session.data.updateOutcome.reasonForOutcome', req.body.updateOutcome?.reasonForOutcome)

    if (returnToCheck) {
      delete req.session.data.updateOutcomeFrom
      return res.redirect(`/cases/${caseId}/dga/${failureReasonId}/update-dispute-outcome/check`)
    }

    res.redirect(`/cases/${caseId}/dga/${failureReasonId}/update-dispute-outcome/method`)
  })

  // Step 2b: Methods
  router.get('/cases/:caseId/dga/:failureReasonId/update-dispute-outcome/method', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const failureReasonId = parseInt(req.params.failureReasonId)
    const caseData = await fetchCase(caseId, failureReasonId)
    const failureReason = caseData.dga.failureReasons[0]

    populateSession(req, failureReason)

    if (req.query.returnUrl === 'check') {
      req.session.data.updateOutcomeFrom = 'check'
    }

    res.render('cases/dga/update-dispute-outcome/method', {
      case: caseData,
      failureReason,
      selectedMethods: req.session.data.updateOutcome?.discussionMethods || []
    })
  })

  router.post('/cases/:caseId/dga/:failureReasonId/update-dispute-outcome/method', (req, res) => {
    const caseId = req.params.caseId
    const failureReasonId = req.params.failureReasonId
    const returnToCheck = req.session.data.updateOutcomeFrom === 'check'
    let discussionMethods = req.body.updateOutcome?.discussionMethods

    if (!discussionMethods) {
      discussionMethods = []
    } else if (!Array.isArray(discussionMethods)) {
      discussionMethods = [discussionMethods]
    }
    discussionMethods = discussionMethods.filter(m => m !== '_unchecked')

    _.set(req, 'session.data.updateOutcome.discussionMethods', discussionMethods)

    if (returnToCheck) {
      delete req.session.data.updateOutcomeFrom
    }

    res.redirect(`/cases/${caseId}/dga/${failureReasonId}/update-dispute-outcome/check`)
  })

  // Step 3: Check answers
  router.get('/cases/:caseId/dga/:failureReasonId/update-dispute-outcome/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const failureReasonId = parseInt(req.params.failureReasonId)

    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: { dga: { include: { failureReasons: true } } }
    })

    const failureReason = caseData.dga.failureReasons.find(fr => fr.id === failureReasonId)

    populateSession(req, failureReason)

    const allFailureReasons = caseData.dga.failureReasons

    let legacyOutcome = null
    if (isFinalFailure(allFailureReasons)) {
      const simulatedReasons = allFailureReasons.map(fr => {
        if (fr.id === failureReasonId) {
          return {
            ...fr,
            didPoliceDisputeFailure: req.session.data.updateOutcome?.didPoliceDisputeFailure,
            didCpsAcceptDispute: req.session.data.updateOutcome?.didCpsAcceptDispute
          }
        }
        return fr
      })
      legacyOutcome = calculateLegacyOutcome(simulatedReasons)
    }

    res.render('cases/dga/update-dispute-outcome/check', {
      case: caseData,
      failureReason,
      legacyOutcome
    })
  })

  router.post('/cases/:caseId/dga/:failureReasonId/update-dispute-outcome/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const failureReasonId = parseInt(req.params.failureReasonId)

    const didPoliceDisputeFailure = req.session.data.updateOutcome?.didPoliceDisputeFailure
    const didCpsAcceptDispute = req.session.data.updateOutcome?.didCpsAcceptDispute
    const reasonForOutcome = req.session.data.updateOutcome?.reasonForOutcome
    const discussionMethods = req.session.data.updateOutcome?.discussionMethods

    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        policeUnit: true,
        dga: { include: { failureReasons: true } }
      }
    })

    await prisma.dGAFailureReason.update({
      where: { id: failureReasonId },
      data: {
        didPoliceDisputeFailure,
        didCpsAcceptDispute,
        reasonForOutcome,
        discussionMethods: discussionMethods ? discussionMethods.join(', ') : null
      }
    })

    const failureReason = caseData.dga.failureReasons.find(fr => fr.id === failureReasonId)

    const date = new Date(caseData.dga.reviewDate)
    const monthName = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

    const meta = {
      failureReason: failureReason.reason,
      policeUnit: caseData.policeUnit?.name || 'Not specified',
      monthName,
      ...req.session.data.updateOutcome
    }

    await prisma.activityLog.create({
      data: {
        userId: req.session.data.user.id,
        model: 'DGAFailureReason',
        recordId: failureReasonId,
        action: 'UPDATE',
        title: 'DGA dispute outcome updated',
        caseId,
        meta
      }
    })

    delete req.session.data.updateOutcome

    req.flash('success', 'DGA dispute outcome updated')

    res.redirect(`/cases/${caseId}/dga`)
  })

}
