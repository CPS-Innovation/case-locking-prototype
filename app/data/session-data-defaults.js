module.exports = {
  caseSort: 'Status',
  taskSort: 'Due date',
  directionSort: 'Due date',
  reviewVariant2: false
  // Insert values here

  // Note: app/middleware/reviewInterruptionGuard.js and
  // app/routes/case--interruption.js also read/write
  // reviewInterruptionAcknowledged/reviewInterruptionPending on
  // req.session.data, keyed per case ID. They are deliberately NOT given an
  // object default here: account.js resets session data on sign-in with a
  // shallow `Object.assign({}, sessionDataDefaults)`, which would copy the
  // *same* object reference into every session rather than a fresh one per
  // user, letting one session's acknowledgement leak into another's. Both
  // are instead lazily created as brand new objects on first write.
}
