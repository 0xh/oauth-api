'use strict';

import Joi from 'joi';
import R from 'ramda';
import { UserError } from '@keboola/serverless-request-handler/src/index';
import Validator from '../lib/Validator';
import DynamoDB from '../lib/DynamoDB';

const tableName = DynamoDB.tableNames().consumers;

const getConsumer = (dynamoDb, encryption, componentId) => {
  const params = {
    TableName: tableName,
    Key: { component_id: componentId },
  };

  return dynamoDb.get(params).promise()
    .then((res) => {
      if (R.isEmpty(res)) {
        throw UserError.notFound(`Consumer "${componentId}" not found`);
      }
      return res.Item;
    })
    .then(consumerItem => encryption.decrypt(consumerItem.app_secret)
      .then(appSecretPlain => R.merge(consumerItem, { app_secret: appSecretPlain })));
};

const putConsumer = (dynamoDb, encryption, consumer) => encryption.encrypt(consumer.app_secret)
  .then(encryptedSecret => R.merge(consumer, { app_secret: encryptedSecret }))
  .then(consumerToSave => dynamoDb.put({
    TableName: tableName,
    Item: consumerToSave,
  }).promise());

class Consumers {
  constructor(dynamoDb, kbc, encryption) {
    this.dynamoDb = dynamoDb;
    this.kbc = kbc;
    this.encryption = encryption;
    this.schema = {
      component_id: Joi.string().required(),
      auth_url: Joi.string().required(),
      token_url: Joi.string().required(),
      request_token_url: Joi.string(),
      app_key: Joi.string().required(),
      app_secret: Joi.string().required(),
      friendly_name: Joi.string().required(),
      oauth_version: Joi.string().required(),
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
        .then(() => this.dynamoDb.get({
          TableName: tableName,
          Key: { component_id: consumer.component_id },
        }).promise())
        .then((res) => {
          if (!R.isEmpty(res)) {
            throw UserError.error(`Consumer "${consumer.component_id}" already exists`);
          }
          return res;
        })
        .then(() => putConsumer(this.dynamoDb, this.encryption, consumer))
        .then(() => ({
          status: 'created',
          component_id: consumer.component_id,
        })));
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
        .then(() => getConsumer(this.dynamoDb, this.encryption, componentId))
        .then(item => R.merge(item, updateAttributes))
        .then(updatedItem => putConsumer(this.dynamoDb, this.encryption, updatedItem)
          .then(() => updatedItem)));
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
