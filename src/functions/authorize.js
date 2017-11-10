'use strict';

import Authorize from '../app/Authorize';
import RequestHandler from '../lib/RequestHandler';
import Error from '../lib/Error';
// import Logger from '../lib/Logger';

import Bluebird from 'bluebird';
import AWS from 'aws-sdk';

AWS.config.setPromisesDependency(Bluebird);

module.exports.handler = (event, context, callback) => {
  const dynamoDb = new AWS.DynamoDB.DocumentClient();
  const authorize = new Authorize(dynamoDb);
  // const logger = new Logger(event, context);
  // const requestHandler = new RequestHandler(logger, callback);
  // let promise;

  let response;

  switch (event.resource) {
    case '/authorize/{componentId}':
      response = RequestHandler.getResponseBody(authorize.init(event));
      break;
    case '/authorize/{componentId}/callback':
      response = RequestHandler.getResponseBody({message: 'Authorize ' + event.httpMethod});
      break;
    default:
      throw Error.notFound();
  }

  callback(null, response);
};