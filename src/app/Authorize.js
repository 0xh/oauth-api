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
  constructor(dynamoDb) {
    this.dynamoDb = dynamoDb;
  }

  init(event) {
    const componentId = event.pathParameters.componentId;
    const consumerParams = {
      TableName: 'consumers',
      Key: {
        component_id: componentId
      }
    };
    const consumerPromise = this.dynamoDb.get(consumerParams).promise().then(res => res.Item);
    return getOauth(consumerPromise)
      .then(oauth => oauth.getRedirectData(getCallbackUrl(event)));
  }

  callback(event) {
    return Promise.resolve("callback response");
  }
}

export default Authorize;