'use strict';

const UserError = require('./UserError');

class RequestHandler {

  constructor(logger, callback) {
    this.logger = logger;
    this.callback = callback;
  }

  handle(promise) {
    return promise
      .then(res => {
        this.logger.log(res);
        this.callback(null, this.getResponseBody(res));
      })
      .catch(err => {
        this.logger.log(res, err);
      });
  }

  static getResponseBody(res) {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: res,
    };
  }
}

export default RequestHandler;