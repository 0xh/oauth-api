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
        promise = consumers.list(event);
      }
      code = 200;
      break;
    case 'POST':
      promise = consumers.add(event);
      code = 202;
      break;
    case 'PATCH':
      promise = consumers.patch(event);
      code = 200;
      break;
    case 'DELETE':
      promise = consumers.delete(event);
      code = 204;
      break;
    default:
      throw UserError.notFound();
  }

  return RequestHandler.responsePromise(promise, event, context, callback, code, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      'Access-Control-Allow-Headers': 'X-StorageApi-Token, X-KBC-ManageApiToken'
    });
}, event, context, callback);
