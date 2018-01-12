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

function oauthDataToSession(oauthRes, sessionData, encryption) {
  if (R.has('sessionData', oauthRes)) {
    return encryption.encrypt(JSON.stringify(oauthRes.sessionData))
      .then(encrypted => R.merge(sessionData, { oauthData: encrypted }));
  }

  return Promise.resolve(sessionData);
}

function requestToSession(event, encryption, oauthRes) {
  let sessionData = {
    componentId: event.pathParameters.componentId,
    returnUrl: R.propOr(null, 'Referer', event.headers),
    returnData: event.httpMethod === 'GET',
  };

  if (event.httpMethod === 'POST') {
    sessionData = R.merge(sessionData, qs.parse(event.body));
    if (R.hasIn('token', sessionData)) {
      return encryption.encrypt(sessionData.token)
        .then(encryptedToken => R.merge(sessionData, { token: encryptedToken }));
    }
  }

  return oauthDataToSession(oauthRes, sessionData, encryption);
}

module.exports.handler = (event, context, callback) => RequestHandler.handler(() => {
  const dynamoDb = new AWS.DynamoDB.DocumentClient();
  const session = new Session(dynamoDb);
  const encryption = new Encryption(new AWS.KMS());
  const authorize = new Authorize(dynamoDb, encryption, new KbcApi(), new DockerRunnerApi());
  const sessionId = session.init(event);
  let promise;

  switch (event.resource) {
    case '/authorize/{componentId}':
      promise = authorize.init(event)
        .then(oauthRes => requestToSession(event, encryption, oauthRes)
          .then(sessionDataRes => session.set(sessionId, sessionDataRes))
          .then(() => ({
            response: {},
            code: 302,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Credentials': true,
              'Set-Cookie': session.getCookieHeaderValue(sessionId, '/'),
              Location: oauthRes.url,
            },
          }))
        );
      break;
    case '/authorize/{componentId}/callback':
      promise = session.get(sessionId)
        .then(sessionData => authorize.callback(event, sessionData)
          .then((tokenRes) => {
            if (R.hasIn('returnData', sessionData) && sessionData.returnData === true) {
              return {
                response: tokenRes,
                code: 200,
                headers: {
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Credentials': true,
                  'Content-Type': 'application/json',
                  Connection: 'close',
                },
              };
            }
            return {
              response: {},
              code: 302,
              headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
                Location: sessionData.returnUrl,
              },
            };
          })
        );
      break;
    default:
      throw UserError.notFound();
  }

  return promise
    .then(res => RequestHandler.response(
      null, res.response, event, context, callback, res.code, res.headers)
    )
    .catch(err => RequestHandler.response(err, null, event, context, callback, null));
}, event, context, callback);
