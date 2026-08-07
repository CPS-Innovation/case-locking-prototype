const _ = require('lodash')

// Targets the exact paragraph/occurrence the user selected, rather than
// replacing every matching string across the document. Section headings are
// addressable too - each section contributes its heading (if any) as one
// block ahead of its paragraphs, so paragraphIndex is an index into that
// flat block list, not just paragraphs.
function flattenBlocks(sections) {
  return sections.flatMap(s => (s.heading ? [s.heading] : []).concat(s.paragraphs))
}

function applyMarks(sections, items, markUp) {
  if (!items.length) return sections
  const flatBlocks = flattenBlocks(sections)
  items.forEach(item => {
    const blockIdx = item.paragraphIndex
    if (blockIdx < 0 || blockIdx >= flatBlocks.length) return
    const escaped = item.selectedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escaped, 'g')
    const target = item.occurrenceIndex
    let count = 0
    flatBlocks[blockIdx] = flatBlocks[blockIdx].replace(regex, function(match) {
      return count++ === target ? markUp(item) : match
    })
  })
  let flatIdx = 0
  return sections.map(section => ({
    heading: section.heading ? flatBlocks[flatIdx++] : section.heading,
    paragraphs: section.paragraphs.map(() => flatBlocks[flatIdx++])
  }))
}

function applyHighlights(sections, annotations) {
  return applyMarks(sections, annotations, annotation =>
    `<mark class="app-annotation app-annotation--${annotation.type}" data-annotation-id="${annotation.groupId}">${annotation.selectedText}</mark>`
  )
}

function applyRedactions(sections, redactions) {
  return applyMarks(sections, redactions, redaction =>
    `<mark class="app-redaction" data-redaction-group-id="${redaction.groupId}">${redaction.selectedText}</mark>`
  )
}

// A selection spanning multiple paragraphs is stored as several
// CaseReviewAnnotation rows sharing one groupId (see getParagraphSelections
// in annotation-panel.js) — collapse each group back into a single item,
// keyed off the row for the first paragraph touched, which is also the only
// row any CaseReviewAnnotationElement links attach to.
function groupAnnotationRows(rows) {
  const byGroup = {}
  rows.forEach(row => {
    (byGroup[row.groupId] = byGroup[row.groupId] || []).push(row)
  })
  return Object.values(byGroup)
    .map(groupRows => {
      const sorted = [...groupRows].sort((a, b) => (a.paragraphIndex - b.paragraphIndex) || (a.occurrenceIndex - b.occurrenceIndex))
      return { ...sorted[0], selectedText: sorted.map(row => row.selectedText).join(' ') }
    })
    .sort((a, b) => a.createdAt - b.createdAt)
}

// Some callers only ever load the primary row of a group (eg via the
// CaseReviewAnnotationElement relation, which only ever links to the primary
// row) — this batches one lookup of every sibling paragraph row so the full
// selected quote can be shown instead of just the first paragraph.
async function joinSelectedTextByGroup(prisma, rows) {
  const groupIds = [...new Set(rows.map(row => row.groupId))]
  const joinedByGroup = new Map()
  if (!groupIds.length) return joinedByGroup

  const allRows = await prisma.caseReviewAnnotation.findMany({
    where: { groupId: { in: groupIds } },
    orderBy: [{ paragraphIndex: 'asc' }, { occurrenceIndex: 'asc' }]
  })

  const byGroup = {}
  allRows.forEach(row => {
    (byGroup[row.groupId] = byGroup[row.groupId] || []).push(row)
  })
  Object.entries(byGroup).forEach(([groupId, groupRows]) => {
    joinedByGroup.set(groupId, groupRows.map(row => row.selectedText).join(' '))
  })

  return joinedByGroup
}

// Evidence and issue annotations can link elements from more than one
// offence, so elements are grouped by charge before rendering — each group's
// elements render as a bullet list followed by a single offence line, rather
// than repeating the offence once per element.
function groupElementsByCharge(elements) {
  const groups = []
  const groupByChargeId = {}
  ;(elements || []).forEach(link => {
    const charge = link.element.charge
    let group = groupByChargeId[charge.id]
    if (!group) {
      group = { charge, elements: [] }
      groupByChargeId[charge.id] = group
      groups.push(group)
    }
    group.elements.push({ ...link.element, reasoning: link.reasoning })
  })
  return groups
}

function buildElementCheckboxItems(elements, options) {
  const idPrefix = options?.idPrefix || 'reasoning'
  const linkedByElementId = options?.linkedByElementId || {}
  return elements.map(element => {
    const linkedReasoning = linkedByElementId[element.id]
    return {
      value: String(element.id),
      text: element.description,
      checked: linkedReasoning !== undefined,
      conditional: {
        html: `<div class="govuk-form-group govuk-!-margin-bottom-0">
      <label class="govuk-label govuk-label--s" for="${idPrefix}-${element.id}">Comment (optional)</label>
      <textarea class="govuk-textarea govuk-!-margin-bottom-0 js-annotation-element-reasoning" id="${idPrefix}-${element.id}" name="${idPrefix}-${element.id}" rows="2" data-element-id="${element.id}">${_.escape(linkedReasoning || '')}</textarea>
      </div>`
      }
    }
  })
}

function buildElementRows(elements, caseId, documentId) {
  return elements.map(element => ({
    key: { text: element.description },
    value: {
      html: _.escape(element.strength || 'Not assessed') +
        (element.strengthReasoning
          ? `<br><span class="govuk-hint govuk-!-margin-bottom-0">${_.escape(element.strengthReasoning)}</span>`
          : '')
    },
    actions: {
      items: [
        {
          href: `/cases/${caseId}/review/documents/${documentId}/elements/${element.id}/edit`,
          text: 'Change',
          visuallyHiddenText: element.description
        }
      ]
    }
  }))
}

// Evidence annotations can link elements from any offence, so each offence
// gets its own checkbox group in the sidebar rather than one flat list
// assuming a single offence. Each evidence, issue or note annotation
// gets its own copy of the checkbox groups, pre-checked and pre-filled with
// whatever elements it's already linked to, so "Change" can re-open the same
// form used when it was first added.
function buildOffencesWithAnnotations(defendantCharges, annotations, caseId, documentId) {
  const offences = defendantCharges.map(charge => ({
    charge,
    elementRows: buildElementRows(charge.elements || [], caseId, documentId),
    elementCheckboxItems: buildElementCheckboxItems(charge.elements || [], {
      idPrefix: `reasoning-doc-${documentId}-charge-${charge.id}`
    }),
    issueElementCheckboxItems: buildElementCheckboxItems(charge.elements || [], {
      idPrefix: `issue-reasoning-doc-${documentId}-charge-${charge.id}`
    })
  }))

  const hasElements = offences.some(offence => offence.elementCheckboxItems.length)

  annotations.forEach(annotation => {
    annotation.elementGroups = groupElementsByCharge(annotation.elements)

    if (!['evidence', 'issue', 'note'].includes(annotation.type)) return
    const linkedByElementId = {}
    annotation.elements.forEach(item => { linkedByElementId[item.elementId] = item.reasoning })
    annotation.editOffences = offences.map(offence => ({
      charge: offence.charge,
      elementCheckboxItems: buildElementCheckboxItems(offence.charge.elements || [], {
        idPrefix: `reasoning-${annotation.id}-charge-${offence.charge.id}`,
        linkedByElementId
      })
    }))

    // A note isn't evidence or issue yet, so it needs both checkbox
    // groups on offer — whichever one gets linked turns the note into that type.
    if (annotation.type === 'note') {
      annotation.editIssueOffences = offences.map(offence => ({
        charge: offence.charge,
        elementCheckboxItems: buildElementCheckboxItems(offence.charge.elements || [], {
          idPrefix: `issue-reasoning-${annotation.id}-charge-${offence.charge.id}`,
          linkedByElementId
        })
      }))
    }
  })

  return { offences, hasElements }
}

module.exports = {
  applyHighlights,
  applyRedactions,
  buildElementCheckboxItems,
  buildOffencesWithAnnotations,
  flattenBlocks,
  groupElementsByCharge,
  groupAnnotationRows,
  joinSelectedTextByGroup
}
