'use strict';

import R from 'ramda';
import { UserError } from '@keboola/serverless-request-handler/src/index';
import OAuthFactory from '../lib/OAuth/OAuthFactory';
import uniqid from "uniqid";

const getCallbackUrl = (event) => {
  // @todo try to use event.requestContext.path and host
  const eventUrl = `${process.env.REDIRECT_URI_BASE}${event.path}`;
  return eventUrl.substr(-9) === '/callback' ? eventUrl : `${eventUrl}/callback`;
};

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

const getConsumer = (dynamoDb, params) => dynamoDb.get(params).promise()
  .then((res) => {
    if (R.isEmpty(res)) {
      throw UserError.notFound('Consumer not found');
    }
    return res.Item;
  });

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

    return getConsumer(this.dynamoDb, consumerParams)
      .then(consumer => OAuthFactory.getOAuth(consumer))
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

    return getConsumer(this.dynamoDb, consumerParams)
      .then(consumer => OAuthFactory.getOAuth(consumer))
      .then((oauth) => {
        if (R.has('oauthData', sessionData)) {
          return this.encryption.decrypt(sessionData.oauthData)
            .then(oauthDataRes => oauth.getToken(
              getCallbackUrl(event),
              JSON.parse(oauthDataRes),
              event.queryStringParameters)
            );
        }
        return oauth.getToken(getCallbackUrl(event), {}, event.queryStringParameters);
      })
      .then(tokenRes => this.saveCredentials(tokenRes, componentId, sessionData));
  }

  saveCredentials(tokens, componentId, sessionData) {
    if (R.hasIn('returnData', sessionData) && sessionData.returnData === true) {
      return tokens;
    }

    return this.encryption.decrypt(sessionData.token)
      .then(tokenDecryptRes => this.kbc.authStorage(tokenDecryptRes))
      .then((kbcTokenRes) => {
        // @todo: add validation?
        const item = R.merge(
          {
            id: uniqid(),
            name: R.type(sessionData.id) === 'String' ? sessionData.id : R.toString(sessionData.id),
            component_id: componentId,
            project_id: R.toString(kbcTokenRes.project),
            creator: {
              id: kbcTokenRes.id,
              description: kbcTokenRes.name,
            },
            created: (new Date()).toISOString(),
          },
          getDataFromSession(sessionData)
        );

        return this.dockerRunner.encrypt(
          componentId,
          kbcTokenRes.project,
          JSON.stringify(tokens)
        )
          .then(dataEncrypted => this.dockerRunner.encrypt(
            componentId,
            kbcTokenRes.project,
            item.appSecret
          )
            .then((appSecretEncrypted) => {
              const finalItem = R.merge(item, {
                data: dataEncrypted,
                app_docker_secret: appSecretEncrypted,
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
