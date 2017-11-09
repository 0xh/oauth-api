'use strict';

import Authorize from '../app/authorize';
import RequestHandler from '../lib/RequestHandler';
import Error from '../lib/Error';
// import Logger from '../lib/Logger';

module.exports.handler = (event, context, callback) => {
  // const authorize = new Authorize(process.env);
  // const logger = new Logger(event, context);
  // const requestHandler = new RequestHandler(logger, callback);
  // let promise;

  let response;

  switch (event.resource) {
    case '/authorize/{componentId}':
      response = RequestHandler.getResponseBody(JSON.stringify({message: 'Authorize ' + event.httpMethod}));
      break;
    case '/authorize/{componentId}/callback':
      response = RequestHandler.getResponseBody(JSON.stringify({message: 'Authorize ' + event.httpMethod}));
      break;
    default:
      throw Error.notFound();
  }

  callback(null, response);
};