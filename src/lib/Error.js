/**
 * Author: miro@keboola.com
 * Date: 07/11/2017
 */
'use strict';

const UserError = require('./UserError');

class Error {
  static badRequest(msg = 'Bad Request') {
    const err = new UserError(msg);
    err.code = 400;
    err.type = 'BadRequest';
    return err;
  }

  static unauthorized(msg = 'Unauthorized') {
    const err = new UserError(msg);
    err.code = 401;
    err.type = 'Unauthorized';
    return err;
  }

  static notFound(msg = 'Not Found') {
    const err = new UserError(msg);
    err.code = 404;
    return err;
  }

  static unprocessable(msg = 'Unprocessable') {
    const err = new UserError(msg);
    err.code = 422;
    return err;
  }

  static error(msg = 'Error', code = 400) {
    const err = new UserError(msg);
    err.code = code;
    return err;
  }
}

export default Error;