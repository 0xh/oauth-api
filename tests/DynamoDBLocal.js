'use strict';

// import AWS from 'aws-sdk';
import R from 'ramda';
import DynamoDB from '../src/lib/DynamoDB';

export default {
  getClient: () => DynamoDB.getDocClient(),

  createTables: () => {
    const dynamo = DynamoDB.getRawClient();

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

  truncateTable: (tableName, key) => {
    const docClient = DynamoDB.getDocClient();

    return docClient.scan({
      TableName: tableName,
    }).promise().then((res) => {
      if (R.isEmpty(res.Items)) {
        return Promise.resolve();
      }

      const requests = R.map(item => ({
        DeleteRequest: {
          Key: {
            [key]: item[key],
          },
        },
      }), res.Items);

      const params = { RequestItems: {} };
      if (!R.isEmpty(requests)) {
        params.RequestItems[tableName] = requests;
      }

      return docClient.batchWrite(params).promise();
    });
  },
};
