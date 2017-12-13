'use strict';

import Joi from 'joi';
import R from 'ramda';
import uniqid from 'uniqid';
import { UserError } from '@keboola/serverless-request-handler';
import Validator from '../lib/Validator';

class Credentials {
  constructor(dynamoDb, kbc) {
    this.dynamoDb = dynamoDb;
    this.kbc = kbc;
    this.tableName = 'credentials';
    this.schema = {
      id: Joi.string().required(),
      authorizedFor: Joi.string(),
      data: Joi.object(),
    };
  }

  list(event) {
    const componentId = event.pathParameters.componentId;
    const paramsFn = projectId => ({
      TableName: this.tableName,
      FilterExpression: 'component_id = :component_id AND project_id = :project_id',
      ExpressionAttributeValues: {
        ':component_id': componentId,
        ':project_id': R.toString(projectId),
      },
    });

    return this.kbc.authStorage(R.prop('X-StorageApi-Token', event.headers))
      .then(tokenRes => this.dynamoDb.scan(paramsFn(tokenRes.project)).promise())
      .then(res => R.map(item => ({
        id: item.name,
        authorizedFor: item.authorized_for,
        creator: JSON.parse(item.creator),
        created: item.created,
      }), res.Items));
  }

  get(event) {
    const componentId = event.pathParameters.componentId;
    const name = event.pathParameters.name;

    if (R.isNil(componentId)) {
      return Promise.reject(UserError.badRequest('Missing "componentId" url parameter'));
    }

    if (R.isNil(name)) {
      return Promise.reject(UserError.badRequest('Missing "id" url parameter'));
    }

    const paramsFn = projectId => ({
      TableName: this.tableName,
      FilterExpression: '#cred_name = :name AND component_id = :component_id AND project_id = :project_id',
      ExpressionAttributeNames: {
        '#cred_name': 'name',
      },
      ExpressionAttributeValues: {
        ':name': name,
        ':component_id': componentId,
        ':project_id': R.toString(projectId),
      },
    });

    const consumerParams = {
      TableName: 'consumers',
      Key: {
        component_id: componentId,
      },
    };

    return this.kbc.authStorage(R.prop('X-StorageApi-Token', event.headers))
      .then(tokenRes => this.dynamoDb.scan(paramsFn(tokenRes.project)).promise())
      .then((credentialsRes) => {
        if (credentialsRes.Count === 0) {
          throw UserError.notFound('Credentials not found');
        }
        const credentials = credentialsRes.Items[0];
        return this.dynamoDb.get(consumerParams).promise()
          .then(consumerRes => consumerRes.Item)
          .then(consumer => ({
            id: name,
            authorizedFor: R.prop('authorized_for', credentials),
            creator: JSON.parse(R.prop('creator', credentials)),
            created: credentials.created,
            '#data': credentials.data,
            oauthVersion: consumer.oauth_version,
            appKey: R.isEmpty(credentials.app_key)
              ? consumer.app_key
              : credentials.app_key,
            '#appSecret': R.isEmpty(credentials.app_secret_docker)
              ? consumer.app_secret_docker
              : credentials.app_secret_docker,
          }));
      });
  }

  add(event) {
    const componentId = event.pathParameters.componentId;
    const requestBody = Validator.validate(event, this.schema);
    const paramsFn = token => ({
      TableName: this.tableName,
      Item: {
        id: uniqid(),
        name: requestBody.id,
        authorized_for: requestBody.authorizedFor,
        creator: {
          id: token.id,
          description: token.name,
        },
        created: (new Date()).toISOString(),
        data: requestBody.data, // encrypt ?
      },
    });
    const consumerParams = {
      TableName: 'consumers',
      Key: {
        component_id: componentId,
      },
    };

    return this.kbc.authStorage(R.prop('X-StorageApi-Token', event.headers))
      .then(tokenRes => this.dynamoDb.get(consumerParams).promise()
        .then((consumerRes) => {
          if (R.isEmpty(consumerRes)) {
            return Promise.reject(UserError.notFound(`Consumer '${componentId}' not found`));
          }
          const params = paramsFn(tokenRes);
          return this.dynamoDb.put(params).promise()
            .then(() => {
              const credentials = params.Item;
              const consumer = consumerRes.Item;
              return {
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
              };
            });
        }));
  }
}

export default Credentials;
