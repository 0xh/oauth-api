'use strict';

import { RequestHandler, UserError } from '@keboola/serverless-request-handler';
import Bluebird from 'bluebird';
import AWS from 'aws-sdk';
import qs from 'qs';
import R from 'ramda';
import Authorize from '../app/Authorize';
import Session from '../lib/Session';
import Encryption from '../lib/Encryption';
import KbcApi from '../lib/KbcApi';
import DockerRunnerApi from '../lib/DockerRunnerApi';

AWS.config.setPromisesDependency(Bluebird);

function requestToSession(event, encryption) {
  // @todo set returnUrl
  let sessionData = {
    componentId: event.pathParameters.componentId,
  };
  if (event.httpMethod === 'POST') {
    sessionData = R.merge(sessionData, qs.parse(event.body));
    if (R.hasIn('token', sessionData)) {
      return encryption.encrypt(sessionData.token).promise()
        .then(encryptedToken => R.merge(sessionData, { token: encryptedToken }));
    }
  }

  return Promise.resolve(sessionData);
}

module.exports.handler = (event, context, callback) => RequestHandler.handler(() => {
  const dynamoDb = new AWS.DynamoDB.DocumentClient();
  const session = new Session(dynamoDb);
  const encryption = new Encryption(new AWS.KMS());
  const authorize = new Authorize(dynamoDb, encryption, new KbcApi(), new DockerRunnerApi());
  const sessionId = session.init(event);
  let promise;
  let code;

  switch (event.resource) {
    case '/authorize/{componentId}':
      promise = requestToSession(event, encryption)
        .then(sessionDataRes => session.set(sessionId, sessionDataRes))
        .then(() => authorize.init(event))
        .then(oauthRes => ({
          response: {},
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
            'Set-Cookie': `${session.getCookieName()}=${sessionId}`,
            Location: oauthRes.url,
          },
        }));
      code = 301;
      break;
    case '/authorize/{componentId}/callback':
      promise = session.get(sessionId)
        .then(sessionData => authorize.callback(event, sessionData));

      code = 200;
      break;
    default:
      throw UserError.notFound();
  }

  return promise.then(res =>
    RequestHandler.responsePromise(
      Promise.resolve(res.response),
      event,
      context,
      callback,
      code,
      res.headers
    )
  );
}, event, context, callback);
