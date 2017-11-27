/**
 * Author: miro@keboola.com
 * Date: 27/11/2017
 */
'use strict';

import Authorize from '../../src/app/Authorize';
import DynamoDB from '../../src/lib/DynamoDB';
import expect from 'unexpected';
import Session from "../../src/lib/Session";

const dynamoDb = DynamoDB.getClient();

const consumer1 = {
  "component_id": "keboola.ex-google-analytics",
  "auth_url": "some url",
  "token_url": "some other url",
  "request_token_url": "another url",
  "app_key": "test",
  "app_secret": "fsfsg",
  "friendly_name": "Google Analytics Extractor",
  "oauth_version": "2.0"
};

function insertConsumer() {
  return dynamoDb.put({
    TableName: 'consumers',
    Item: consumer1
  }).promise();
}

function deleteConsumer() {
  var params = {
    TableName : 'consumers',
    Key: {
      component_id: 'keboola.ex-google-analytics'
    }
  };

  return dynamoDb.delete(params).promise().then(res => res);
}

const eventInit = {
  headers: {
    'Content-Type': 'application/json',
    Host: '0.0.0.0:3000',
  },
  path: '/authorize/keboola.ex-google-drive',
  pathParameters: { componentId: 'keboola.ex-google-analytics' },
  resource: '/authorize/{componentId}',
  httpMethod: 'POST',
  queryStringParameters: null,
  body: null
};


describe('Authorize', () => {
  const authorize = new Authorize(dynamoDb, new Session(dynamoDb));

  beforeEach(() => {
    return deleteConsumer();
  });

  it('init', () => {
    return insertConsumer().then(() => {
      return authorize.init(eventInit).then((res) => {
        expect(res, 'to have property', 'url', 'some url');
      })
    });
  });
});



