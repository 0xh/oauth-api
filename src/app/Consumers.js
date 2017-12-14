'use strict';

import Joi from 'joi';
import R from 'ramda';
import Validator from '../lib/Validator';
import {UserError} from "@keboola/serverless-request-handler/src/index";

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
        oauth_version: item.oauth_version
      }), items));
  }

  get(event) {
    const componentId = event.pathParameters.componentId;
    if (R.isNil(componentId)) {
      return Promise.reject(UserError.badRequest('Missing "componentId" url parameter'));
    }
    const params = {
      TableName: tableName,
      Key: {
        component_id: componentId,
      },
    };

    return this.kbc.authManageToken(event)
      .then(() => this.dynamoDb.get(params).promise())
      .then((res) => {
        if (R.isEmpty(res)) {
          throw UserError.notFound(`Consumer "${componentId}" not found`);
        }
        return res.Item
      });
  }

  add(event) {
    try {
      const consumer = Validator.validate(event, this.schema);
      const params = {
        TableName: tableName,
        Item: consumer,
      };
      return this.kbc.authManageToken(event)
        .then(() => this.dynamoDb.put(params).promise())
        .then(() => consumer);

    } catch (e) {
      return Promise.reject(UserError.unprocessable(e.message));
    }
  }
}

export default Consumers;
