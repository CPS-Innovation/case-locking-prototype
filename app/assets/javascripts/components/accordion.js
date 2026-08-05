App.Accordion = function(params) {
  this.container = params.container
  this.sections = this.container.find('.js-accordion-section')
  this.sections.each($.proxy(this, 'setupSection'))
  this.openSectionForHash()
}

App.Accordion.prototype.setupSection = function(index, el) {
  var section = $(el)
  section.data('accordionToggle', section.find('.js-accordion-toggle'))
  section.data('accordionContent', section.find('.js-accordion-content'))
  section.data('accordionToggle').on('click', $.proxy(this, 'onToggleClick'))
}

App.Accordion.prototype.onToggleClick = function(e) {
  e.preventDefault()
  var section = $(e.currentTarget).closest('.js-accordion-section')
  if (section.data('accordionToggle').attr('aria-expanded') === 'true') {
    this.collapseSection(section)
  } else {
    this.expandSection(section)
  }
}

App.Accordion.prototype.expandSection = function(section) {
  section.data('accordionToggle').attr('aria-expanded', 'true')
  section.data('accordionContent').prop('hidden', false)
  history.replaceState(null, '', '#' + section[0].id)
}

App.Accordion.prototype.collapseSection = function(section) {
  section.data('accordionToggle').attr('aria-expanded', 'false')
  section.data('accordionContent').prop('hidden', true)
  if (window.location.hash === '#' + section[0].id) {
    history.replaceState(null, '', window.location.pathname + window.location.search)
  }
}

App.Accordion.prototype.openSectionForHash = function() {
  var hash = window.location.hash
  if (!hash) return
  var section = this.sections.filter('#' + $.escapeSelector(hash.slice(1)))
  if (!section.length) return
  this.expandSection(section)
  section[0].scrollIntoView()
}
