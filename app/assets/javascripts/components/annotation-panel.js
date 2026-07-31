App.AnnotationPanel = function(params) {
  this.container = params.container

  this.popup                         = $('.js-annotation-popup')
  this.annotateBtns                  = $('.js-annotate-btn')
  this.redactBtn                     = $('.js-redact-btn')
  this.newAnnotationCards            = $('.js-new-annotation-card')
  this.activeAnnotationCard          = null
  this.sidebarInner                  = $('.js-sidebar-inner')
  this.sidebarEmpty                  = $('.js-sidebar-empty')
  this.annotationForm                = $('#annotation-form')
  this.selectedTextInput             = $('#annotation-selected-text')
  this.typeHiddenInput               = $('#annotation-type-hidden')
  this.noteHiddenInput               = $('#annotation-note-hidden')
  this.annotationParagraphIndexInput  = $('#annotation-paragraph-index')
  this.annotationOccurrenceIndexInput = $('#annotation-occurrence-index')
  this.redactionForm                  = $('#redaction-form')
  this.redactionSelectedTextInput     = $('#redaction-selected-text')
  this.redactionParagraphIndexInput   = $('#redaction-paragraph-index')
  this.redactionOccurrenceIndexInput  = $('#redaction-occurrence-index')
  this.redactionDeleteForm           = $('#redaction-delete-form')
  this.toggleRedactionsBtn           = $('.js-toggle-redactions')
  this.selectionActions              = $('.js-selection-actions')
  this.redactionActions              = $('.js-redaction-actions')
  this.deleteRedactionBtn            = $('.js-delete-redaction-btn')

  this.caseId     = this.container.data('case-id')
  this.documentId = this.container.data('document-id')

  this.currentRange                = null
  this.selectionMark               = null
  this.redactionsHidden            = false
  this.pendingAnnotationType       = null
  this.pendingDeleteRedactionId    = null
  this.formSelectionDocumentY      = null

  // Cards can grow after opening (e.g. GOV.UK conditional checkbox reveals
  // adding a reasoning textarea), which happens outside our own event
  // handlers. Watching height directly means every card, current and future,
  // stays correctly spaced without us having to know what caused the resize.
  this.resizeObserver = new ResizeObserver($.proxy(this, 'repositionCards'))

  this.setupEvents()
  this.initGovukComponents()
  this.positionAllCards()
  this.handleUrlHash()
}

// The sidebar's GOV.UK components (eg checkbox conditional reveals) need
// initialising here as well as after every AJAX swap in applyAnnotationUpdate
// — relying solely on the page-wide initAll() at load time would only cover
// the sidebar's first render, not any HTML swapped in afterwards.
App.AnnotationPanel.prototype.initGovukComponents = function() {
  window.GOVUKFrontend.initAll({ scope: this.sidebarInner[0] })
}

App.AnnotationPanel.prototype.setupEvents = function() {
  this.container.on('mouseup', $.proxy(this, 'onDocumentMouseup'))
  this.container.on('click', $.proxy(this, 'onDocumentClick'))
  this.annotateBtns.on('click', $.proxy(this, 'onAnnotateBtnClick'))
  this.redactBtn.on('click', $.proxy(this, 'onRedactClick'))
  this.deleteRedactionBtn.on('click', $.proxy(this, 'onDeleteRedactionClick'))
  this.toggleRedactionsBtn.on('click', $.proxy(this, 'onToggleRedactionsClick'))
  this.sidebarInner.on('click', '.js-save-annotation', $.proxy(this, 'onSaveClick'))
  this.sidebarInner.on('click', '.js-cancel-annotation', $.proxy(this, 'onCancelClick'))
  this.sidebarInner.on('click', '.js-annotation-card', $.proxy(this, 'onCardClick'))
  this.sidebarInner.on('click', '.js-change-annotation', $.proxy(this, 'onChangeAnnotationClick'))
  this.sidebarInner.on('click', '.js-cancel-change-annotation', $.proxy(this, 'onCancelChangeAnnotationClick'))
  this.sidebarInner.on('click', '.js-save-change-annotation', $.proxy(this, 'onSaveChangeAnnotationClick'))
  this.sidebarInner.on('submit', '.js-annotation-edit-note', $.proxy(this, 'onSubmitEditNoteForm'))
  $(document).on('mousedown', $.proxy(this, 'onDocumentMousedown'))
  $(document).on('keydown', $.proxy(this, 'onDocumentKeydown'))
  $(window).on('resize', $.proxy(this, 'positionAllCards'))
}

// ── Popup ─────────────────────────────────────────────────────────────────────

App.AnnotationPanel.prototype.hidePopup = function() {
  this.popup.prop('hidden', true).attr('aria-hidden', 'true')
  this.pendingDeleteRedactionId = null
  window.getSelection().removeAllRanges()
}

App.AnnotationPanel.prototype.showPopup = function(rect) {
  var popupEl = this.popup[0]
  this.popup.prop('hidden', false).removeAttr('aria-hidden')

  var popupWidth = popupEl.offsetWidth
  var popupHeight = popupEl.offsetHeight
  var arrowHeight = 9

  var left = rect.left + window.scrollX + rect.width / 2 - popupWidth / 2
  left = Math.max(8, Math.min(left, window.scrollX + window.innerWidth - popupWidth - 8))
  var top = rect.top + window.scrollY - popupHeight - arrowHeight - 4

  this.popup.css({ left: left + 'px', top: top + 'px' })
}

App.AnnotationPanel.prototype.showSelectionPopup = function(rect) {
  this.selectionActions.prop('hidden', false)
  this.redactionActions.prop('hidden', true)
  this.showPopup(rect)
}

App.AnnotationPanel.prototype.showRedactionPopup = function(rect, redactionId) {
  this.pendingDeleteRedactionId = redactionId
  this.selectionActions.prop('hidden', true)
  this.redactionActions.prop('hidden', false)
  this.showPopup(rect)
}

// ── Cards ─────────────────────────────────────────────────────────────────────

App.AnnotationPanel.prototype.clearSelectionHighlight = function() {
  if (!this.selectionMark) return
  var parent = this.selectionMark.parentNode
  while (this.selectionMark.firstChild) {
    parent.insertBefore(this.selectionMark.firstChild, this.selectionMark)
  }
  parent.removeChild(this.selectionMark)
  this.selectionMark = null
}

App.AnnotationPanel.prototype.hideNewCard = function() {
  this.newAnnotationCards.prop('hidden', true)
  this.newAnnotationCards.find('.js-annotation-note-input').val('')
  this.newAnnotationCards.find('.js-annotation-element-reasoning').val('')
  this.newAnnotationCards.find('input[name="elementsCheckbox"]:checked')
    .prop('checked', false)
    .trigger('change')
  this.annotationForm.find('.js-annotation-element-hidden').remove()
  this.activeAnnotationCard = null
  this.clearSelectionHighlight()
  this.selectedTextInput.val('')
  this.pendingAnnotationType = null
  this.currentRange = null
  this.formSelectionDocumentY = null
  this.positionAllCards()
}

// Positions saved annotation cards and the in-progress form card inline with
// their document marks, pushing cards down to prevent overlap.
App.AnnotationPanel.prototype.positionAllCards = function() {
  if (!this.sidebarInner.length) return

  var sidebarRect = this.sidebarInner[0].getBoundingClientRect()
  var MIN_GAP = 8
  var items = []
  var self = this

  $('.js-annotation-card[data-annotation-id]').each(function() {
    var card = this
    var id = $(card).data('annotation-id')
    var mark = document.querySelector('.app-annotation[data-annotation-id="' + id + '"]')
    var markCentreY = 0
    if (mark) {
      var markRect = mark.getBoundingClientRect()
      markCentreY = markRect.top + markRect.height / 2 - sidebarRect.top
    }
    items.push({ card: card, height: card.offsetHeight, markCentreY: markCentreY, idealTop: markCentreY - card.offsetHeight / 2 })
    self.resizeObserver.observe(card)
  })

  var formCard = this.activeAnnotationCard ? this.activeAnnotationCard[0] : null
  if (formCard && !formCard.hidden && this.formSelectionDocumentY !== null) {
    var formViewportY = this.formSelectionDocumentY - window.scrollY
    var formMarkCentreY = formViewportY - sidebarRect.top
    items.push({ card: formCard, height: formCard.offsetHeight, markCentreY: formMarkCentreY, idealTop: formMarkCentreY - formCard.offsetHeight / 2 })
    this.resizeObserver.observe(formCard)
  }

  if (!items.length) return

  // Sort by mark centre position, not idealTop — idealTop includes card height
  // so taller cards (like the form) would wrongly sort before shorter ones
  items.sort(function(a, b) { return a.markCentreY - b.markCentreY })

  this.sidebarInner.css('position', 'relative')

  var nextMinTop = 0
  items.forEach(function(item) {
    var top = Math.max(0, item.idealTop, nextMinTop)
    $(item.card).css({ position: 'absolute', top: top + 'px', left: '0', right: '0', marginBottom: '0' })
    nextMinTop = top + item.height + MIN_GAP
  })

  var lastItem = items[items.length - 1]
  var lastBottom = parseFloat($(lastItem.card).css('top')) + lastItem.height
  this.sidebarInner.css('min-height', lastBottom + 'px')
}

App.AnnotationPanel.prototype.repositionCards = function() {
  requestAnimationFrame($.proxy(this, 'positionAllCards'))
}

// scrollIntoView defaults to true (used when landing on an annotation linked
// in from elsewhere, e.g. #annotation-id); pass false when the user is
// already looking at what they just saved and shouldn't be scrolled at all.
App.AnnotationPanel.prototype.activateMark = function(annotationId, scrollIntoView) {
  $('.app-annotation').removeClass('app-annotation--active')
  if (!annotationId) return
  var mark = $('.app-annotation[data-annotation-id="' + annotationId + '"]')
  mark.addClass('app-annotation--active')
  if (scrollIntoView !== false && mark[0]) mark[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

App.AnnotationPanel.prototype.activateCard = function(annotationId, scrollIntoView) {
  $('.js-annotation-card').removeClass('is-selected app-annotation-card--active')
  if (annotationId) {
    var card = $('.js-annotation-card[data-annotation-id="' + annotationId + '"]')
    card.addClass('is-selected app-annotation-card--active')
    if (scrollIntoView !== false && card[0]) card[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
  this.repositionCards()
}

App.AnnotationPanel.prototype.handleUrlHash = function() {
  var match = window.location.hash.match(/^#annotation-(\d+)$/)
  if (!match) return
  this.activateCard(match[1])
  this.activateMark(match[1])
}

// The "new annotation" cards and empty-state message live inside the sidebar
// HTML that gets replaced wholesale after every save, so cached references to
// them go stale unless re-queried after each swap.
App.AnnotationPanel.prototype.refreshSidebarCache = function() {
  this.newAnnotationCards = $('.js-new-annotation-card')
  this.sidebarEmpty = $('.js-sidebar-empty')
}

App.AnnotationPanel.prototype.setButtonLoading = function(button, isLoading) {
  if (!button || !button.length) return
  if (isLoading) {
    button.data('original-text', button.text())
    button.text('Saving...').prop('disabled', true).attr('aria-disabled', 'true')
  } else {
    button.text(button.data('original-text')).prop('disabled', false).removeAttr('aria-disabled')
  }
}

// Saving/editing an annotation never navigates — the server re-renders the
// sidebar (and, for text documents, the document body) and we swap the HTML
// in place, so scroll position is never touched. `button` is the specific
// Save button that triggered this, shown a loading state while the request
// is in flight (it only needs resetting on failure — on success it's part of
// the sidebar HTML that just got replaced).
App.AnnotationPanel.prototype.submitAnnotationForm = function(form, button) {
  var self = this
  this.setButtonLoading(button, true)
  $.ajax({
    url: form.attr('action'),
    method: 'POST',
    data: form.serialize(),
    dataType: 'json'
  }).done(function(data) {
    self.applyAnnotationUpdate(data)
  }).fail(function() {
    // eslint-disable-next-line no-console
    console.error('Failed to save annotation')
    self.setButtonLoading(button, false)
  })
}

App.AnnotationPanel.prototype.applyAnnotationUpdate = function(data) {
  // Reset any in-progress new-card state (and its selection highlight in the
  // document) before the DOM it refers to is replaced.
  this.hideNewCard()

  this.sidebarInner.html(data.sidebarHtml)
  if (data.documentHtml) this.container.html(data.documentHtml)
  this.initGovukComponents()
  this.refreshSidebarCache()
  this.repositionCards()

  // The user is already looking at what they just saved, so highlight it
  // without scrolling anywhere — scrollIntoView is only for landing on an
  // annotation linked in from elsewhere (see handleUrlHash).
  this.activateCard(data.annotationId, false)
  this.activateMark(data.annotationId, false)

  // Focus moves to the saved card so it never falls back to <body>, which is
  // what happened when this used to be a full page reload — preventScroll
  // stops the browser's default focus-triggered scroll from moving the page.
  var target = $('.js-annotation-card[data-annotation-id="' + data.annotationId + '"] .js-change-annotation').first()
  if (target.length) target.attr('tabindex', '-1').focus({ preventScroll: true })
}

// Redacting/unredacting never navigates either — only the document body
// changes (redactions aren't listed in the sidebar), swapped in place.
App.AnnotationPanel.prototype.submitRedactionForm = function(form) {
  var self = this
  $.ajax({
    url: form.attr('action'),
    method: 'POST',
    data: form.serialize(),
    dataType: 'json'
  }).done(function(data) {
    self.applyRedactionUpdate(data)
  }).fail(function() {
    // eslint-disable-next-line no-console
    console.error('Failed to save redaction')
  })
}

App.AnnotationPanel.prototype.applyRedactionUpdate = function(data) {
  this.container.html(data.documentHtml)
}

// ── Event handlers ────────────────────────────────────────────────────────────

App.AnnotationPanel.prototype.onDocumentMouseup = function(e) {
  // In the materials view the popup's own buttons are neutralised by
  // ActionsDisabledGuard, but that still let the menu appear and be
  // reached — better to not show it at all when selecting is a dead end.
  if (this.popup.hasClass('app-actions-disabled')) return
  var self = this
  setTimeout(function() {
    if ($(e.target).closest('.app-redaction').length) return
    var selection = window.getSelection()
    if (!selection || selection.isCollapsed) { self.hidePopup(); return }
    var selectedText = selection.toString().trim()
    if (!selectedText || selectedText.length < 3) { self.hidePopup(); return }
    var range = selection.getRangeAt(0)
    if (!self.container[0].contains(range.commonAncestorContainer)) { self.hidePopup(); return }
    self.currentRange = range.cloneRange()
    self.showSelectionPopup(range.getBoundingClientRect())
  }, 10)
}

App.AnnotationPanel.prototype.onAnnotateBtnClick = function(e) {
  if (!this.currentRange) return

  this.pendingAnnotationType = $(e.currentTarget).data('type')
  var selectedText = this.currentRange.toString().trim()
  this.selectedTextInput.val(selectedText)

  var position = this.getParagraphOccurrence(this.currentRange, selectedText)
  this.annotationParagraphIndexInput.val(position.paragraphIndex)
  this.annotationOccurrenceIndexInput.val(position.occurrenceIndex)

  var rect = this.currentRange.getBoundingClientRect()
  this.formSelectionDocumentY = rect.top + rect.height / 2 + window.scrollY

  this.clearSelectionHighlight()
  try {
    this.selectionMark = document.createElement('span')
    this.selectionMark.className = 'app-annotation-selecting'
    this.currentRange.surroundContents(this.selectionMark)
  } catch(err) {
    this.selectionMark = null
  }

  window.getSelection().removeAllRanges()
  this.hidePopup()
  this.newAnnotationCards.prop('hidden', true)
  this.activeAnnotationCard = this.newAnnotationCards.filter('.js-new-annotation-card--' + this.pendingAnnotationType)
  this.activeAnnotationCard.prop('hidden', false)
  this.sidebarEmpty.prop('hidden', true)
  this.positionAllCards()
  var checkboxes = this.activeAnnotationCard.find('input[name="elementsCheckbox"]')
  if (checkboxes.length) {
    checkboxes.first().focus()
  } else {
    this.activeAnnotationCard.find('.js-annotation-note-input').focus()
  }
}

// Finds which paragraph a range's selection starts in and which occurrence
// of the selected text within that paragraph it is, so the server can target
// the exact instance the user selected rather than every matching string in
// the document.
App.AnnotationPanel.prototype.getParagraphOccurrence = function(range, selectedText) {
  var allParas = this.container.find('.app-document__paragraph').toArray()
  var startNode = range.startContainer
  var startEl = startNode.nodeType === 3 ? startNode.parentNode : startNode
  var paraEl = $(startEl).closest('.app-document__paragraph')[0]
  var paragraphIndex = paraEl ? allParas.indexOf(paraEl) : 0
  var occurrenceIndex = 0

  if (paraEl) {
    var paraRange = document.createRange()
    paraRange.setStart(paraEl, 0)
    paraRange.setEnd(range.startContainer, range.startOffset)
    var selectionStart = paraRange.toString().length
    var paraText = paraEl.textContent
    var searchFrom = 0
    while (true) {
      var idx = paraText.indexOf(selectedText, searchFrom)
      if (idx === -1 || idx >= selectionStart) break
      occurrenceIndex++
      searchFrom = idx + 1
    }
  }

  return { paragraphIndex: paragraphIndex, occurrenceIndex: occurrenceIndex }
}

App.AnnotationPanel.prototype.onRedactClick = function() {
  if (!this.currentRange) return
  var selectedText = this.currentRange.toString().trim()
  if (!selectedText) return

  var position = this.getParagraphOccurrence(this.currentRange, selectedText)

  this.redactionSelectedTextInput.val(selectedText)
  this.redactionParagraphIndexInput.val(position.paragraphIndex)
  this.redactionOccurrenceIndexInput.val(position.occurrenceIndex)
  window.getSelection().removeAllRanges()
  this.hidePopup()
  this.submitRedactionForm(this.redactionForm)
}

App.AnnotationPanel.prototype.onDocumentClick = function(e) {
  var annotation = $(e.target).closest('.app-annotation')
  if (annotation.length) {
    var annotationId = annotation.data('annotation-id')
    this.activateCard(annotationId)
    this.activateMark(annotationId)
    return
  }

  if (this.redactionsHidden) return
  var redaction = $(e.target).closest('.app-redaction')
  if (!redaction.length) return
  var redactionId = redaction.data('redaction-id')
  if (!redactionId) return
  window.getSelection().removeAllRanges()
  this.showRedactionPopup(redaction[0].getBoundingClientRect(), redactionId)
}

App.AnnotationPanel.prototype.onDeleteRedactionClick = function() {
  if (!this.pendingDeleteRedactionId) return
  this.redactionDeleteForm.attr('action', '/cases/' + this.caseId + '/review/documents/' + this.documentId + '/redactions/' + this.pendingDeleteRedactionId + '/delete')
  this.hidePopup()
  this.submitRedactionForm(this.redactionDeleteForm)
}

App.AnnotationPanel.prototype.onToggleRedactionsClick = function() {
  this.redactionsHidden = !this.redactionsHidden
  this.container.toggleClass('app-redactions-hidden', this.redactionsHidden)
  this.toggleRedactionsBtn.text(this.redactionsHidden ? 'Show redactions' : 'Hide redactions')
}

App.AnnotationPanel.prototype.onSaveClick = function(e) {
  if (this.activeAnnotationCard.find('input[name="elementsCheckbox"]').length) {
    this.onSaveEvidenceClick(e)
    return
  }
  var noteInput = this.activeAnnotationCard.find('.js-annotation-note-input')
  var note = noteInput.val().trim()
  if (!note) { noteInput.focus(); return }
  this.typeHiddenInput.val(this.pendingAnnotationType)
  this.noteHiddenInput.val(note)
  this.submitAnnotationForm(this.annotationForm, $(e.currentTarget))
}

// Evidence and issue annotations link one or more elements, each with
// its own reasoning (revealed under its checkbox), rather than a single
// shared note.
App.AnnotationPanel.prototype.onSaveEvidenceClick = function(e) {
  var self = this
  var checked = this.activeAnnotationCard.find('input[name="elementsCheckbox"]:checked')

  if (!checked.length) {
    this.activeAnnotationCard.find('input[name="elementsCheckbox"]').first().focus()
    return
  }

  var fields = []

  checked.each(function() {
    var elementId = $(this).val()
    var textarea = self.activeAnnotationCard.find('.js-annotation-element-reasoning[data-element-id="' + elementId + '"]')
    var reasoning = textarea.val().trim()
    fields.push({ elementId: elementId, reasoning: reasoning })
  })

  this.annotationForm.find('.js-annotation-element-hidden').remove()
  fields.forEach(function(field) {
    $('<input>', {
      type: 'hidden',
      class: 'js-annotation-element-hidden',
      name: 'elements[' + field.elementId + ']',
      value: field.reasoning
    }).appendTo(self.annotationForm)
  })

  this.typeHiddenInput.val(this.pendingAnnotationType)
  this.noteHiddenInput.val('')
  this.submitAnnotationForm(this.annotationForm, $(e.currentTarget))
}

App.AnnotationPanel.prototype.onCancelClick = function(e) {
  e.preventDefault()
  this.hideNewCard()
  if (!$('.js-annotation-card').length) {
    this.sidebarEmpty.prop('hidden', false)
  }
}

App.AnnotationPanel.prototype.onCardClick = function(e) {
  if ($(e.target).closest('a, .js-annotation-edit-form').length) return
  var card = $(e.currentTarget)
  this.deselectAllCards()
  card.addClass('is-selected')
  this.activateMark(card.data('annotation-id'))
  this.repositionCards()
}

// Closes any card left mid-edit so a deselected card never keeps its edit
// form open with no way to see it's still unsaved.
App.AnnotationPanel.prototype.deselectAllCards = function() {
  var self = this
  $('.js-annotation-card').removeClass('is-selected app-annotation-card--active').each(function() {
    self.hideAnnotationEditForm($(this))
  })
}

// Resets an in-progress edit (note text, checked elements and their reasoning)
// back to the values it was opened with, then hides it.
App.AnnotationPanel.prototype.hideAnnotationEditForm = function(card) {
  var form = card.find('.js-annotation-edit-form')
  if (!form.length || form.prop('hidden')) return

  form.find('textarea').each(function() { this.value = this.defaultValue })
  form.find('input[name="elementsCheckbox"]').each(function() { this.checked = this.defaultChecked })
  form.find('.js-annotation-element-hidden').remove()

  form.prop('hidden', true)
  card.find('.js-annotation-view').prop('hidden', false)
}

App.AnnotationPanel.prototype.onChangeAnnotationClick = function(e) {
  e.preventDefault()
  var link = $(e.currentTarget)
  var card = link.closest('.js-annotation-card')
  var editForm = card.find('.js-annotation-edit-form')
  var checkboxForm = editForm.find('.js-annotation-edit-checkboxes')
  var issueCheckboxForm = editForm.find('.js-annotation-edit-checkboxes-issue')
  var noteForm = editForm.find('.js-annotation-edit-note')
  var tagCheckboxes = editForm.find('.js-annotation-edit-tag-checkboxes')
  var tagIssueCheckboxes = editForm.find('.js-annotation-edit-tag-checkboxes-issue')
  var tagNote = editForm.find('.js-annotation-edit-tag-note')
  var target = link.data('edit-target')
  var showIssueCheckboxes = target === 'checkboxes-issue'
  var showCheckboxes = showIssueCheckboxes ? false : (target ? target === 'checkboxes' : checkboxForm.length > 0)

  card.find('.js-annotation-view').prop('hidden', true)
  editForm.prop('hidden', false)
  checkboxForm.prop('hidden', !showCheckboxes)
  issueCheckboxForm.prop('hidden', !showIssueCheckboxes)
  noteForm.prop('hidden', showCheckboxes || showIssueCheckboxes)
  tagCheckboxes.prop('hidden', !showCheckboxes)
  tagIssueCheckboxes.prop('hidden', !showIssueCheckboxes)
  tagNote.prop('hidden', showCheckboxes || showIssueCheckboxes)

  var activeForm = showIssueCheckboxes ? issueCheckboxForm : (showCheckboxes ? checkboxForm : noteForm)
  if (activeForm.find('input[name="elementsCheckbox"]').length) {
    activeForm.find('input[name="elementsCheckbox"]').first().focus()
  } else {
    activeForm.find('textarea').first().focus()
  }
  this.repositionCards()
}

App.AnnotationPanel.prototype.onCancelChangeAnnotationClick = function(e) {
  e.preventDefault()
  this.hideAnnotationEditForm($(e.currentTarget).closest('.js-annotation-card'))
  this.repositionCards()
}

// Evidence edits only submit reasoning for elements that are actually checked —
// mirrors onSaveEvidenceClick so an unchecked element's leftover reasoning text
// never gets linked by accident.
App.AnnotationPanel.prototype.onSaveChangeAnnotationClick = function(e) {
  var form = $(e.currentTarget).closest('form')
  var checked = form.find('input[name="elementsCheckbox"]:checked')

  if (!checked.length) {
    form.find('input[name="elementsCheckbox"]').first().focus()
    return
  }

  var fields = []

  checked.each(function() {
    var elementId = $(this).val()
    var textarea = form.find('.js-annotation-element-reasoning[data-element-id="' + elementId + '"]')
    var reasoning = textarea.val().trim()
    fields.push({ elementId: elementId, reasoning: reasoning })
  })

  form.find('.js-annotation-element-hidden').remove()
  fields.forEach(function(field) {
    $('<input>', {
      type: 'hidden',
      class: 'js-annotation-element-hidden',
      name: 'elements[' + field.elementId + ']',
      value: field.reasoning
    }).appendTo(form)
  })

  this.submitAnnotationForm(form, $(e.currentTarget))
}

App.AnnotationPanel.prototype.onSubmitEditNoteForm = function(e) {
  e.preventDefault()
  var form = $(e.currentTarget)
  this.submitAnnotationForm(form, form.find('.govuk-button').first())
}

App.AnnotationPanel.prototype.onDocumentMousedown = function(e) {
  if (!this.popup[0].hidden && !$.contains(this.popup[0], e.target)) {
    this.hidePopup()
  }
  if (!$(e.target).closest('.js-annotation-card').length) {
    this.deselectAllCards()
    this.activateMark(null)
    this.repositionCards()
  }
}

App.AnnotationPanel.prototype.onDocumentKeydown = function(e) {
  if (e.key !== 'Escape') return
  if (!this.popup[0].hidden) this.hidePopup()
  if (this.newAnnotationCard.length && !this.newAnnotationCard[0].hidden) this.hideNewCard()
}
