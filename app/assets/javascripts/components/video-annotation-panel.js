App.VideoAnnotationPanel = function(params) {
  this.container = params.container

  // Audio reviews share this panel - <audio> and <video> expose the same
  // pause/currentTime API, so timestamp annotation works identically.
  this.video              = $('#document-video, #document-audio')
  this.typeBtns           = $('.js-video-annotate-btn, .js-audio-annotate-btn')
  this.newAnnotationCards = $('.js-new-annotation-card')
  this.activeAnnotationCard = null
  this.sidebarInner         = $('.js-sidebar-inner')
  this.sidebarEmpty         = $('.js-sidebar-empty')
  this.annotationForm       = $('#annotation-form')
  this.typeHiddenInput      = $('#annotation-type-hidden')
  this.noteHiddenInput      = $('#annotation-note-hidden')
  this.timestampHiddenInput = $('#annotation-timestamp-hidden')
  this.saveBtn              = $('.js-save-annotation')
  this.cancelBtn            = $('.js-cancel-annotation')

  this.caseId     = this.container.data('case-id')
  this.documentId = this.container.data('document-id')

  this.pendingAnnotationType = null
  this.pendingTimestamp      = null

  this.setupEvents()
}

App.VideoAnnotationPanel.prototype.setupEvents = function() {
  this.typeBtns.on('click', $.proxy(this, 'onTypeBtnClick'))
  this.saveBtn.on('click', $.proxy(this, 'onSaveClick'))
  this.cancelBtn.on('click', $.proxy(this, 'onCancelClick'))
  this.sidebarInner.on('click', '.js-annotation-card', $.proxy(this, 'onCardClick'))
  this.sidebarInner.on('click', '.js-change-annotation', $.proxy(this, 'onChangeAnnotationClick'))
  this.sidebarInner.on('click', '.js-cancel-change-annotation', $.proxy(this, 'onCancelChangeAnnotationClick'))
  this.sidebarInner.on('click', '.js-save-change-annotation', $.proxy(this, 'onSaveChangeAnnotationClick'))
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

App.VideoAnnotationPanel.prototype.onSaveClick = function() {
  if (!this.pendingAnnotationType) return
  if (this.activeAnnotationCard.find('input[name="elementsCheckbox"]').length) {
    this.onSaveEvidenceClick()
    return
  }
  var noteInput = this.activeAnnotationCard.find('.js-annotation-note-input')
  var note = noteInput.val().trim()
  if (!note) { noteInput.focus(); return }
  this.typeHiddenInput.val(this.pendingAnnotationType)
  this.noteHiddenInput.val(note)
  this.timestampHiddenInput.val(this.pendingTimestamp)
  this.annotationForm[0].submit()
}

// Evidence and disclosure annotations link one or more elements, each with
// its own reasoning (revealed under its checkbox), rather than a single
// shared note.
App.VideoAnnotationPanel.prototype.onSaveEvidenceClick = function() {
  var self = this
  var checked = this.activeAnnotationCard.find('input[name="elementsCheckbox"]:checked')

  if (!checked.length) {
    this.activeAnnotationCard.find('input[name="elementsCheckbox"]').first().focus()
    return
  }

  var fields = []
  var firstInvalid = null

  checked.each(function() {
    var elementId = $(this).val()
    // Reason capture disabled — restore to re-enable:
    // var textarea = self.activeAnnotationCard.find('.js-annotation-element-reasoning[data-element-id="' + elementId + '"]')
    // var reasoning = textarea.val().trim()
    // if (!reasoning) {
    //   if (!firstInvalid) firstInvalid = textarea
    //   return
    // }
    fields.push({ elementId: elementId, reasoning: '' })
  })

  if (firstInvalid) { firstInvalid.focus(); return }

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
  this.annotationForm[0].submit()
}

App.VideoAnnotationPanel.prototype.onCancelClick = function(e) {
  e.preventDefault()
  this.hideNewCard()
  if (!$('.js-annotation-card').length) {
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

App.VideoAnnotationPanel.prototype.onDocumentMousedown = function(e) {
  if ($(e.target).closest('.js-annotation-card').length) return
  this.deselectAllCards()
}

// Closes any card left mid-edit so a deselected card never keeps its edit
// form open with no way to see it's still unsaved.
App.VideoAnnotationPanel.prototype.deselectAllCards = function() {
  var self = this
  $('.js-annotation-card').removeClass('is-selected app-annotation-card--active').each(function() {
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
  var firstInvalid = null

  checked.each(function() {
    var elementId = $(this).val()
    // Reason capture disabled — restore to re-enable:
    // var textarea = form.find('.js-annotation-element-reasoning[data-element-id="' + elementId + '"]')
    // var reasoning = textarea.val().trim()
    // if (!reasoning) {
    //   if (!firstInvalid) firstInvalid = textarea
    //   return
    // }
    fields.push({ elementId: elementId, reasoning: '' })
  })

  if (firstInvalid) { firstInvalid.focus(); return }

  form.find('.js-annotation-element-hidden').remove()
  fields.forEach(function(field) {
    $('<input>', {
      type: 'hidden',
      class: 'js-annotation-element-hidden',
      name: 'elements[' + field.elementId + ']',
      value: field.reasoning
    }).appendTo(form)
  })

  form[0].submit()
}
