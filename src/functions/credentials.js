'use strict';

import { RequestHandler, UserError } from '@keboola/serverless-request-handler';
import Consumers from '../app/Consumers';
import Credentials from '../app/Credentials';
import DynamoDB from '../lib/DynamoDB';
import KbcApi from '../lib/KbcApi';

module.exports.handler = (event, context, callback) => RequestHandler.handler(() => {
  const dynamoDb = DynamoDB.getClient();
  const kbcApi = new KbcApi();
  const consumers = new Consumers(dynamoDb, kbcApi);
  const credentials = new Credentials(dynamoDb, kbcApi);
  let promise;
  let code;

  switch (event.httpMethod) {
    case 'GET':
      if (event.resource === '/credentials/{componentId}') {
        promise = credentials.get(event);
      } else {
        promise = credentials.list(event);
      }
      code = 200;

      break;
    case 'POST':
      promise = credentials.add(event);
      code = 202;
      break;
    case 'DELETE':
      break;
    default:
      throw UserError.notFound();
  }

  return RequestHandler.responsePromise(promise, event, context, callback, code);
}, event, context, callback);