'use strict';

import R from 'ramda';
import uniqid from 'uniqid';
import { UserError } from '@keboola/serverless-request-handler/src/index';
import OAuthFactory from '../lib/OAuth/OAuthFactory';
import DynamoDB from "../lib/DynamoDB";

const credentialsTable = DynamoDB.tableNames().credentials;
const consumersTable = DynamoDB.tableNames().consumers;

const getCallbackUrl = (event) => {
  // @todo try to use event.requestContext.path and host
  const eventUrl = `${process.env.REDIRECT_URI_BASE}${event.path}`;
  return eventUrl.substr(-9) === '/callback' ? eventUrl : `${eventUrl}/callback`;
};

const getDataFromSession = (sessionData) => {
  const sessionOrNull = R.propOr(null, R.__, sessionData);

  return {
    authorized_for: sessionOrNull('authorizedFor'),
    auth_url: sessionOrNull('authUrl'),
    token_url: sessionOrNull('tokenUrl'),
    request_token_url: sessionOrNull('requestTokenUrl'),
    app_key: sessionOrNull('appKey'),
    app_secret: sessionOrNull('appSecret'),
  };
};

const getCredentials = (dynamoDb, name, componentId, projectId) => dynamoDb.scan({
    TableName: credentialsTable,
    FilterExpression: '#cred_name = :name AND component_id = :component_id AND project_id = :project_id',
    ExpressionAttributeNames: {
      '#cred_name': 'name',
    },
    ExpressionAttributeValues: {
      ':name': name,
      ':component_id': componentId,
      ':project_id': R.toString(projectId),
    },
  }).promise().then((res) => res.Items);

const getConsumer = (dynamoDb, componentId) => dynamoDb.get({
    TableName: consumersTable,
    Key: {
      component_id: componentId,
    },
  }).promise()
  .then((res) => {
    if (R.isEmpty(res)) {
      throw UserError.notFound('Consumer not found');
    }
    return res.Item;
  });

const dockerEncryptFn = (encryptor, componentId, projectId) =>
  string => encryptor.encrypt(componentId, projectId, string);

class Authorize {
  constructor(dynamoDb, encryption, kbc, dockerRunner) {
    this.dynamoDb = dynamoDb;
    this.encryption = encryption;
    this.kbc = kbc;
    this.dockerRunner = dockerRunner;
  }

  init(event) {
    return getConsumer(this.dynamoDb, event.pathParameters.componentId)
      .then(consumer => OAuthFactory.getOAuth(consumer))
      .then(oauth => oauth.getRedirectData(getCallbackUrl(event)));
  }

  callback(event, sessionData) {
    const componentId = event.pathParameters.componentId;

    return getConsumer(this.dynamoDb, componentId)
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

    const name = R.type(sessionData.id) === 'String' ? sessionData.id : R.toString(sessionData.id);

    return this.encryption.decrypt(sessionData.token)
      .then(tokenDecryptRes => this.kbc.authStorage(tokenDecryptRes))
      .then((kbcTokenRes) => {
        // check if exists
        return getCredentials(this.dynamoDb, name, componentId, R.toString(kbcTokenRes.project))
          .then((item) => {
            if (R.isEmpty(item)) {
              return Promise.resolve(kbcTokenRes);
            }
            throw UserError.error(`Credentials with name ${name} already exists in this project`);
          });
      })
      .then((kbcTokenRes) => {
        const item = R.merge(
          {
            id: uniqid(),
            name: name,
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

        const dockerEncrypt = dockerEncryptFn(this.dockerRunner, componentId, kbcTokenRes.project);

        return Promise.all([
          dockerEncrypt(JSON.stringify(tokens)),
          dockerEncrypt(item.appSecret),
        ])
          .then((allEncrypted) => {
            const finalItem = R.merge(item, {
              data: allEncrypted[0],
              app_docker_secret: allEncrypted[1],
            });
            const params = {
              TableName: credentialsTable,
              Item: finalItem,
            };

            return this.dynamoDb.put(params).promise()
              .then(() => finalItem);
          });
      });
  }
}

export default Authorize;
