'use strict';

import expect from 'unexpected';
import DynamoDB from '../../src/lib/DynamoDB';
import Session from '../../src/lib/Session';
import R from "ramda";

const dynamoDb = DynamoDB.getClient();

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

const eventCallback = {
  headers: {
    'Content-Type': 'application/json',
    Host: 'google.com',
  },
  path: '/authorize/keboola.ex-google-drive/callback',
  pathParameters: { componentId: 'keboola.ex-google-analytics' },
  resource: '/authorize/{componentId}/callback',
  httpMethod: 'GET',
  queryStringParameters: { code: '1234' },
  body: null,
};

const getSessionData = (event) => ({
  componentId: event.pathParameters.componentId,
  returnUrl: R.propOr(null, 'Referer', event.headers),
  returnData: event.httpMethod === 'GET',
});


describe('Session', () => {
  const session = new Session(dynamoDb);

  it('Get Cookie Header', () => {
    const sid = session.init(eventInit);
    const cookieHeader = session.getCookieHeaderValue(sid);
    expect(cookieHeader, 'to be', 'oauthSessionId=' + sid);
  });

  it('Init - new', () => {
    const sid = session.init(eventInit);
    expect(sid, 'to be non-empty');
  });

  it('Init - existing', () => {
    const sid = session.init(eventInit);
    const nextEvent = R.set(R.lensPath(['headers', 'cookie']), 'oauthSessionId=' + sid, eventInit);
    const sid2 = session.init(nextEvent);
    expect(sid, 'to be', sid2);
  });

  it('Set/Get - ok', () => {
    const sid = session.init(eventInit);
    const sessionData = getSessionData(eventInit);
    return session.set(sid, sessionData)
      .then(() => session.get(sid))
      .then((res) => expect(res, 'to have properties', sessionData));
  });

  // it('Get - expired', () => {
  //   const sid = session.init(eventInit);
  //   const nextEvent = R.set(R.lensPath(['headers', 'cookie']), 'oauthSessionId=' + sid, eventInit);
  //   const sid2 = session.init(nextEvent);
  //   expect(sid, 'to be', sid2);
  // });
});