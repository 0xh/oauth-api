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
        throw UserError.unprocessable('Request body does not contain valid json');
      }
      throw e;
    }

    const res = Joi.validate(
      body,
      schema,
      {
        allowUnknown: true,
        stripUnknown: true,
      }
    );

    if (res.error) {
      throw UserError.unprocessable(res.error.message);
    }

    return res.value;
  }
}

export default Validator;
