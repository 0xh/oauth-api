'use strict';

import R from 'ramda';
import OAuthFactory from '../lib/OAuth/OAuthFactory';

const getOauth = consumerP => consumerP.then(resItem => OAuthFactory.getOAuth(resItem));

const getCallbackUrl = (event) => {
  const eventUrl = `https://${event.headers.Host}${event.path}`;
  return eventUrl.substr(-9) === '/callback' ? eventUrl : `${eventUrl}/callback`;
};

const getConsumer = (dynamoDb, params) => dynamoDb.get(params).promise().then(res => res.Item);

const getDataFromSession = (sessionData) => {
  const fromSessionOrDefault = R.propOr(R.__, R.__, sessionData);
  const fromSessionOrNull = fromSessionOrDefault(null);

  return {
    authorized_for: fromSessionOrDefault('', 'authorizedFor'),
    auth_url: fromSessionOrNull('authUrl'),
    token_url: fromSessionOrNull('tokenUrl'),
    request_token_url: fromSessionOrNull('requestTokenUrl'),
    app_key: fromSessionOrNull('appKey'),
    app_secret: fromSessionOrNull('appSecret'),
  };
};

class Authorize {
  constructor(dynamoDb, encryption, kbc, dockerRunner) {
    this.dynamoDb = dynamoDb;
    this.encryption = encryption;
    this.kbc = kbc;
    this.dockerRunner = dockerRunner;
  }

  init(event) {
    const consumerParams = {
      TableName: 'consumers',
      Key: {
        component_id: event.pathParameters.componentId,
      },
    };

    return getOauth(getConsumer(this.dynamoDb, consumerParams))
      .then(oauth => oauth.getRedirectData(getCallbackUrl(event)));
  }

  callback(event, sessionData) {
    const componentId = event.pathParameters.componentId;
    const consumerParams = {
      TableName: 'consumers',
      Key: {
        component_id: componentId,
      },
    };

    return getOauth(getConsumer(this.dynamoDb, consumerParams))
      .then(oauth => oauth.getToken(getCallbackUrl(event), {}, event.queryStringParameters))
      .then(tokenRes => this.saveCredentials(tokenRes, componentId, sessionData));

    // @todo for Zendesk? is this still in use?
    // $sessionOAuthData = $session->getBag()->has('oauth_data')
    //   ? unserialize($session->getEncrypted('oauth_data'))
    //   : [];

    // @todo return normal response when OAuth was initiated via GET auth request
    // if ($session->getBag()->has('returnData') && $session->get('returnData')) {
    //   return new JsonResponse($result, 200, [
    //     "Content-Type" => "application/json",
    //     "Access-Control-Allow-Origin" => "*",
    //     "Connection" => "close"
    // ]);
  }

  saveCredentials(tokens, componentId, sessionData) {
    return this.encryption.decrypt(sessionData.token)
      .then(tokenDecryptRes => this.kbc.authStorage(tokenDecryptRes))
      .then((kbcTokenRes) => {
        const creator = {
          id: kbcTokenRes.id,
          description: kbcTokenRes.name,
        };
        const item = R.merge(
          {
            id: sessionData.id,
            component_id: componentId,
            project_id: kbcTokenRes.project,
            creator: JSON.stringify(creator),
            created: Date.now(),
          },
          getDataFromSession(sessionData)
        );

        return this.encryption.encrypt(JSON.stringify(tokens))
          .then(dataEncryptRes =>
            this.dockerRunner.encrypt(
              componentId,
              kbcTokenRes.project,
              item.appSecret
            ).then((dockerEncryptRes) => {
              const finalItem = R.merge(item, {
                data: dataEncryptRes,
                app_docker_secret: dockerEncryptRes,
              });
              const params = {
                TableName: 'credentials',
                Item: finalItem,
              };

              return this.dynamoDb.put(params).promise()
                .then(() => finalItem);
            })
          );
      });
  }
}

export default Authorize;
