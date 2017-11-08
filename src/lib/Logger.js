'use strict';

const _ = require('lodash');

class Logger {

  constructor(event, context) {
    this.event = event;
    this.context = context;
  }

  log(res = null, err = null) {
    console.log(JSON.stringify(this.formatLog(res, err)));
  }

  formatLog(res = null, err = null) {
    const response = _.clone(res);
    const log = {
      event: {
        requestId: this.context.awsRequestId,
        function: this.context.functionName,
        path: this.event.path,
        httpMethod: this.event.httpMethod,
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
}

export default Logger;