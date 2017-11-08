'use strict';

import Authorize from '../app/authorize';
import RequestHandler from '../lib/RequestHandler';
import Error from '../lib/Error';
import Logger from '../lib/Logger';

module.exports.handler = (event, context, callback) => {
  const authorize = new Authorize(process.env);
  const logger = new Logger(event, context);
  const requestHandler = new RequestHandler(logger, callback);
  let promise;

  switch (event.resource) {
    case '/authorize/{componentId}':
      promise = authorize.init(event);
      break;
    case '/authorize/{componentId}/callback':
      promise = authorize.callback(event);
      break;
    default:
      throw Error.notFound();
  }

  return requestHandler.handle(promise);
};