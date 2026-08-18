const _ = require('lodash')

const rules = {
  notEmpty: (value) => {
    let valid = true
    if(!value || value.trim().length == 0) {
      valid = false
    }
    return valid
  },
  radioSelected: (value) => {
    let valid = true
    if(typeof value == 'undefined') {
      valid = false;
    }
    return valid
  },
  checkboxSelected: (value) => {
    let valid = true
    if(value == '_unchecked') {
      valid = false
    }
    return valid
  },
  notEmptyDate: (value, params) => {
    let valid = true
    if(params.day == '' && params.month == '' && params.year == '') {
      valid = false
    }
    return valid
  },
  notEmptyDay: (value, params) => {
    let valid = true
    if(!params.day || params.day.trim().length == 0) {
      valid = params.fieldName
    }
    return valid
  },
  notEmptyMonth: (value, params) => {
    let valid = true
    if(!params.month || params.month.trim().length == 0) {
      valid = params.fieldName
    }
    return valid
  },
  notEmptyYear: (value, params) => {
    let valid = true
    if(!params.year || params.year.trim().length == 0) {
      valid = params.fieldName
    }
    return valid
  }
}

module.exports = rules
