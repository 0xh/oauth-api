'use strict';

import R from 'ramda';
import AWS from 'aws-sdk';
import DynamoDB from '../src/lib/DynamoDB';

export default {
  createTables: () => {
    const dynamo = new AWS.DynamoDB({
      region: 'eu-central-1',
      endpoint: 'http://dynamodb:8000',
    });

    return dynamo.listTables({})
      .promise().then((res) => {
        if (!R.isEmpty(res.TableNames)) {
          return Promise.resolve();
        }
        return Promise.all([
          dynamo.createTable({
            TableName: DynamoDB.tableNames().consumers,
            AttributeDefinitions: [
              {
                AttributeName: 'component_id',
                AttributeType: 'S',
              },
            ],
            KeySchema: [
              {
                AttributeName: 'component_id',
                KeyType: 'HASH',
              },
            ],
            ProvisionedThroughput: {
              ReadCapacityUnits: 1,
              WriteCapacityUnits: 1,
            },
          }).promise(),
          dynamo.createTable({
            TableName: DynamoDB.tableNames().credentials,
            AttributeDefinitions: [
              {
                AttributeName: 'id',
                AttributeType: 'S',
              },
            ],
            KeySchema: [
              {
                AttributeName: 'id',
                KeyType: 'HASH',
              },
            ],
            ProvisionedThroughput: {
              ReadCapacityUnits: 1,
              WriteCapacityUnits: 1,
            },
          }).promise(),
          dynamo.createTable({
            TableName: DynamoDB.tableNames().sessions,
            AttributeDefinitions: [
              {
                AttributeName: 'id',
                AttributeType: 'S',
              },
            ],
            KeySchema: [
              {
                AttributeName: 'id',
                KeyType: 'HASH',
              },
            ],
            ProvisionedThroughput: {
              ReadCapacityUnits: 1,
              WriteCapacityUnits: 1,
            },
          }).promise(),
        ]);
      });
  },
};
