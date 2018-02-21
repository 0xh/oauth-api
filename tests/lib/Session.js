'use strict';

import expect from 'unexpected';
import R from 'ramda';
import { UserError } from '@keboola/serverless-request-handler/src/index';
import DynamoDB from '../../src/lib/DynamoDB';
import Session from '../../src/lib/Session';

const dynamoDb = DynamoDB.getClient({
  region: 'eu-central-1',
  endpoint: 'http://dynamodb:8000'
});

const eventInit = {
  headers: {
    'Content-Type': 'application/json',
    Host: '0.0.0.0:3000',
  },
  path: '/authorize/keboola.ex-google-drive',
  pathParameters: { componentId: 'keboola.ex-google-analytics' },
  resource: '/authorize/{componentId}',
  httpMethod: 'POST',
  queryStringParameters: null,
  body: null,
};

const getSessionData = event => ({
  componentId: event.pathParameters.componentId,
  returnUrl: R.propOr(null, 'Referer', event.headers),
  returnData: event.httpMethod === 'GET',
});

describe('Session', () => {
  const session = new Session(dynamoDb);

  it('get cookie header', () => {
    const sid = session.init(eventInit);
    const cookieHeader = session.getCookieHeaderValue(sid);
    expect(cookieHeader, 'to be', `oauthSessionId=${sid}`);
  });

  it('init - new', () => {
    const sid = session.init(eventInit);
    expect(sid, 'to be non-empty');
  });

  it('init - existing', () => {
    const sid = session.init(eventInit);
    const nextEvent = R.set(R.lensPath(['headers', 'cookie']), `oauthSessionId=${sid}`, eventInit);
    const sid2 = session.init(nextEvent);
    expect(sid, 'to be', sid2);
  });

  it('set/get - ok', () => {
    const sid = session.init(eventInit);
    const sessionData = getSessionData(eventInit);
    return session.set(sid, sessionData)
      .then(() => session.get(sid))
      .then(res => expect(res, 'to have properties', sessionData));
  });

  it('set/get - expired', () => {
    // session will expire in 1 second
    const expiredSession = new Session(dynamoDb, { ttl: 1000 });
    const sid = expiredSession.init(eventInit);
    const sessionData = getSessionData(eventInit);
    return expiredSession.set(sid, sessionData)
      .then(() => new Promise(res => setTimeout(res, 3000)))
      .then(() => expect(
        expiredSession.get(sid),
        'to be rejected with error satisfying',
        UserError.unauthorized('Session is expired')
      ));
  });
});
