'use strict';
import Joi from 'joi';
import Validator from '../lib/Validator';

const schema = {
  component_id: Joi.string().required(),
  auth_url: Joi.string().required(),
  token_url: Joi.string().required(),
  request_token_url: Joi.string(),
  app_key: Joi.string().required(),
  app_secret: Joi.string().required(),
  friendly_name: Joi.string().required(),
  oauth_version: Joi.string().required()
};

class Consumers {
  constructor(dynamoDb) {
    this.dynamoDb = dynamoDb;
  }

  list() {
    const params = {
      TableName: 'consumers',
    };

    return this.dynamoDb.scan(params).promise()
    .then(res => res.Items);
  }

  get(event) {
    const params = {
      TableName: 'consumers',
      Key: {
        component_id: event.pathParameters.componentId
      }
    };

    return this.dynamoDb.get(params).promise()
      .then(res => res.Item);
  }

  add(event) {
    const consumer = Validator.validate(event, schema);
    const params = {
      TableName: 'consumers',
      Item: consumer
    };

    return this.dynamoDb.put(params).promise()
      .then(res => consumer);
  }
}

export default Consumers;