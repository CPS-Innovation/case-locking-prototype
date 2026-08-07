const _ = require('lodash')
const prisma = require('../lib/prisma')
const Pagination = require('../helpers/pagination')
const hearingTypes = require('../data/hearing-types')

function resetFilters(req) {
  _.set(req, 'session.data.hearingListFilters.types', null)
  _.set(req, 'session.data.hearingListFilters.hearingStatuses', null)
}

module.exports = (router) => {
  router.get('/hearings', async (req, res) => {
    const currentUser = req.session.data.user
    const userUnitIds = currentUser?.units?.map((uu) => uu.unitId) || []

    if (!req.session.data.hearingListFilters) {
      req.session.data.hearingListFilters = {}
    }

    let selectedTypeFilters = _.get(req.session.data.hearingListFilters, 'types', [])
    let selectedHearingStatusFilters = _.get(req.session.data.hearingListFilters, 'hearingStatuses', [])

    let selectedFilters = { categories: [] }

    if (selectedTypeFilters?.length) {
      selectedFilters.categories.push({
        heading: { text: 'Hearing type' },
        items: selectedTypeFilters.map((value) => ({
          text: value,
          href: '/hearings/remove-type/' + encodeURIComponent(value),
        })),
      })
    }

    if (selectedHearingStatusFilters?.length) {
      selectedFilters.categories.push({
        heading: { text: 'Hearing status' },
        items: selectedHearingStatusFilters.map((value) => ({
          text: value,
          href: '/hearings/remove-hearing-status/' + encodeURIComponent(value),
        })),
      })
    }

    let where = { AND: [] }

    if (userUnitIds.length) {
      where.AND.push({ case: { unitId: { in: userUnitIds } } })
    }

    if (selectedTypeFilters?.length) {
      where.AND.push({ type: { in: selectedTypeFilters } })
    }

    if (selectedHearingStatusFilters?.length) {
      where.AND.push({ status: { in: selectedHearingStatusFilters } })
    }

    if (where.AND.length === 0) {
      where = {}
    }

    let hearings = await prisma.hearing.findMany({
      where,
      include: {
        case: {
          include: {
            defendants: true,
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    })

    let keywords = _.get(req.session.data.hearingSearch, 'keywords')
    if (keywords) {
      keywords = keywords.toLowerCase()
      hearings = hearings.filter((h) => {
        const reference = h.case.reference.toLowerCase()
        const defendants = h.case.defendants
        const defendantName = defendants.length
          ? (defendants[0].firstName + ' ' + defendants[0].lastName).toLowerCase()
          : ''
        const operationName = (h.case.operationName || '').toLowerCase()
        return (
          reference.includes(keywords) ||
          defendantName.includes(keywords) ||
          operationName.includes(keywords)
        )
      })
    }

    const typeItems = hearingTypes.map((type) => ({ text: type, value: type }))

    const hearingStatusItems = [
      'Hearing preparation needed',
      'Hearing pending',
      'Hearing outcome needed',
      'Hearing complete',
    ].map((s) => ({ value: s, text: s }))

    const totalHearings = hearings.length
    const pageSize = 25
    const pagination = new Pagination(hearings, req.query.page, pageSize)
    hearings = pagination.getData()

    res.render('hearings/index', {
      totalHearings,
      hearings,
      typeItems,
      selectedTypeFilters,
      hearingStatusItems,
      selectedHearingStatusFilters,
      selectedFilters,
      pagination,
    })
  })

  router.get('/hearings/remove-type/:type', (req, res) => {
    const current = _.get(req, 'session.data.hearingListFilters.types', [])
    _.set(req, 'session.data.hearingListFilters.types', _.pull(current, decodeURIComponent(req.params.type)))
    res.redirect('/hearings')
  })

  router.get('/hearings/remove-hearing-status/:value', (req, res) => {
    const current = _.get(req, 'session.data.hearingListFilters.hearingStatuses', [])
    _.set(req, 'session.data.hearingListFilters.hearingStatuses', _.pull(current, decodeURIComponent(req.params.value)))
    res.redirect('/hearings')
  })

  router.get('/hearings/clear-filters', (req, res) => {
    resetFilters(req)
    res.redirect('/hearings')
  })

  router.get('/hearings/clear-search', (req, res) => {
    _.set(req, 'session.data.hearingSearch.keywords', '')
    res.redirect('/hearings')
  })
}
