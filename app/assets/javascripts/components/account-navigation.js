App.AccountNavigation = function (module) {
  this.$module = module
  this.$menuButton = this.$module.querySelector('.govuk-js-header-toggle')
  this.$menu = this.$menuButton && this.$module.querySelector('#' + this.$menuButton.getAttribute('aria-controls'))
  this.menuIsOpen = false
  this.mql = null

  if (!this.$module || !this.$menuButton || !this.$menu) {
    return
  }

  this.$module.classList.add('app-header--with-js-navigation')

  if ('matchMedia' in window) {
    this.mql = window.matchMedia('(min-width: 48.0625em)')

    if ('addEventListener' in this.mql) {
      this.mql.addEventListener('change', this.syncState.bind(this))
    } else {
      this.mql.addListener(this.syncState.bind(this))
    }

    this.syncState()
    this.$menuButton.addEventListener('click', this.handleMenuButtonClick.bind(this))
  } else {
    this.$menuButton.setAttribute('hidden', '')
  }
}

App.AccountNavigation.prototype.syncState = function () {
  if (this.mql.matches) {
    this.$menu.removeAttribute('hidden')
    this.$menuButton.setAttribute('hidden', '')
  } else {
    this.$menuButton.removeAttribute('hidden')
    this.$menuButton.setAttribute('aria-expanded', this.menuIsOpen.toString())

    if (this.menuIsOpen) {
      this.$menu.removeAttribute('hidden')
    } else {
      this.$menu.setAttribute('hidden', '')
    }
  }
}

App.AccountNavigation.prototype.handleMenuButtonClick = function () {
  this.menuIsOpen = !this.menuIsOpen
  this.syncState()
}
