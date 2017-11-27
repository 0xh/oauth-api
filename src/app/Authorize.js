'use strict';

import OAuthFactory from '../lib/OAuth/OAuthFactory';

const getOauth = (consumerP) => {
  return consumerP.then((resItem) => {
    return OAuthFactory.getOAuth(resItem);
  });
};

const getCallbackUrl = (event) => {
  const eventUrl = 'https://' + event.headers.Host + event.path;
  return eventUrl.substr(-9) === "/callback" ? eventUrl : eventUrl + '/callback';
};

class Authorize {
  constructor(dynamoDb, session) {
    this.dynamoDb = dynamoDb;
    this.session = session;
  }

  init(event) {
    const componentId = event.pathParameters.componentId;
    const sessionId = this.session.init(event);
    const consumerParams = {
      TableName: 'consumers',
      Key: {
        component_id: componentId
      }
    };
    const consumerPromise = this.dynamoDb.get(consumerParams).promise().then(res => res.Item);

    //@todo: maybe remove the session handling from this class and add then with session work outside in authorize func
    return getOauth(consumerPromise)
      .then(oauth => oauth.getRedirectData(getCallbackUrl(event)))
      .then((redirectData) => {
        return this.session.set(sessionId, {
          'componentId': componentId
        }).then((sessionRes) => {
          return redirectData;
        });
      });
  }

  callback(event) {
    return Promise.resolve("callback response");
  }
}

export default Authorize;