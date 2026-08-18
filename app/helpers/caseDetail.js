const { addTimeLimitDates } = require('./timeLimit')
const { addCaseStatus } = require('./caseStatus')
const { buildOverviewCharges } = require('./caseOverview')
const { joinSelectedTextByGroup } = require('./documentAnnotations')

// Full case detail used by the case overview page (and, from the review
// interruption guard, the interruption page, which needs the same case
// data as any other case-detail page since it renders the shared identity
// bar/navigation via _layouts/main.html).
async function getCaseDetail(prisma, caseId) {
  const _case = await prisma.case.findUnique({
    where: { id: caseId },
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

  if (!_case) return { _case: null }

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
          user: true,
          caseReviewDocument: {
            include: {
              document: { include: { witnessStatement: { include: { witness: true } } } }
            }
          }
        }
      }
    }
  })

  const submittedReview = await prisma.caseReview.findFirst({
    where: { caseId: _case.id, status: 'submitted' }
  })

  const joinedByGroup = await joinSelectedTextByGroup(prisma, annotationLinks.map(link => link.annotation))
  const charges = buildOverviewCharges(_case.defendants, annotationLinks, submittedReview, joinedByGroup)

  const summary = submittedReview ? submittedReview.summary : null
  const elementsAssessed = !!submittedReview

  return { _case, charges, summary, elementsAssessed }
}

module.exports = { getCaseDetail }
