const prisma = require('../lib/prisma')
const { getElementAnnotations } = require('../helpers/caseReview')

function buildReturnUrl(caseId, from, documentId) {
  if (from === 'document' && documentId) {
    return `/cases/${caseId}/review/documents/${documentId}`
  }
  return `/cases/${caseId}/review/charging-decision`
}

module.exports = (router) => {
  router.get('/cases/:caseId/elements/:elementId/edit', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const elementId = parseInt(req.params.elementId)
    const from = req.query.from || 'make-charging-decision'
    const documentId = req.query.documentId || ''

    const [_case, element, annotations] = await Promise.all([
      prisma.case.findUnique({ where: { id: caseId } }),
      prisma.element.findUnique({ where: { id: elementId } }),
      getElementAnnotations(prisma, elementId)
    ])

    res.render('cases/elements/edit', { _case, element, annotations, caseId, from, documentId })
  })

  router.post('/cases/:caseId/elements/:elementId/edit', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const elementId = parseInt(req.params.elementId)
    const { from, documentId, strength } = req.body
    const strengthReasoning = req.body.strengthReasoning?.[strength] || null

    await prisma.element.update({
      where: { id: elementId },
      data: { strength, strengthReasoning }
    })

    res.redirect(buildReturnUrl(caseId, from, documentId))
  })
}
