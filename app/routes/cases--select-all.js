module.exports = (router) => {
  router.get('/cases/select-all', (req, res) => {
    const page = parseInt(req.query.page) || 1
    const pageSize = 25
    const allIds = req.session.data.caseListAllIds || []
    const totalCases = allIds.length
    const pageCount = Math.min(pageSize, totalCases - (page - 1) * pageSize)

    if (totalCases <= pageSize) {
      req.session.data.applyAction = { cases: allIds }
      return res.redirect('/cases?page=' + page)
    }

    res.render('cases/select-all/index', { totalCases, pageCount, page })
  })

  router.get('/cases/deselect-all', (req, res) => {
    req.session.data.applyAction = {}
    res.redirect('/cases?page=' + (req.query.page || 1))
  })

  router.post('/cases/select-all', (req, res) => {
    const { selection, page } = req.body

    if (selection === 'all') {
      req.session.data.applyAction = { cases: req.session.data.caseListAllIds || [] }
    } else {
      req.session.data.applyAction = { cases: req.session.data.caseListPageIds || [] }
    }

    res.redirect('/cases?page=' + (page || 1))
  })
}
