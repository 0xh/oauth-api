'use strict';

import { RequestHandler, UserError } from '@keboola/serverless-request-handler';
import Consumers from '../app/Consumers';
import DynamoDB from '../lib/DynamoDB';
import KbcApi from '../lib/KbcApi';

module.exports.handler = (event, context, callback) => RequestHandler.handler(() => {
  const dynamoDb = DynamoDB.getClient();
  const consumers = new Consumers(dynamoDb, new KbcApi());
  let promise;
  let code;

  switch (event.httpMethod) {
    case 'GET':
      if (event.resource === '/manage/{componentId}') {
        promise = consumers.get(event);
      } else {
        promise = consumers.list();
      }
      code = 200;

      break;
    case 'POST':
      promise = consumers.add(event);
      code = 202;
      break;
    case 'DELETE':
      break;
    default:
      throw UserError.notFound();
  }

  return RequestHandler.responsePromise(promise, event, context, callback, code);
}, event, context, callback);
