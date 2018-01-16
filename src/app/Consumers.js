'use strict';

import Joi from 'joi';
import R from 'ramda';
import { UserError } from '@keboola/serverless-request-handler/src/index';
import Validator from '../lib/Validator';

const tableName = 'consumers';

class Consumers {
  constructor(dynamoDb, kbc) {
    this.dynamoDb = dynamoDb;
    this.kbc = kbc;
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
    const componentId = event.pathParameters.componentId;
    if (R.isNil(componentId)) {
      return Promise.reject(UserError.badRequest('Missing "componentId" url parameter'));
    }
    const params = {
      TableName: tableName,
      Key: { component_id: componentId },
    };

    return this.kbc.authManageToken(event)
      .then(() => this.dynamoDb.get(params).promise())
      .then((res) => {
        if (R.isEmpty(res)) {
          throw UserError.notFound(`Consumer "${componentId}" not found`);
        }
        return res.Item;
      });
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
        .then(() => this.dynamoDb.put({
          TableName: tableName,
          Item: consumer,
        }).promise())
        .then(() => consumer)
      );
  }

  patch(event) {
    const componentId = event.pathParameters.componentId;
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
        .then(() => this.dynamoDb.get({
          TableName: tableName,
          Key: { component_id: componentId },
        }).promise())
        .then((res) => {
          if (R.isEmpty(res)) {
            throw UserError.notFound(`Consumer "${componentId}" not found`);
          }
          return res.Item;
        })
        .then((item) => {
          const updatedItem = R.merge(item, updateAttributes);
          return this.dynamoDb.put({
            TableName: tableName,
            Item: updatedItem,
          }).promise()
            .then(() => updatedItem);
        })
      );
  }

  delete(event) {
    const componentId = event.pathParameters.componentId;
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
