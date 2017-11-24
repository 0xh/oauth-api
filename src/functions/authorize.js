'use strict';

import Authorize from '../app/Authorize';
import Session from "../lib/Session";
import {RequestHandler, UserError} from '@keboola/serverless-request-handler';
import Bluebird from 'bluebird';
import AWS from 'aws-sdk';

AWS.config.setPromisesDependency(Bluebird);

module.exports.handler = (event, context, callback) => RequestHandler.handler(() => {
  const dynamoDb = new AWS.DynamoDB.DocumentClient();
  const session = new Session(dynamoDb);
  const authorize = new Authorize(dynamoDb, session);
  let promise;
  let code;

  switch (event.resource) {
    case '/authorize/{componentId}':
      promise = authorize.init(event);
      code = 200;
      break;
    case '/authorize/{componentId}/callback':
      promise = authorize.callback(event);
      code = 200;
      break;
    default:
      throw UserError.notFound();
  }

  return RequestHandler.responsePromise(promise, event, context, callback, code);
}, event, context, callback);