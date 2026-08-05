// Scoped to this document's own `.app-document-section` wrapper (see
// annotation-panel.js) rather than looked up page-wide, so several documents
// can each carry an independent instance of this panel on the same page.
App.VideoAnnotationPanel = function(params) {
  this.container = params.container
  this.section = this.container.closest('.app-document-section')

  // Audio reviews share this panel - <audio> and <video> expose the same
  // pause/currentTime API, so timestamp annotation works identically.
  this.video              = this.container.find('video, audio')
  this.typeBtns           = this.section.find('.js-video-annotate-btn, .js-audio-annotate-btn')
  this.newAnnotationCards = this.section.find('.js-new-annotation-card')
  this.activeAnnotationCard = null
  this.sidebarInner         = this.section.find('.js-sidebar-inner')
  this.sidebarEmpty         = this.section.find('.js-sidebar-empty')
  this.annotationForm       = this.section.find('.js-annotation-form')
  this.typeHiddenInput      = this.section.find('.js-annotation-type-hidden')
  this.noteHiddenInput      = this.section.find('.js-annotation-note-hidden')
  this.timestampHiddenInput = this.section.find('.js-annotation-timestamp-hidden')

  this.caseId     = this.container.data('case-id')
  this.documentId = this.container.data('document-id')

  this.pendingAnnotationType = null
  this.pendingTimestamp      = null

  this.setupEvents()
  this.initGovukComponents()
  this.handleUrlHash()
}

// The sidebar's GOV.UK components (eg checkbox conditional reveals) need
// initialising here as well as after every AJAX swap in applyAnnotationUpdate
// — relying solely on the page-wide initAll() at load time would only cover
// the sidebar's first render, not any HTML swapped in afterwards.
// See the identical comment in annotation-panel.js — guarded because
// GOVUKFrontend (an ES module) may not have loaded yet when this runs on
// first page load, and on the combined "Material" page an uncaught throw
// here would abort construction of every panel after this one.
App.VideoAnnotationPanel.prototype.initGovukComponents = function() {
  if (window.GOVUKFrontend) window.GOVUKFrontend.initAll({ scope: this.sidebarInner[0] })
}

App.VideoAnnotationPanel.prototype.setupEvents = function() {
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

// Pausing captures the moment the user wants to annotate, and gives them a
// still frame to refer to while writing the note.
App.VideoAnnotationPanel.prototype.onTypeBtnClick = function(e) {
  var video = this.video[0]
  video.pause()

  this.pendingAnnotationType = $(e.currentTarget).data('type')
  this.pendingTimestamp = video.currentTime

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

App.VideoAnnotationPanel.prototype.hideNewCard = function() {
  this.newAnnotationCards.prop('hidden', true)
  this.newAnnotationCards.find('.js-annotation-note-input').val('')
  this.newAnnotationCards.find('.js-annotation-element-reasoning').val('')
  this.newAnnotationCards.find('input[name="elementsCheckbox"]:checked')
    .prop('checked', false)
    .trigger('change')
  this.annotationForm.find('.js-annotation-element-hidden').remove()
  this.activeAnnotationCard = null
  this.pendingAnnotationType = null
  this.pendingTimestamp = null
}

App.VideoAnnotationPanel.prototype.onSaveClick = function(e) {
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
  this.timestampHiddenInput.val(this.pendingTimestamp)
  this.submitAnnotationForm(this.annotationForm, $(e.currentTarget))
}

// Evidence and issue annotations link one or more elements, each with
// its own reasoning (revealed under its checkbox), rather than a single
// shared note.
App.VideoAnnotationPanel.prototype.onSaveEvidenceClick = function(e) {
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
  this.timestampHiddenInput.val(this.pendingTimestamp)
  this.submitAnnotationForm(this.annotationForm, $(e.currentTarget))
}

App.VideoAnnotationPanel.prototype.onCancelClick = function(e) {
  e.preventDefault()
  this.hideNewCard()
  if (!this.section.find('.js-annotation-card').length) {
    this.sidebarEmpty.prop('hidden', false)
  }
}

App.VideoAnnotationPanel.prototype.onCardClick = function(e) {
  if ($(e.target).closest('a, .js-annotation-edit-form').length) return
  var card = $(e.currentTarget)
  var timestampSeconds = card.data('timestamp-seconds')

  this.deselectAllCards()
  card.addClass('is-selected app-annotation-card--active')

  if (timestampSeconds !== undefined && this.video[0]) {
    this.video[0].currentTime = timestampSeconds
  }
}

// scrollIntoView defaults to true (used when landing on an annotation linked
// in from elsewhere, e.g. #annotation-id); pass false when the user is
// already looking at what they just saved and shouldn't be scrolled at all.
App.VideoAnnotationPanel.prototype.activateCard = function(annotationId, scrollIntoView) {
  this.section.find('.js-annotation-card').removeClass('is-selected app-annotation-card--active')
  if (!annotationId) return
  var card = this.section.find('.js-annotation-card[data-annotation-id="' + annotationId + '"]')
  card.addClass('is-selected app-annotation-card--active')
  if (scrollIntoView !== false && card[0]) card[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

App.VideoAnnotationPanel.prototype.handleUrlHash = function() {
  var match = window.location.hash.match(/^#annotation-(\d+)$/)
  if (!match) return
  this.activateCard(match[1])
}

// The "new annotation" cards and empty-state message live inside the sidebar
// HTML that gets replaced wholesale after every save, so cached references to
// them go stale unless re-queried after each swap.
App.VideoAnnotationPanel.prototype.refreshSidebarCache = function() {
  this.newAnnotationCards = this.section.find('.js-new-annotation-card')
  this.sidebarEmpty = this.section.find('.js-sidebar-empty')
}

App.VideoAnnotationPanel.prototype.setButtonLoading = function(button, isLoading) {
  if (!button || !button.length) return
  if (isLoading) {
    button.data('original-text', button.text())
    button.text('Saving...').prop('disabled', true).attr('aria-disabled', 'true')
  } else {
    button.text(button.data('original-text')).prop('disabled', false).removeAttr('aria-disabled')
  }
}

// Saving/editing an annotation never navigates — the server re-renders the
// sidebar and we swap the HTML in place, so scroll position is never touched.
// `button` is the specific Save button that triggered this, shown a loading
// state while the request is in flight (it only needs resetting on failure —
// on success it's part of the sidebar HTML that just got replaced).
App.VideoAnnotationPanel.prototype.submitAnnotationForm = function(form, button) {
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

App.VideoAnnotationPanel.prototype.applyAnnotationUpdate = function(data) {
  // Reset any in-progress new-card state before the DOM it refers to is replaced.
  this.hideNewCard()

  this.sidebarInner.html(data.sidebarHtml)
  this.initGovukComponents()
  this.refreshSidebarCache()

  // The user is already looking at what they just saved, so highlight it
  // without scrolling anywhere — scrollIntoView is only for landing on an
  // annotation linked in from elsewhere (see handleUrlHash).
  this.activateCard(data.annotationId, false)

  // Focus moves to the saved card so it never falls back to <body>, which is
  // what happened when this used to be a full page reload — preventScroll
  // stops the browser's default focus-triggered scroll from moving the page.
  var target = this.section.find('.js-annotation-card[data-annotation-id="' + data.annotationId + '"] .js-change-annotation').first()
  if (target.length) target.attr('tabindex', '-1').focus({ preventScroll: true })
}

App.VideoAnnotationPanel.prototype.onSubmitEditNoteForm = function(e) {
  e.preventDefault()
  var form = $(e.currentTarget)
  this.submitAnnotationForm(form, form.find('.govuk-button').first())
}

App.VideoAnnotationPanel.prototype.onDocumentMousedown = function(e) {
  if ($(e.target).closest('.js-annotation-card').length) return
  this.deselectAllCards()
}

// Closes any card left mid-edit so a deselected card never keeps its edit
// form open with no way to see it's still unsaved.
App.VideoAnnotationPanel.prototype.deselectAllCards = function() {
  var self = this
  this.section.find('.js-annotation-card').removeClass('is-selected app-annotation-card--active').each(function() {
    self.hideAnnotationEditForm($(this))
  })
}

// Resets an in-progress edit (note text, checked elements and their reasoning)
// back to the values it was opened with, then hides it.
App.VideoAnnotationPanel.prototype.hideAnnotationEditForm = function(card) {
  var form = card.find('.js-annotation-edit-form')
  if (!form.length || form.prop('hidden')) return

  form.find('textarea').each(function() { this.value = this.defaultValue })
  form.find('input[name="elementsCheckbox"]').each(function() { this.checked = this.defaultChecked })
  form.find('.js-annotation-element-hidden').remove()

  form.prop('hidden', true)
  card.find('.js-annotation-view').prop('hidden', false)
}

App.VideoAnnotationPanel.prototype.onChangeAnnotationClick = function(e) {
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
}

App.VideoAnnotationPanel.prototype.onCancelChangeAnnotationClick = function(e) {
  e.preventDefault()
  this.hideAnnotationEditForm($(e.currentTarget).closest('.js-annotation-card'))
}

// Evidence edits only submit reasoning for elements that are actually checked —
// mirrors onSaveEvidenceClick so an unchecked element's leftover reasoning text
// never gets linked by accident.
App.VideoAnnotationPanel.prototype.onSaveChangeAnnotationClick = function(e) {
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
