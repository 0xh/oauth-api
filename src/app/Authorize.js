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

const getConsumer = (dynamoDb, params) => {
  return dynamoDb.get(params).promise().then(res => res.Item);
};

class Authorize {
  constructor(dynamoDb) {
    this.dynamoDb = dynamoDb;
  }

  init(event) {
    const consumerParams = {
      TableName: 'consumers',
      Key: {
        component_id: event.pathParameters.componentId
      }
    };

    return getOauth(getConsumer(this.dynamoDb, consumerParams))
      .then(oauth => oauth.getRedirectData(getCallbackUrl(event)));
  }

  callback(event) {
    const consumerParams = {
      TableName: 'consumers',
      Key: {
        component_id: event.pathParameters.componentId
      }
    };

    return getOauth(getConsumer(this.dynamoDb, consumerParams))
      .then((oauth) => {
        return oauth.getToken(getCallbackUrl(event), {}, event.queryStringParameters)
          .then((tokenRes) => {
            //@todo save token into DB
          });
      });

    //@todo for Zendesk? is this still in use?
    // $sessionOAuthData = $session->getBag()->has('oauth_data')
    //   ? unserialize($session->getEncrypted('oauth_data'))
    //   : [];

    //@todo return normal response when OAuth was initiated via GET auth request
    // if ($session->getBag()->has('returnData') && $session->get('returnData')) {
    //   return new JsonResponse($result, 200, [
    //     "Content-Type" => "application/json",
    //     "Access-Control-Allow-Origin" => "*",
    //     "Connection" => "close"
    // ]);


    // $this->storeResult($result, $componentId, $session);

    // return Promise.resolve("callback response");
  }
}

export default Authorize;