'use strict';

import Joi from 'joi';
import R from 'ramda';
import uniqid from 'uniqid';
import { UserError } from '@keboola/serverless-request-handler';
import DynamoDB from '../lib/DynamoDB';
import Validator from '../lib/Validator';

const tableName = DynamoDB.tableNames().credentials;

const getHeader = (name, event) => {
  const headerInverted = R.invertObj(event.headers);
  const headers = R.invertObj(R.map(item => R.toLower(item), headerInverted));
  return R.prop(R.toLower(name), headers);
};

const getCredentials = (dynamoDb, name, componentId, projectId) => dynamoDb.scan({
  TableName: tableName,
  FilterExpression: '#cred_name = :name AND component_id = :component_id AND project_id = :project_id',
  ExpressionAttributeNames: {
    '#cred_name': 'name',
  },
  ExpressionAttributeValues: {
    ':name': name,
    ':component_id': componentId,
    ':project_id': projectId.toString(),
  },
}).promise();

const createResponse = (credentials, consumer) => ({
  id: credentials.name,
  authorizedFor: credentials.authorized_for,
  creator: credentials.creator,
  created: credentials.created,
  '#data': credentials.data,
  oauthVersion: consumer.oauth_version,
  appKey: R.isEmpty(credentials.app_key)
    ? consumer.app_key
    : credentials.app_key,
  '#appSecret': R.isEmpty(credentials.app_secret_docker)
    ? consumer.app_secret_docker
    : credentials.app_secret_docker,
});

const dockerEncryptFn = (kbcApi, tokenRes, componentId) => string => kbcApi.getDockerRunner(tokenRes.token)
  .then(dockerRunner => dockerRunner.encrypt(componentId, tokenRes.project, string));

class Credentials {
  constructor(dynamoDb, kbc) {
    this.dynamoDb = dynamoDb;
    this.kbc = kbc;
    this.schema = {
      id: Joi.string().required().error(UserError.badRequest('"id" is required')),
      authorizedFor: Joi.string(),
      data: Joi.object(),
    };
  }

  list(event) {
    const { componentId } = event.pathParameters;
    if (R.isNil(componentId)) {
      return Promise.reject(UserError.badRequest('Missing \'componentId\' url parameter'));
    }
    const paramsFn = projectId => ({
      TableName: tableName,
      FilterExpression: 'component_id = :component_id AND project_id = :project_id',
      ExpressionAttributeValues: {
        ':component_id': componentId,
        ':project_id': R.toString(projectId),
      },
    });

    return this.kbc.authStorage(getHeader('X-StorageApi-Token', event))
      .then(tokenRes => this.dynamoDb.scan(paramsFn(tokenRes.project)).promise())
      .then(res => R.map(item => ({
        id: item.name,
        authorizedFor: item.authorized_for,
        creator: item.creator,
        created: item.created,
      }), res.Items));
  }

  get(event) {
    const { componentId, name } = event.pathParameters;
    if (R.isNil(componentId)) {
      return Promise.reject(UserError.badRequest('Missing \'componentId\' url parameter'));
    }
    if (R.isNil(name)) {
      return Promise.reject(UserError.badRequest('Missing \'id\' url parameter'));
    }
    const consumerParams = {
      TableName: DynamoDB.tableNames().consumers,
      Key: {
        component_id: componentId,
      },
    };

    return this.kbc.authStorage(getHeader('X-StorageApi-Token', event))
      .then(tokenRes => getCredentials(this.dynamoDb, name, componentId, tokenRes.project))
      .then((credentialsRes) => {
        if (credentialsRes.Count === 0) {
          throw UserError.notFound('Credentials not found');
        }
        const credentials = credentialsRes.Items[0];
        return this.dynamoDb.get(consumerParams).promise()
          .then(consumerRes => consumerRes.Item)
          .then(consumer => createResponse(credentials, consumer));
      });
  }

  add(event) {
    const { componentId } = event.pathParameters;
    if (R.isNil(componentId)) {
      return Promise.reject(UserError.badRequest('Missing \'componentId\' url parameter'));
    }
    if (!R.has('X-StorageApi-Token', event.headers)) {
      return Promise.reject(UserError.unauthorized('Missing \'X-StorageApi-Token\' header'));
    }
    const paramsFn = (requestBody, token, encryptedData) => ({
      TableName: tableName,
      Item: {
        id: uniqid(),
        component_id: componentId,
        project_id: R.toString(token.project),
        name: requestBody.id.toString(),
        authorized_for: requestBody.authorizedFor,
        creator: {
          id: token.id,
          description: token.name,
        },
        created: (new Date()).toISOString(),
        data: encryptedData,
      },
    });
    const consumerParams = {
      TableName: DynamoDB.tableNames().consumers,
      Key: {
        component_id: componentId,
      },
    };

    return Validator.validate(event, this.schema)
      .then(requestBody => this.kbc.authStorage(getHeader('X-StorageApi-Token', event))
        .then(tokenRes => this.dynamoDb.get(consumerParams).promise()
          .then((consumerRes) => {
            if (R.isEmpty(consumerRes)) {
              return Promise.reject(UserError.notFound(`Consumer "${componentId}" not found`));
            }
            const dockerEncrypt = dockerEncryptFn(this.kbc, tokenRes, componentId);
            const credentialsName = requestBody.id.toString();
            return getCredentials(this.dynamoDb, credentialsName, componentId, tokenRes.project)
              .then((credentialsRes) => {
                if (credentialsRes.Count > 0) {
                  throw UserError.error(`Credentials "${credentialsName}" already exists for component "${componentId}"`);
                }
              })
              .then(() => dockerEncrypt(JSON.stringify(requestBody.data))
                .then(encryptedData => paramsFn(requestBody, tokenRes, encryptedData))
                .then(params => this.dynamoDb.put(params).promise()
                  .then(() => createResponse(params.Item, consumerRes.Item))));
          })));
  }

  delete(event) {
    const { componentId, name } = event.pathParameters;
    if (R.isNil(componentId)) {
      return Promise.reject(UserError.badRequest('Missing \'componentId\' url parameter'));
    }
    if (R.isNil(name)) {
      return Promise.reject(UserError.badRequest('Missing \'id\' url parameter'));
    }
    const deleteParamsFn = id => ({
      TableName: tableName,
      Key: { id },
    });

    return this.kbc.authStorage(getHeader('X-StorageApi-Token', event))
      .then(tokenRes => getCredentials(this.dynamoDb, name, componentId, tokenRes.project))
      .then((credentialsRes) => {
        if (credentialsRes.Count === 0) {
          throw UserError.notFound('Credentials not found');
        }
        return deleteParamsFn(credentialsRes.Items[0].id);
      })
      .then(params => this.dynamoDb.delete(params).promise());
  }
}

export default Credentials;
