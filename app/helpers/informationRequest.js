const ITEM_CATEGORIES = [
  'Documents and forms',
  'Footage',
  'Statements',
  'Forensic evidence',
  'Medical evidence',
  'Records',
  'Exhibits',
  'Other',
]

function itemNumber(n) {
  return String(n)
}

function buildDefendantItems(defendants) {
  return defendants.map(d => ({ value: String(d.id), text: `${d.firstName} ${d.lastName}` }))
}

function buildDate({ day, month, year }) {
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
}

function formatSessionDate({ day, month, year }) {
  if (!day || !month || !year) return ''
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function cleanDefendantIds(raw) {
  return [].concat(raw || []).filter(id => id !== '_unchecked')
}

function formatDefendantNames(ids, defendants) {
  const map = Object.fromEntries(defendants.map(d => [String(d.id), `${d.firstName} ${d.lastName}`]))
  return cleanDefendantIds(ids).map(id => map[id]).filter(Boolean).join(', ')
}

// Shared by the standalone "Information requests" flow (creates immediately)
// and the review "Information request" task (creates when the review is submitted).
async function createInformationRequestFromSession(prisma, caseId, sessionData, userId) {
  const { description, sentDate, items } = sessionData

  const informationRequest = await prisma.informationRequest.create({
    data: {
      caseId,
      description: description || null,
      sentDate: new Date(sentDate),
      items: {
        create: items.map((item) => ({
          description: item.description,
          category: item.category || null,
          dueDate: buildDate(item.dueDate),
          defendants: {
            connect: cleanDefendantIds(item.defendants).map(id => ({ id: parseInt(id) })),
          },
        })),
      },
    },
  })

  await prisma.activityLog.create({
    data: {
      userId,
      model: 'InformationRequest',
      recordId: informationRequest.id,
      action: 'CREATE',
      title: 'Information request created',
      caseId,
      meta: {
        description: description || null,
        items: items.map((item) => ({
          description: item.description,
          category: item.category || null,
          dueDate: formatSessionDate(item.dueDate),
        })),
      },
    },
  })

  await prisma.defendant.updateMany({
    where: { cases: { some: { id: caseId } } },
    data: { needsReview: false },
  })

  return informationRequest
}

module.exports = {
  ITEM_CATEGORIES,
  itemNumber,
  buildDefendantItems,
  buildDate,
  formatSessionDate,
  cleanDefendantIds,
  formatDefendantNames,
  createInformationRequestFromSession,
}
