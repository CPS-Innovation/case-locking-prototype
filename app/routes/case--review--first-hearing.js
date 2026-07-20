const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { findOrCreateReview, shapeFirstHearing } = require('../helpers/caseReview')

function buildDateHintExample() {
  const exampleDate = new Date()
  exampleDate.setMonth(exampleDate.getMonth() + 6)
  return `${exampleDate.getDate()} ${exampleDate.getMonth() + 1} ${exampleDate.getFullYear()}`
}

const EMPTY_FIRST_HEARING = { hearingDate: { day: '', month: '', year: '' }, time: '', venue: '' }

module.exports = (router) => {
  router.get('/cases/:caseId/review/first-hearing', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const _case = await prisma.case.findUnique({ where: { id: caseId } })
    const review = await findOrCreateReview(prisma, caseId, req.session.data.user.id)

    res.render('cases/review/first-hearing/index', {
      _case,
      reviewFirstHearing: shapeFirstHearing(review) || EMPTY_FIRST_HEARING,
      dateHintExample: buildDateHintExample(),
    })
  })

  router.post('/cases/:caseId/review/first-hearing', async (req, res) => {
    const caseId = req.params.caseId
    const review = await findOrCreateReview(prisma, parseInt(caseId), req.session.data.user.id)
    const hearingDate = req.body.reviewFirstHearing?.hearingDate || {}
    await prisma.caseReview.update({
      where: { id: review.id },
      data: {
        firstHearingDay: hearingDate.day || null,
        firstHearingMonth: hearingDate.month || null,
        firstHearingYear: hearingDate.year || null,
      },
    })
    res.redirect(`/cases/${caseId}/review/first-hearing/time`)
  })

  // First hearing details — time
  router.get('/cases/:caseId/review/first-hearing/time', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const _case = await prisma.case.findUnique({ where: { id: caseId } })
    const review = await findOrCreateReview(prisma, caseId, req.session.data.user.id)
    res.render('cases/review/first-hearing/time', {
      _case,
      reviewFirstHearing: shapeFirstHearing(review) || EMPTY_FIRST_HEARING,
    })
  })

  router.post('/cases/:caseId/review/first-hearing/time', async (req, res) => {
    const caseId = req.params.caseId
    const review = await findOrCreateReview(prisma, parseInt(caseId), req.session.data.user.id)
    await prisma.caseReview.update({
      where: { id: review.id },
      data: { firstHearingTime: req.body.reviewFirstHearing?.time || null },
    })
    res.redirect(`/cases/${caseId}/review/first-hearing/venue`)
  })

  // First hearing details — venue
  router.get('/cases/:caseId/review/first-hearing/venue', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const _case = await prisma.case.findUnique({ where: { id: caseId } })
    const review = await findOrCreateReview(prisma, caseId, req.session.data.user.id)
    res.render('cases/review/first-hearing/venue', {
      _case,
      reviewFirstHearing: shapeFirstHearing(review) || EMPTY_FIRST_HEARING,
    })
  })

  router.post('/cases/:caseId/review/first-hearing/venue', async (req, res) => {
    const caseId = req.params.caseId
    const review = await findOrCreateReview(prisma, parseInt(caseId), req.session.data.user.id)
    await prisma.caseReview.update({
      where: { id: review.id },
      data: { firstHearingVenue: req.body.reviewFirstHearing?.venue || null },
    })
    res.redirect(`/cases/${caseId}/review/first-hearing/check`)
  })

  // First hearing details — check answers
  router.get('/cases/:caseId/review/first-hearing/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const _case = await prisma.case.findUnique({ where: { id: caseId } })
    const review = await findOrCreateReview(prisma, caseId, req.session.data.user.id)
    res.render('cases/review/first-hearing/check', {
      _case,
      reviewFirstHearing: shapeFirstHearing(review) || EMPTY_FIRST_HEARING,
    })
  })

  router.post('/cases/:caseId/review/first-hearing/check', async (req, res) => {
    const caseId = req.params.caseId
    const review = await findOrCreateReview(prisma, parseInt(caseId), req.session.data.user.id)
    await prisma.caseReview.update({
      where: { id: review.id },
      data: { firstHearingConfirmed: req.body.complete === 'yes' },
    })
    res.redirect(`/cases/${caseId}/review`)
  })
}
