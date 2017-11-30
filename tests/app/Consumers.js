/**
 * Author: miro@keboola.com
 * Date: 22/11/2017
 */

'use strict';

import expect from 'unexpected';
import { List, Map } from 'immutable';
import Consumers from '../../src/app/Consumers';
import DynamoDB from '../../src/lib/DynamoDB';
import KbcApi from '../../src/lib/KbcApi';

const dynamoDb = DynamoDB.getClient();
const headers = {
  'X-KBC-ManageApiToken': process.env.KBC_MANAGE_API_TOKEN,
};

const consumer1 = {
  component_id: 'keboola.ex-google-analytics',
  auth_url: 'some url',
  token_url: 'some other url',
  request_token_url: 'another url',
  app_key: 'test',
  app_secret: 'fsfsg',
  friendly_name: 'Google Analytics Extractor',
  oauth_version: '2.0',
};

const consumer2 = {
  component_id: 'keboola.ex-google-drive',
  auth_url: 'some url',
  token_url: 'some other url',
  request_token_url: 'another url what?',
  app_key: 'test',
  app_secret: 'fsfsg',
  friendly_name: 'Google Drive Extractor',
  oauth_version: '2.0',
  'some bs key': 'this should be ignored',
};

// @todo test user error response
// const consumerFlawed = {
//   component_id: 'keboola.wr-google-drive',
//   auth_url: 'some url',
//   token_url: 'some other url',
//   request_token_url: 'another url what?',
//   app_key: 'test',
//   friendly_name: 'Google Drive Writer',
//   oauth_version: '2.0',
// };

function insertConsumers() {
  const consumerList = List([consumer1, consumer2]).map(item => ({
    PutRequest: {
      Item: item,
    },
  })).toJS();

  return dynamoDb.batchWrite({
    RequestItems: {
      consumers: consumerList,
    },
  }).promise();
}

function deleteConsumers() {
  const consumerList = List([consumer1, consumer2]).map(item => ({
    DeleteRequest: {
      Key: {
        component_id: item.component_id,
      },
    },
  })).toJS();

  return dynamoDb.batchWrite({
    RequestItems: {
      consumers: consumerList,
    },
  });
}

describe('Consumers', () => {
  const consumers = new Consumers(dynamoDb, new KbcApi());

  beforeEach(() => deleteConsumers());

  it('list', () => insertConsumers().then(() => consumers.list({
    headers,
  }).then((res) => {
    expect(res, 'to have length', 2);
  })));

  it('get', () => insertConsumers().then(() => consumers.get({
    headers,
    pathParameters: {
      componentId: 'keboola.ex-google-drive',
    },
  }).then((res) => {
    Map(consumer2).forEach((value, key) => {
      expect(res[key], 'to be', value);
    });
  })));

  it('add', () => consumers.add({
    headers,
    body: JSON.stringify(consumer1),
  }).then((res) => {
    Map(consumer1).forEach((value, key) => {
      expect(res[key], 'to be', value);
    });
  }));
});
