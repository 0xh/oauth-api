'use strict';

const _ = require('lodash');
const UserError = require('./UserError');

class RequestHandler {
  static formatAppError(context) {
    return {
      errorMessage: 'Application error',
      errorType: 'ApplicationError',
      requestId: context.awsRequestId,
    };
  }

  static formatLog(context, err, event = null, res = null) {
    const response = _.clone(res);
    const log = {
      event: {
        requestId: context.awsRequestId,
        function: context.functionName,
        path: event.path,
        httpMethod: event.httpMethod,
      },
      error: null,
      response: {
        statusCode: (response && 'statusCode' in response) ? response.statusCode : null,
      },
    };
    if (err) {
      log.error = {
        name: err.name,
        message: err.message,
      };
      if ('stack' in err) {
        log.error.stack = err.stack.split('\n');
      }
      if ('fileName' in err) {
        log.error.fileName = err.fileName;
      }
      if ('lineNumber' in err) {
        log.error.lineNumber = err.lineNumber;
      }
    }
    return log;
  }

  static getResponseBody(err, res, event, context, code = 200) {
    const response = {
      statusCode: code,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: null,
    };
    if (err) {
      if (err instanceof UserError) {
        response.statusCode = _.isNumber(err.code) ? err.code : 400;
        response.body = {// JSON.stringify({
          errorMessage: err.message,
          errorType: err.type,
          requestId: context.awsRequestId,
        };// });
      } else {
        response.statusCode = 500;
        response.body = RequestHandler.formatAppError(context);
      }
    } else {
      response.body = res;
    }

    return response;
  }

  static response(err, res, event, context, cb, code = 200) {
    const response = RequestHandler.getResponseBody(err, res, event, context, code);

    console.log(JSON.stringify(RequestHandler.formatLog(context, err, event, response)));

    response.body = response.body ? JSON.stringify(response.body) : '';
    cb(null, response);
  }

  static responsePromise(promise, event, context, callback, code = 200) {
    return promise
    .then(res =>
      RequestHandler.response(null, res, event, context, callback, code)
    )
    .catch(err =>
      RequestHandler.response(err, null, event, context, callback)
    );
  }
}

export default RequestHandler;