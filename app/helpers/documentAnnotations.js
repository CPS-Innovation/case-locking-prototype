const _ = require('lodash')

// Targets the exact paragraph/occurrence the user selected, rather than
// replacing every matching string across the document.
function applyMarks(sections, items, markUp) {
  if (!items.length) return sections
  const flatParagraphs = sections.flatMap(s => s.paragraphs)
  items.forEach(item => {
    const paraIdx = item.paragraphIndex
    if (paraIdx < 0 || paraIdx >= flatParagraphs.length) return
    const escaped = item.selectedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escaped, 'g')
    const target = item.occurrenceIndex
    let count = 0
    flatParagraphs[paraIdx] = flatParagraphs[paraIdx].replace(regex, function(match) {
      return count++ === target ? markUp(item) : match
    })
  })
  let flatIdx = 0
  return sections.map(section => ({
    heading: section.heading,
    paragraphs: section.paragraphs.map(() => flatParagraphs[flatIdx++])
  }))
}

function applyHighlights(sections, annotations) {
  return applyMarks(sections, annotations, annotation =>
    `<mark class="app-annotation app-annotation--${annotation.type}" data-annotation-id="${annotation.id}">${annotation.selectedText}</mark>`
  )
}

function applyRedactions(sections, redactions) {
  return applyMarks(sections, redactions, redaction =>
    `<mark class="app-redaction" data-redaction-id="${redaction.id}">${redaction.selectedText}</mark>`
  )
}

// Evidence and disclosure annotations can link elements from more than one
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
    group.elements.push(link.element)
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
      checked: linkedReasoning !== undefined
      // Reason capture disabled — restore to re-enable:
      // conditional: {
      //   html: `<div class="govuk-form-group govuk-!-margin-bottom-0">
      // <label class="govuk-label govuk-label--s" for="${idPrefix}-${element.id}">Reason</label>
      // <textarea class="govuk-textarea govuk-!-margin-bottom-0 js-annotation-element-reasoning" id="${idPrefix}-${element.id}" name="${idPrefix}-${element.id}" rows="2" data-element-id="${element.id}">${_.escape(linkedReasoning || '')}</textarea>
      // </div>`
      // }
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
// assuming a single offence. Each evidence, disclosure or note annotation
// gets its own copy of the checkbox groups, pre-checked and pre-filled with
// whatever elements it's already linked to, so "Change" can re-open the same
// form used when it was first added.
function buildOffencesWithAnnotations(defendantCharges, annotations, caseId, documentId) {
  const offences = defendantCharges.map(charge => ({
    charge,
    elementRows: buildElementRows(charge.elements || [], caseId, documentId),
    elementCheckboxItems: buildElementCheckboxItems(charge.elements || [], {
      idPrefix: `reasoning-charge-${charge.id}`
    }),
    disclosureElementCheckboxItems: buildElementCheckboxItems(charge.elements || [], {
      idPrefix: `disclosure-reasoning-charge-${charge.id}`
    })
  }))

  const hasElements = offences.some(offence => offence.elementCheckboxItems.length)

  annotations.forEach(annotation => {
    annotation.elementGroups = groupElementsByCharge(annotation.elements)

    if (!['evidence', 'disclosure', 'note'].includes(annotation.type)) return
    const linkedByElementId = {}
    annotation.elements.forEach(item => { linkedByElementId[item.elementId] = item.reasoning })
    annotation.editOffences = offences.map(offence => ({
      charge: offence.charge,
      elementCheckboxItems: buildElementCheckboxItems(offence.charge.elements || [], {
        idPrefix: `reasoning-${annotation.id}-charge-${offence.charge.id}`,
        linkedByElementId
      })
    }))

    // A note isn't evidence or disclosure yet, so it needs both checkbox
    // groups on offer — whichever one gets linked turns the note into that type.
    if (annotation.type === 'note') {
      annotation.editDisclosureOffences = offences.map(offence => ({
        charge: offence.charge,
        elementCheckboxItems: buildElementCheckboxItems(offence.charge.elements || [], {
          idPrefix: `disclosure-reasoning-${annotation.id}-charge-${offence.charge.id}`,
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
  groupElementsByCharge
}
