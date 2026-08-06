App.Accordion = function (params) {
  this.container = params.container
  this.sections = this.container.find('.js-accordion-section')
  this.toggleAllButton = params.toggleAllButton || $()
  this.sections.each($.proxy(this, 'setupSection'))
  this.toggleAllButton.on('click', $.proxy(this, 'onToggleAllClick'))
  this.openSectionForHash()
  this.updateToggleAllButton()
}

App.Accordion.prototype.setupSection = function (index, el) {
  var section = $(el)
  section.data('accordionToggle', section.find('.js-accordion-toggle'))
  section.data('accordionContent', section.find('.js-accordion-content'))
  section.data('accordionToggle').on('click', $.proxy(this, 'onToggleClick'))
}

App.Accordion.prototype.onToggleClick = function (e) {
  e.preventDefault()
  var section = $(e.currentTarget).closest('.js-accordion-section')
  if (section.data('accordionToggle').attr('aria-expanded') === 'true') {
    this.collapseSection(section)
  } else {
    this.expandSection(section)
  }
  this.updateToggleAllButton()
}

App.Accordion.prototype.onToggleAllClick = function (e) {
  e.preventDefault()
  var self = this
  var expand = !this.allSectionsExpanded()
  this.sections.each(function (index, el) {
    var section = $(el)
    if (expand) {
      self.expandSection(section, true)
    } else {
      self.collapseSection(section, true)
    }
  })
  this.updateToggleAllButton()
}

App.Accordion.prototype.expandSection = function (section, skipHashUpdate) {
  section.data('accordionToggle').attr('aria-expanded', 'true')
  section.data('accordionContent').prop('hidden', false)
  if (!skipHashUpdate) history.replaceState(null, '', '#' + section[0].id)
}

App.Accordion.prototype.collapseSection = function (section, skipHashUpdate) {
  section.data('accordionToggle').attr('aria-expanded', 'false')
  section.data('accordionContent').prop('hidden', true)
  if (!skipHashUpdate && window.location.hash === '#' + section[0].id) {
    history.replaceState(null, '', window.location.pathname + window.location.search)
  }
}

App.Accordion.prototype.allSectionsExpanded = function () {
  return (
    this.sections.filter(function (index, el) {
      return $(el).data('accordionToggle').attr('aria-expanded') !== 'true'
    }).length === 0
  )
}

// Mirrors the common "Show all sections" convention: the button only reads
// "Hide all material" once every section is open, so it always says what
// clicking it will do next.
App.Accordion.prototype.updateToggleAllButton = function () {
  if (!this.toggleAllButton.length) return
  var allExpanded = this.allSectionsExpanded()
  this.toggleAllButton.attr('aria-expanded', allExpanded ? 'true' : 'false')
  this.toggleAllButton
    .find('.js-accordion-toggle-all-label')
    .text(allExpanded ? 'Close all' : 'Open all')
}

App.Accordion.prototype.openSectionForHash = function () {
  var hash = window.location.hash
  if (!hash) return
  var section = this.sections.filter('#' + $.escapeSelector(hash.slice(1)))
  if (!section.length) return
  this.expandSection(section)
  section[0].scrollIntoView()
}
