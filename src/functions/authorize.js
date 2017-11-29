'use strict';

import Authorize from '../app/Authorize';
import Session from "../lib/Session";
import {RequestHandler, UserError} from '@keboola/serverless-request-handler';
import Bluebird from 'bluebird';
import AWS from 'aws-sdk';
import qs from 'qs';
import R from 'ramda';

AWS.config.setPromisesDependency(Bluebird);

function getSessionData(event) {
  let sessionData = {
    'componentId': event.pathParameters.componentId
  };
  if (event.httpMethod === 'POST') {
    sessionData = R.merge(sessionData, qs.parse(event.body));
  }

  return sessionData;
}

module.exports.handler = (event, context, callback) => RequestHandler.handler(() => {
  const dynamoDb = new AWS.DynamoDB.DocumentClient();
  const session = new Session(dynamoDb);
  const authorize = new Authorize(dynamoDb);
  let promise;
  let code;

  switch (event.resource) {
    case '/authorize/{componentId}':
      const sessionId = session.init(event);

      promise = authorize.init(event)
        .then((res) => {
          return session.set(sessionId, getSessionData(event))
            .then(() => {
              return {
                response: {},
                headers: {
                  'Access-Control-Allow-Origin' : '*',
                  'Access-Control-Allow-Credentials' : true,
                  'Set-Cookie': `${session.getCookieName()}=${sessionId}`,
                  Location: res.url,
                }
              };
            });
        });
      code = 301;
      break;
    case '/authorize/{componentId}/callback':
      promise = authorize.callback(event);
      code = 200;
      break;
    default:
      throw UserError.notFound();
  }

  return promise
    .then((res) => {
      return RequestHandler.responsePromise(Promise.resolve(res.response), event, context, callback, code, res.headers);
    });
}, event, context, callback);