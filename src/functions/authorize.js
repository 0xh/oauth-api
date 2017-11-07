'use strict';

import Authorize from '../app/authorize';
import RequestHandler from '../lib/RequestHandler';
import Error from '../lib/Error';

require('source-map-support').install();

module.exports.handler = (event, context, callback) => {
  const authorize = new Authorize(process.env);
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
  return RequestHandler.responsePromise(promise, event, context, callback, 200);
};