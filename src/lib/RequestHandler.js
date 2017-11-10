'use strict';

class RequestHandler {

  constructor(callback) {
    // this.logger = logger;
    this.callback = callback;
  }

  handle(promise, code = 200) {
    return promise
      .then(res => {
        this.callback(null, RequestHandler.getResponseBody(res, code));
      })
      .catch(err => {
        console.log(err);
        this.callback(null, RequestHandler.getResponseBody({
          message: 'Unable to handle request',
          err: err
        }, 500));
      });
  }

  static getResponseBody(res, code = 200) {
    return {
      statusCode: code,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(res),
    };
  }
}

export default RequestHandler;