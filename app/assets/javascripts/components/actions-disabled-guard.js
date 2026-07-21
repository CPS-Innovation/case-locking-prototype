// Neutralises links and buttons within any ".app-actions-disabled" zone —
// used when the document viewer is reached from the materials list rather
// than a review, so the page still looks fully interactive but nothing it
// contains can actually change data or navigate away. Runs in the capture
// phase so it intercepts the click before any other handler (e.g.
// AnnotationPanel) sees it.
App.ActionsDisabledGuard = function() {
  document.addEventListener('click', this.onClick, true)
}

App.ActionsDisabledGuard.prototype.onClick = function(e) {
  var zone = e.target.closest('.app-actions-disabled')
  if (!zone) return
  var actionEl = e.target.closest('a[href], button, input[type="submit"]')
  if (!actionEl) return
  e.preventDefault()
  e.stopPropagation()
}
