'use strict';

import Authorize from '../app/Authorize';
import Session from "../lib/Session";
import Encryption from "../lib/Encryption";
import {RequestHandler, UserError} from '@keboola/serverless-request-handler';
import Bluebird from 'bluebird';
import AWS from 'aws-sdk';
import qs from 'qs';
import R from 'ramda';

AWS.config.setPromisesDependency(Bluebird);

function getAuthSessionData(event, encryption) {
  //@todo set returnUrl
  let sessionData = {
    'componentId': event.pathParameters.componentId
  };
  if (event.httpMethod === 'POST') {
    sessionData = R.merge(sessionData, qs.parse(event.body));
    if (R.hasIn('token', sessionData)) {
      return encryption.encrypt(sessionData['token']).promise()
        .then((res) => {
          return R.merge(sessionData, {token: res.CiphertextBlob});
        });
    }
  }

  return Promise.resolve(sessionData);
}

module.exports.handler = (event, context, callback) => RequestHandler.handler(() => {
  const dynamoDb = new AWS.DynamoDB.DocumentClient();
  const session = new Session(dynamoDb);
  const authorize = new Authorize(dynamoDb);
  const encryption = new Encryption(new AWS.KMS());
  let promise;
  let code;

  switch (event.resource) {
    case '/authorize/{componentId}':
      const sessionId = session.init(event);
      promise = authorize.init(event)
        .then((oauthRes) => {
          return getAuthSessionData(event, encryption)
            .then((sessionDataRes) => {
              return session.set(sessionId, sessionDataRes)
                .then(() => {
                  return {
                    response: {},
                    headers: {
                      'Access-Control-Allow-Origin' : '*',
                      'Access-Control-Allow-Credentials' : true,
                      'Set-Cookie': `${session.getCookieName()}=${sessionId}`,
                      Location: oauthRes.url,
                    }
                  };
                });
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