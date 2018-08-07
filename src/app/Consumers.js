'use strict';

import Joi from 'joi';
import R from 'ramda';
import { UserError } from '@keboola/serverless-request-handler/src/index';
import Validator from '../lib/Validator';
import DynamoDB from '../lib/DynamoDB';

const tableName = DynamoDB.tableNames().consumers;

const getConsumer = (dynamoDb, encryption, componentId) => dynamoDb.get({
  TableName: tableName,
  Key: { component_id: componentId },
}).promise()
  .then((res) => {
    if (R.isEmpty(res)) {
      throw UserError.notFound(`Consumer "${componentId}" not found`);
    }
    return res.Item;
  });

const putConsumer = (dynamoDb, encryption, dockerEncryptFn, consumer) => Promise.all([
  encryption.encrypt(consumer.app_secret),
  dockerEncryptFn(consumer.app_secret),
])
  .then(results => R.merge(consumer, {
    app_secret: results[0],
    app_secret_docker: results[1],
  }))
  .then(consumerToSave => dynamoDb.put({
    TableName: tableName,
    Item: consumerToSave,
  }).promise());

const dockerEncryptFn = (encryptor, componentId, projectId) =>
  string => encryptor.encrypt(componentId, projectId, string);

class Consumers {
  constructor(dynamoDb, kbc, encryption, dockerRunner) {
    this.dynamoDb = dynamoDb;
    this.kbc = kbc;
    this.encryption = encryption;
    this.dockerRunner = dockerRunner;
    this.schema = {
      component_id: Joi.string().required()
        .error(UserError.badRequest('"component_id" is required')),
      auth_url: Joi.string().required()
        .error(UserError.badRequest('"auth_url" is required')),
      token_url: Joi.string().required()
        .error(UserError.badRequest('"token_url" is required')),
      request_token_url: Joi.string(),
      app_key: Joi.string().required()
        .error(UserError.badRequest('"app_key" is required')),
      app_secret: Joi.string().required()
        .error(UserError.badRequest('"app_secret" is required')),
      friendly_name: Joi.string().required()
        .error(UserError.badRequest('"friendly_name" is required')),
      oauth_version: Joi.string().required()
        .error(UserError.badRequest('"oauth_version" is required')),
    };
  }

  list(event) {
    const params = {
      TableName: tableName,
    };

    return this.kbc.authManageToken(event)
      .then(() => this.dynamoDb.scan(params).promise())
      .then(res => res.Items)
      .then(items => R.map(item => ({
        id: item.component_id,
        friendly_name: item.friendly_name,
        app_key: item.app_key,
        oauth_version: item.oauth_version,
      }), items));
  }

  get(event) {
    const { componentId } = event.pathParameters;
    if (R.isNil(componentId)) {
      return Promise.reject(UserError.badRequest('Missing "componentId" url parameter'));
    }

    return this.kbc.authManageToken(event)
      .then(() => getConsumer(this.dynamoDb, this.encryption, componentId));
  }

  add(event) {
    return Validator.validate(event, this.schema)
      .then(consumer => this.kbc.authManageToken(event)
        .then(() => this.kbc.authStorageToken(event))
        .then(storageToken => this.dynamoDb.get({
          TableName: tableName,
          Key: { component_id: consumer.component_id },
        }).promise()
          .then((res) => {
            if (!R.isEmpty(res)) {
              throw UserError.error(`Consumer "${consumer.component_id}" already exists`);
            }
            return res;
          })
          .then(() => putConsumer(
            this.dynamoDb,
            this.encryption,
            dockerEncryptFn(this.dockerRunner, consumer.component_id, storageToken.project),
            consumer
          ))
          .then(() => ({
            status: 'created',
            component_id: consumer.component_id,
          }))));
  }

  patch(event) {
    const { componentId } = event.pathParameters;
    if (R.isNil(componentId)) {
      return Promise.reject(UserError.badRequest('Missing "componentId" url parameter'));
    }
    const patchSchema = {
      auth_url: Joi.string(),
      token_url: Joi.string(),
      request_token_url: Joi.string(),
      app_key: Joi.string(),
      app_secret: Joi.string(),
      friendly_name: Joi.string(),
      oauth_version: Joi.string(),
    };

    return Validator.validate(event, patchSchema)
      .then(updateAttributes => this.kbc.authManageToken(event)
        .then(() => this.kbc.authStorageToken(event))
        .then(storageToken => getConsumer(this.dynamoDb, this.encryption, componentId)
          .then(item => R.merge(item, updateAttributes))
          .then(updatedItem => putConsumer(
            this.dynamoDb,
            this.encryption,
            dockerEncryptFn(this.dockerRunner, componentId, storageToken.project),
            updatedItem
          )
            .then(() => updatedItem))));
  }

  delete(event) {
    const { componentId } = event.pathParameters;
    if (R.isNil(componentId)) {
      return Promise.reject(UserError.badRequest('Missing "componentId" url parameter'));
    }
    return this.kbc.authManageToken(event)
      .then(() => this.dynamoDb.delete({
        TableName: tableName,
        Key: { component_id: componentId },
      }).promise());
  }
}

export default Consumers;
