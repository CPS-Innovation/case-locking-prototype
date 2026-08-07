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

module.exports = router => {

  // Step 1: Did the police dispute this failure?
  router.get('/cases/:caseId/dga/:failureReasonId/record-dispute-outcome', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const failureReasonId = parseInt(req.params.failureReasonId)
    const caseData = await fetchCase(caseId, failureReasonId)

    res.render('cases/dga/record-dispute-outcome/index', {
      case: caseData,
      failureReason: caseData.dga.failureReasons[0],
      selectedDisputed: req.session.data.recordOutcome?.didPoliceDisputeFailure
    })
  })

  router.post('/cases/:caseId/dga/:failureReasonId/record-dispute-outcome', (req, res) => {
    const caseId = req.params.caseId
    const failureReasonId = req.params.failureReasonId
    const didPoliceDisputeFailure = req.body.recordOutcome?.didPoliceDisputeFailure

    _.set(req, 'session.data.recordOutcome.didPoliceDisputeFailure', didPoliceDisputeFailure)

    if (didPoliceDisputeFailure === 'No') {
      _.set(req, 'session.data.recordOutcome.didCpsAcceptDispute', null)
      _.set(req, 'session.data.recordOutcome.reasonForOutcome', null)
      _.set(req, 'session.data.recordOutcome.discussionMethods', null)
      return res.redirect(`/cases/${caseId}/dga/${failureReasonId}/record-dispute-outcome/check`)
    }

    res.redirect(`/cases/${caseId}/dga/${failureReasonId}/record-dispute-outcome/cps-accepted`)
  })

  // Step 1b: Did CPS accept the dispute?
  router.get('/cases/:caseId/dga/:failureReasonId/record-dispute-outcome/cps-accepted', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const failureReasonId = parseInt(req.params.failureReasonId)
    const caseData = await fetchCase(caseId, failureReasonId)

    res.render('cases/dga/record-dispute-outcome/cps-accepted', {
      case: caseData,
      failureReason: caseData.dga.failureReasons[0],
      selectedCpsAccepted: req.session.data.recordOutcome?.didCpsAcceptDispute
    })
  })

  router.post('/cases/:caseId/dga/:failureReasonId/record-dispute-outcome/cps-accepted', (req, res) => {
    const caseId = req.params.caseId
    const failureReasonId = req.params.failureReasonId

    _.set(req, 'session.data.recordOutcome.didCpsAcceptDispute', req.body.recordOutcome?.didCpsAcceptDispute)

    res.redirect(`/cases/${caseId}/dga/${failureReasonId}/record-dispute-outcome/reason`)
  })

  // Step 2a: Reason for outcome
  router.get('/cases/:caseId/dga/:failureReasonId/record-dispute-outcome/reason', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const failureReasonId = parseInt(req.params.failureReasonId)
    const caseData = await fetchCase(caseId, failureReasonId)

    res.render('cases/dga/record-dispute-outcome/reason', {
      case: caseData,
      failureReason: caseData.dga.failureReasons[0],
      reasonForOutcome: req.session.data.recordOutcome?.reasonForOutcome
    })
  })

  router.post('/cases/:caseId/dga/:failureReasonId/record-dispute-outcome/reason', (req, res) => {
    const caseId = req.params.caseId
    const failureReasonId = req.params.failureReasonId

    _.set(req, 'session.data.recordOutcome.reasonForOutcome', req.body.recordOutcome?.reasonForOutcome)

    res.redirect(`/cases/${caseId}/dga/${failureReasonId}/record-dispute-outcome/method`)
  })

  // Step 2b: Methods
  router.get('/cases/:caseId/dga/:failureReasonId/record-dispute-outcome/method', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const failureReasonId = parseInt(req.params.failureReasonId)
    const caseData = await fetchCase(caseId, failureReasonId)

    res.render('cases/dga/record-dispute-outcome/method', {
      case: caseData,
      failureReason: caseData.dga.failureReasons[0],
      selectedMethods: req.session.data.recordOutcome?.discussionMethods || []
    })
  })

  router.post('/cases/:caseId/dga/:failureReasonId/record-dispute-outcome/method', (req, res) => {
    const caseId = req.params.caseId
    const failureReasonId = req.params.failureReasonId
    let discussionMethods = req.body.recordOutcome?.discussionMethods

    if (!discussionMethods) {
      discussionMethods = []
    } else if (!Array.isArray(discussionMethods)) {
      discussionMethods = [discussionMethods]
    }
    discussionMethods = discussionMethods.filter(m => m !== '_unchecked')

    _.set(req, 'session.data.recordOutcome.discussionMethods', discussionMethods)

    res.redirect(`/cases/${caseId}/dga/${failureReasonId}/record-dispute-outcome/check`)
  })

  // Step 3: Check answers
  router.get('/cases/:caseId/dga/:failureReasonId/record-dispute-outcome/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const failureReasonId = parseInt(req.params.failureReasonId)

    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: { dga: { include: { failureReasons: true } } }
    })

    const failureReason = caseData.dga.failureReasons.find(fr => fr.id === failureReasonId)
    const allFailureReasons = caseData.dga.failureReasons

    let legacyOutcome = null
    if (isFinalFailure(allFailureReasons)) {
      const simulatedReasons = allFailureReasons.map(fr => {
        if (fr.id === failureReasonId) {
          return {
            ...fr,
            didPoliceDisputeFailure: req.session.data.recordOutcome?.didPoliceDisputeFailure,
            didCpsAcceptDispute: req.session.data.recordOutcome?.didCpsAcceptDispute
          }
        }
        return fr
      })
      legacyOutcome = calculateLegacyOutcome(simulatedReasons)
    }

    res.render('cases/dga/record-dispute-outcome/check', {
      case: caseData,
      failureReason,
      legacyOutcome
    })
  })

  router.post('/cases/:caseId/dga/:failureReasonId/record-dispute-outcome/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const failureReasonId = parseInt(req.params.failureReasonId)

    const didPoliceDisputeFailure = req.session.data.recordOutcome?.didPoliceDisputeFailure
    const didCpsAcceptDispute = req.session.data.recordOutcome?.didCpsAcceptDispute
    const reasonForOutcome = req.session.data.recordOutcome?.reasonForOutcome
    const discussionMethods = req.session.data.recordOutcome?.discussionMethods

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

    // Derive month name for activity log
    const date = new Date(caseData.dga.reviewDate)
    const monthName = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

    const meta = {
      failureReason: failureReason.reason,
      policeUnit: caseData.policeUnit?.name || 'Not specified',
      monthName,
      ...req.session.data.recordOutcome
    }

    await prisma.activityLog.create({
      data: {
        userId: req.session.data.user.id,
        model: 'DGAFailureReason',
        recordId: failureReasonId,
        action: 'UPDATE',
        title: 'DGA dispute outcome recorded',
        caseId,
        meta
      }
    })

    delete req.session.data.recordOutcome

    req.flash('success', 'DGA dispute outcome recorded')

    res.redirect(`/cases/${caseId}/dga`)
  })

}
