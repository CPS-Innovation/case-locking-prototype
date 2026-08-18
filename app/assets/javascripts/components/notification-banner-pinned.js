App.NotificationBannerPinned = function (params) {
  this.container = params.container
  this.container.each($.proxy(this, 'setupBanner'))
}

App.NotificationBannerPinned.idCount = 0

App.NotificationBannerPinned.prototype.setupBanner = function (index, el) {
  var banner = $(el)

  if (banner.data('notificationBannerPinnedInitialised')) return

  var header = banner.find('.govuk-notification-banner__header')
  var content = banner.find('.govuk-notification-banner__content')

  if (!header.length || !content.length) return

  banner.data('notificationBannerPinnedInitialised', true)

  if (!content.attr('id')) {
    content.attr('id', 'app-notification-banner-pinned-content-' + (App.NotificationBannerPinned.idCount += 1))
  }

  var toggle = $('<button type="button" class="app-notification-banner-pinned__toggle"></button>')
  toggle.attr('aria-expanded', 'false')
  toggle.attr('aria-controls', content.attr('id'))
  toggle.text('Show details')
  toggle.on('click', $.proxy(this, 'onToggleClick', banner, content, toggle))

  header.append(toggle)
  content.prop('hidden', true)
  banner.addClass('app-notification-banner-pinned--initialised')
}

App.NotificationBannerPinned.prototype.onToggleClick = function (banner, content, toggle) {
  if (toggle.attr('aria-expanded') === 'true') {
    this.collapse(banner, content, toggle)
  } else {
    this.expand(banner, content, toggle)
  }
}

App.NotificationBannerPinned.prototype.expand = function (banner, content, toggle) {
  toggle.attr('aria-expanded', 'true')
  content.prop('hidden', false)
  toggle.text('Hide details')
  banner.addClass('app-notification-banner-pinned--expanded')
}

App.NotificationBannerPinned.prototype.collapse = function (banner, content, toggle) {
  toggle.attr('aria-expanded', 'false')
  content.prop('hidden', true)
  toggle.text('Show details')
  banner.removeClass('app-notification-banner-pinned--expanded')
}
