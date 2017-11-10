'use strict';

import Consumers from '../app/Consumers';
import RequestHandler from '../lib/RequestHandler';
import Error from '../lib/Error';
// import Logger from '../lib/Logger';

import Bluebird from 'bluebird';
import AWS from 'aws-sdk';

AWS.config.setPromisesDependency(Bluebird);

module.exports.handler = (event, context, callback) => {
  const dynamoDb = new AWS.DynamoDB.DocumentClient();
  const consumers = new Consumers(dynamoDb);
  // const logger = new Logger(event, context);
  const requestHandler = new RequestHandler(callback);
  let promise;
  // let response;
  let code;

  switch (event.httpMethod) {
    case 'get':
      break;
    case 'POST':
      // const consumer = JSON.parse(event.body);
      // promise = dynamoDb.put({
      //   TableName: 'consumers',
      //   Item: consumer,
      // }).promise().then(res => consumer);
      promise = consumers.add(event);
      code = 202;
      break;
    case 'delete':
      break;
    default:
      throw Error.notFound();
  }

  requestHandler.handle(promise, code);
};
