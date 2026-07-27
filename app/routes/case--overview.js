const _ = require('lodash')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { addTimeLimitDates } = require('../helpers/timeLimit')
const { addCaseStatus } = require('../helpers/caseStatus')

module.exports = router => {
  router.get("/cases/:caseId", async (req, res) => {
    let _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: {
        unit: true,
        prosecutors: {
          include: {
            user: true
          },
          orderBy: {
            isLead: 'desc'
          }
        },
        paralegalOfficers: {
          include: {
            user: true
          }
        },
        defendants: {
          include: {
            charges: {
              include: { elements: { orderBy: { order: 'asc' } } }
            },
            defenceLawyer: true
          }
        },
        hearings: {
          orderBy: { startDate: 'asc' }
        },
        location: true,
        tasks: true,
        dga: true
      },
    })

    addTimeLimitDates(_case)
    addCaseStatus(_case)

    const elementIds = _case.defendants.flatMap(defendant =>
      defendant.charges.flatMap(charge => charge.elements.map(element => element.id))
    )
    const annotationLinks = await prisma.caseReviewAnnotationElement.findMany({
      where: { elementId: { in: elementIds }, annotation: { type: { in: ['evidence', 'issue'] } } },
      orderBy: { createdAt: 'asc' },
      include: {
        annotation: {
          include: {
            caseReviewDocument: { include: { document: true } },
            elements: { include: { element: { include: { charge: true } } } }
          }
        }
      }
    })
    const annotationsByElementId = _.groupBy(annotationLinks, 'elementId')

    const submittedReview = await prisma.caseReview.findFirst({
      where: { caseId: _case.id, status: 'submitted' }
    })

    const charges = _case.defendants.flatMap(defendant =>
      defendant.charges.map(charge => ({
        ...charge,
        defendant,
        elements: charge.elements.map(element => ({
          ...element,
          strength: submittedReview ? element.strength : null,
          strengthReasoning: submittedReview ? element.strengthReasoning : null,
          reviewAnnotations: submittedReview
            ? (annotationsByElementId[element.id] || []).map(link => link.annotation)
            : []
        }))
      }))
    )

    const summary = submittedReview ? submittedReview.summary : null
    const elementsAssessed = !!submittedReview

    res.render("cases/overview/index", { _case, charges, summary, elementsAssessed })
  })

  router.get("/cases/:caseId/complexity-calculation", async (req, res) => {
    let _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: {
        unit: true,
        prosecutors: {
          include: {
            user: true
          },
          orderBy: {
            isLead: 'desc'
          }
        },
        paralegalOfficers: {
          include: {
            user: true
          }
        },
        defendants: {
          include: {
            charges: true,
            defenceLawyer: true
          }
        },
        hearings: {
          orderBy: {
            startDate: 'asc'
          },
          take: 1
        },
        location: true,
        tasks: true,
        dga: true
      },
    })

    addTimeLimitDates(_case)
    addCaseStatus(_case)

    res.render("cases/complexity-calculation/index", { _case })
  })

}