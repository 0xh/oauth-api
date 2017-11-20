'use strict';

import Consumers from '../app/Consumers';
import {RequestHandler, UserError} from '@keboola/serverless-request-handler';
import Bluebird from 'bluebird';
import AWS from 'aws-sdk';

AWS.config.setPromisesDependency(Bluebird);

module.exports.handler = (event, context, callback) => RequestHandler.handler(() => {
  const dynamoDb = new AWS.DynamoDB.DocumentClient();
  const consumers = new Consumers(dynamoDb);
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
