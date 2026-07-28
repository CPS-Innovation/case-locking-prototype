App.PhotoAnnotationPanel = function(params) {
  this.container = params.container

  this.typeBtns           = $('.js-photo-annotate-btn')
  this.newAnnotationCards = $('.js-new-annotation-card')
  this.activeAnnotationCard = null
  this.sidebarInner         = $('.js-sidebar-inner')
  this.sidebarEmpty         = $('.js-sidebar-empty')
  this.annotationForm       = $('#annotation-form')
  this.typeHiddenInput      = $('#annotation-type-hidden')
  this.noteHiddenInput      = $('#annotation-note-hidden')
  this.selectedTextHiddenInput = $('#annotation-selected-text')

  this.caseId     = this.container.data('case-id')
  this.documentId = this.container.data('document-id')

  this.pendingAnnotationType = null

  this.setupEvents()
  this.handleUrlHash()
}

App.PhotoAnnotationPanel.prototype.setupEvents = function() {
  this.typeBtns.on('click', $.proxy(this, 'onTypeBtnClick'))
  this.sidebarInner.on('click', '.js-save-annotation', $.proxy(this, 'onSaveClick'))
  this.sidebarInner.on('click', '.js-cancel-annotation', $.proxy(this, 'onCancelClick'))
  this.sidebarInner.on('click', '.js-annotation-card', $.proxy(this, 'onCardClick'))
  this.sidebarInner.on('click', '.js-change-annotation', $.proxy(this, 'onChangeAnnotationClick'))
  this.sidebarInner.on('click', '.js-cancel-change-annotation', $.proxy(this, 'onCancelChangeAnnotationClick'))
  this.sidebarInner.on('click', '.js-save-change-annotation', $.proxy(this, 'onSaveChangeAnnotationClick'))
  this.sidebarInner.on('submit', '.js-annotation-edit-note', $.proxy(this, 'onSubmitEditNoteForm'))
  $(document).on('mousedown', $.proxy(this, 'onDocumentMousedown'))
}

App.PhotoAnnotationPanel.prototype.onTypeBtnClick = function(e) {
  this.pendingAnnotationType = $(e.currentTarget).data('type')

  this.newAnnotationCards.prop('hidden', true)
  this.activeAnnotationCard = this.newAnnotationCards.filter('.js-new-annotation-card--' + this.pendingAnnotationType)
  this.activeAnnotationCard.prop('hidden', false)
  this.sidebarEmpty.prop('hidden', true)

  var checkboxes = this.activeAnnotationCard.find('input[name="elementsCheckbox"]')
  if (checkboxes.length) {
    checkboxes.first().focus()
  } else {
    this.activeAnnotationCard.find('.js-annotation-note-input').focus()
  }
}

App.PhotoAnnotationPanel.prototype.hideNewCard = function() {
  this.newAnnotationCards.prop('hidden', true)
  this.newAnnotationCards.find('.js-annotation-note-input').val('')
  this.newAnnotationCards.find('.js-annotation-element-reasoning').val('')
  this.newAnnotationCards.find('input[name="elementsCheckbox"]:checked')
    .prop('checked', false)
    .trigger('change')
  this.annotationForm.find('.js-annotation-element-hidden').remove()
  this.activeAnnotationCard = null
  this.pendingAnnotationType = null
}

App.PhotoAnnotationPanel.prototype.onSaveClick = function(e) {
  if (!this.pendingAnnotationType) return
  if (this.activeAnnotationCard.find('input[name="elementsCheckbox"]').length) {
    this.onSaveEvidenceClick(e)
    return
  }
  var noteInput = this.activeAnnotationCard.find('.js-annotation-note-input')
  var note = noteInput.val().trim()
  if (!note) { noteInput.focus(); return }
  this.typeHiddenInput.val(this.pendingAnnotationType)
  this.noteHiddenInput.val(note)
  this.selectedTextHiddenInput.val('Whole photo')
  this.submitAnnotationForm(this.annotationForm, $(e.currentTarget))
}

// Evidence and issue annotations link one or more elements, each with
// its own reasoning (revealed under its checkbox), rather than a single
// shared note.
App.PhotoAnnotationPanel.prototype.onSaveEvidenceClick = function(e) {
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
  this.selectedTextHiddenInput.val('Whole photo')
  this.submitAnnotationForm(this.annotationForm, $(e.currentTarget))
}

App.PhotoAnnotationPanel.prototype.onCancelClick = function(e) {
  e.preventDefault()
  this.hideNewCard()
  if (!$('.js-annotation-card').length) {
    this.sidebarEmpty.prop('hidden', false)
  }
}

App.PhotoAnnotationPanel.prototype.onCardClick = function(e) {
  if ($(e.target).closest('a, .js-annotation-edit-form').length) return
  var card = $(e.currentTarget)

  this.deselectAllCards()
  card.addClass('is-selected app-annotation-card--active')
}

// scrollIntoView defaults to true (used when landing on an annotation linked
// in from elsewhere, e.g. #annotation-id); pass false when the user is
// already looking at what they just saved and shouldn't be scrolled at all.
App.PhotoAnnotationPanel.prototype.activateCard = function(annotationId, scrollIntoView) {
  $('.js-annotation-card').removeClass('is-selected app-annotation-card--active')
  if (!annotationId) return
  var card = $('.js-annotation-card[data-annotation-id="' + annotationId + '"]')
  card.addClass('is-selected app-annotation-card--active')
  if (scrollIntoView !== false && card[0]) card[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

App.PhotoAnnotationPanel.prototype.handleUrlHash = function() {
  var match = window.location.hash.match(/^#annotation-(\d+)$/)
  if (!match) return
  this.activateCard(match[1])
}

// The "new annotation" cards and empty-state message live inside the sidebar
// HTML that gets replaced wholesale after every save, so cached references to
// them go stale unless re-queried after each swap.
App.PhotoAnnotationPanel.prototype.refreshSidebarCache = function() {
  this.newAnnotationCards = $('.js-new-annotation-card')
  this.sidebarEmpty = $('.js-sidebar-empty')
}

App.PhotoAnnotationPanel.prototype.setButtonLoading = function(button, isLoading) {
  if (!button || !button.length) return
  if (isLoading) {
    button.data('original-text', button.text())
    button.text('Please wait...').prop('disabled', true).attr('aria-disabled', 'true')
  } else {
    button.text(button.data('original-text')).prop('disabled', false).removeAttr('aria-disabled')
  }
}

// Saving/editing an annotation never navigates — the server re-renders the
// sidebar and we swap the HTML in place, so scroll position is never touched.
// `button` is the specific Save button that triggered this, shown a loading
// state while the request is in flight (it only needs resetting on failure —
// on success it's part of the sidebar HTML that just got replaced).
App.PhotoAnnotationPanel.prototype.submitAnnotationForm = function(form, button) {
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

App.PhotoAnnotationPanel.prototype.applyAnnotationUpdate = function(data) {
  // Reset any in-progress new-card state before the DOM it refers to is replaced.
  this.hideNewCard()

  this.sidebarInner.html(data.sidebarHtml)
  this.refreshSidebarCache()

  // The user is already looking at what they just saved, so highlight it
  // without scrolling anywhere — scrollIntoView is only for landing on an
  // annotation linked in from elsewhere (see handleUrlHash).
  this.activateCard(data.annotationId, false)

  // Focus moves to the saved card so it never falls back to <body>, which is
  // what happened when this used to be a full page reload — preventScroll
  // stops the browser's default focus-triggered scroll from moving the page.
  var target = $('.js-annotation-card[data-annotation-id="' + data.annotationId + '"] .js-change-annotation').first()
  if (target.length) target.attr('tabindex', '-1').focus({ preventScroll: true })
}

App.PhotoAnnotationPanel.prototype.onSubmitEditNoteForm = function(e) {
  e.preventDefault()
  var form = $(e.currentTarget)
  this.submitAnnotationForm(form, form.find('.govuk-button').first())
}

App.PhotoAnnotationPanel.prototype.onDocumentMousedown = function(e) {
  if ($(e.target).closest('.js-annotation-card').length) return
  this.deselectAllCards()
}

// Closes any card left mid-edit so a deselected card never keeps its edit
// form open with no way to see it's still unsaved.
App.PhotoAnnotationPanel.prototype.deselectAllCards = function() {
  var self = this
  $('.js-annotation-card').removeClass('is-selected app-annotation-card--active').each(function() {
    self.hideAnnotationEditForm($(this))
  })
}

// Resets an in-progress edit (note text, checked elements and their reasoning)
// back to the values it was opened with, then hides it.
App.PhotoAnnotationPanel.prototype.hideAnnotationEditForm = function(card) {
  var form = card.find('.js-annotation-edit-form')
  if (!form.length || form.prop('hidden')) return

  form.find('textarea').each(function() { this.value = this.defaultValue })
  form.find('input[name="elementsCheckbox"]').each(function() { this.checked = this.defaultChecked })
  form.find('.js-annotation-element-hidden').remove()

  form.prop('hidden', true)
  card.find('.js-annotation-view').prop('hidden', false)
}

App.PhotoAnnotationPanel.prototype.onChangeAnnotationClick = function(e) {
  e.preventDefault()
  var link = $(e.currentTarget)
  var card = link.closest('.js-annotation-card')
  var editForm = card.find('.js-annotation-edit-form')
  var checkboxForm = editForm.find('.js-annotation-edit-checkboxes')
  var noteForm = editForm.find('.js-annotation-edit-note')
  var target = link.data('edit-target')
  var showCheckboxes = target ? target === 'checkboxes' : checkboxForm.length > 0

  card.find('.js-annotation-view').prop('hidden', true)
  editForm.prop('hidden', false)
  checkboxForm.prop('hidden', !showCheckboxes)
  noteForm.prop('hidden', showCheckboxes)

  if (showCheckboxes) {
    checkboxForm.find('input[name="elementsCheckbox"]').first().focus()
  } else {
    noteForm.find('textarea').first().focus()
  }
}

App.PhotoAnnotationPanel.prototype.onCancelChangeAnnotationClick = function(e) {
  e.preventDefault()
  this.hideAnnotationEditForm($(e.currentTarget).closest('.js-annotation-card'))
}

// Evidence edits only submit reasoning for elements that are actually checked —
// mirrors onSaveEvidenceClick so an unchecked element's leftover reasoning text
// never gets linked by accident.
App.PhotoAnnotationPanel.prototype.onSaveChangeAnnotationClick = function(e) {
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
