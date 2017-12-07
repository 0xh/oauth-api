'use strict';

import Joi from 'joi';
import Validator from '../lib/Validator';

class Credentials {
  constructor(dynamoDb, kbc) {
    this.dynamoDb = dynamoDb;
    this.kbc = kbc;
    this.tableName = 'credentials';
    this.schema = {
      id:Joi.string().required(),
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

    return this.kbc.authStorage(event)
      .then(() => this.dynamoDb.scan(params).promise()
        .then(res => res.Items)
      );
  }

  get(event) {
    const component_id = event.pathParameters.componentId;
    const name = event.pathParameters.name;

    const paramsFn = (project_id) => ({
      TableName: this.tableName,
      FilterExpression : 'name = :name AND component_id = :component_id AND project_id = :project_id',
      ExpressionAttributeValues : {
        ':name' : name,
        ':component_id': component_id,
        ':project_id': project_id,
      }
    });

    return this.kbc.authStorage(event)
      .then((tokenRes) => this.dynamoDb.get(paramsFn(tokenRes.project)).promise()
        .then(res => res.Item)
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
