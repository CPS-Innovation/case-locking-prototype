const _ = require('lodash');

class Validator {
  constructor(req, res) {
    this.req = req;
    this.res = res;
    this.validators = [];
    this.errors = [];
    this.highlights = {};
  }

  add(params) {
    this.validators.push(params);
  }

  getErrors() {
    return this.errors;
  }

  getFormattedErrors() {
    return this.errors.map(this.formatError);
  }

  getInlineErrors() {
    const inlineErrors = {};
    this.errors.forEach(error => {
      const { name, message } = error;
      _.set(inlineErrors, name, { text: message });
    });
    return inlineErrors;
  }

  getErrorSummary() {
    return { items: this.getFormattedErrors() };
  }

  getErrorHighlights() {
    return this.highlights;
  }

  formatError(error) {
    return {
      text: error.message,
      href: `#${error.name}`
    };
  }

  validate() {
    this.generateErrors();
    this.generateHighlights();
    return this.errors.length === 0;
  }

  generateErrors() {
    this.errors = [];

    for (let validator of this.validators) {
      const { name, rules } = validator;
      const value = _.get(this.req.body, name);

      for (let rule of rules) {
        const { fn, params, message } = rule;
        const validatorReturnValue = fn(value, params);

        // If the rule returns a false boolean, the name is the name of the field
        if (typeof validatorReturnValue === 'boolean' && !validatorReturnValue) {
          this.errors.push({ name, message });
          break;
        // If the rule returns a string, the name is that string
        } else if (typeof validatorReturnValue === 'string') {
          this.errors.push({ name: validatorReturnValue, message });
          break;
        }
      }
    }
  }

  generateHighlights() {
    this.highlights = {};

    for (let validator of this.validators) {
      const { name, rules } = validator;
      const value = _.get(this.req.body, name);

      for (let rule of rules) {
        const { fn, params } = rule;
        const validatorReturnValue = fn(value, params);

        // If the rule returns a false boolean, the name is the name of the field
        if (typeof validatorReturnValue === 'boolean' && !validatorReturnValue) {
          _.set(this.highlights, name, {});

        // If the rule returns a string, the name is that string
        } else if (typeof validatorReturnValue === 'string') {
          _.set(this.highlights, validatorReturnValue, {});
        }
      }
    }
  }
}

module.exports = Validator;
