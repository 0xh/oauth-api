'use strict';

import Joi from 'joi';
import R from 'ramda';
import Validator from '../lib/Validator';

class Credentials {
  constructor(dynamoDb, kbc) {
    this.dynamoDb = dynamoDb;
    this.kbc = kbc;
    this.tableName = 'credentials';
    this.schema = {
      id: Joi.number().integer().required(),
      name: Joi.string().required(),
      component_id: Joi.string().required(),
      project_id: Joi.string().required(),
      creator: Joi.string().required(),
      data: Joi.string().required(),
      authorized_for: Joi.string(),
      created: Joi.string(),
    };
  }

  list(event) {
    const params = {
      TableName: this.tableName,
    };

    return this.kbc.authStorage(R.prop('X-StorageApi-Token', event.headers))
      .then(() => this.dynamoDb.scan(params).promise()
        .then(res => res.Items)
      );
  }

  get(event) {
    const component_id = event.pathParameters.componentId;
    const name = event.pathParameters.name;

    const paramsFn = project_id => ({
      TableName: this.tableName,
      FilterExpression: 'name = :name AND component_id = :component_id AND project_id = :project_id',
      ExpressionAttributeValues: {
        ':name': name,
        ':component_id': component_id,
        ':project_id': project_id,
      },
    });

    const consumerParams = {
      TableName: 'consumers',
      Key: {
        component_id,
      },
    };

    return this.kbc.authStorage(event)
      .then(tokenRes => this.dynamoDb.get(paramsFn(tokenRes.project)).promise()
        .then(res => res.Item)
        .then(credentialsRes => this.dynamoDb.get(consumerParams).promise()
          .then(consumerRes => ({
            id: name,
            authorizedFor: R.prop('authorized_for', credentialsRes),
            creator: JSON.parse(R.prop('creator', credentialsRes)),
            created: credentialsRes.created,
            '#data': credentialsRes.data,
            oauthVersion: consumerRes.oauth_version,
            appKey: R.isEmpty(credentialsRes.app_key)
              ? consumerRes.app_key
              : credentialsRes.app_key,
            '#appSecret': R.isEmpty(credentialsRes.app_secret_docker)
              ? consumerRes.app_secret_docker
              : credentialsRes.app_secret_docker,
          }))
        )
      );
  }

  add(event) {
    const item = Validator.validate(event, this.schema);
    const params = {
      TableName: this.tableName,
      Item: item,
    };

    return this.kbc.authStorage(event)
      .then(() => this.dynamoDb.put(params).promise()
        .then(() => item)
      );
  }
}

export default Credentials;
