'use strict';

import { fromJS } from 'immutable';
import { UserError } from '@keboola/serverless-request-handler';
import Joi from 'joi';

class Validator {
  static validate(eventIn, schema) {
    const event = fromJS(eventIn);
    let body;

    try {
      body = JSON.parse(event.get('body'));
    } catch (e) {
      if (e instanceof SyntaxError) {
        return Promise.reject(UserError.unprocessable('Request body does not contain valid json'));
      }
      return Promise.reject(e);
    }

    return Joi.validate(body, schema, {
      allowUnknown: true,
      stripUnknown: true,
    })
      .catch(error => Promise.reject(UserError.unprocessable(error.message)));
  }
}

export default Validator;
