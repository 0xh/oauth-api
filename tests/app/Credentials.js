/**
 * Author: miro@keboola.com
 * Date: 22/11/2017
 */


'use strict';

import expect from 'unexpected';
import { List, Map } from 'immutable';
import DynamoDB from '../../src/lib/DynamoDB';
import KbcApi from '../../src/lib/KbcApi';
import Credentials from '../../src/app/Credentials';

const dynamoDb = DynamoDB.getClient();
const headers = {
  'X-StorageApi-Token': process.env.KBC_STORAGE_API_TOKEN,
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

const credentials1 = {
  id: '0',
  name: '123',
  component_id: 'keboola.ex-google-analytics',
  project_id: '219',
  creator: 'miro',
  data: 'encrypted data',
  authorized_for: 'me',
  created: Date.now(),
};

const credentials2 = {
  id: '1',
  name: '456',
  component_id: 'keboola.ex-google-drive',
  project_id: '219',
  creator: 'miro',
  data: 'encrypted data',
  authorized_for: 'me',
  created: Date.now(),
};

function prepareData() {
  const consumerList = List([consumer1, consumer2]).map(item => ({
    PutRequest: {
      Item: item,
    },
  })).toJS();

  const credentialsList = List([credentials1, credentials2]).map(item => ({
    PutRequest: {
      Item: item,
    },
  })).toJS();

  return dynamoDb.batchWrite({
    RequestItems: {
      consumers: consumerList,
      credentials: credentialsList
    },
  }).promise();
}

function clearData() {
  const consumerList = List([consumer1, consumer2]).map(item => ({
    DeleteRequest: {
      Key: {
        component_id: item.component_id,
      },
    },
  })).toJS();

  const credentialsList = List([credentials1, credentials2]).map(item => ({
    DeleteRequest: {
      Key: {
        id: item.id,
      },
    },
  })).toJS();

  return dynamoDb.batchWrite({
    RequestItems: {
      consumers: consumerList,
      credentials: credentialsList
    },
  });
}

describe('Credentials', () => {
  const credentials = new Credentials(dynamoDb, new KbcApi());

  beforeEach(() => clearData());

  it('list', () => prepareData().then(() => credentials.list({
    headers,
  }).then((res) => {
    expect(res, 'to have length', 2);
  })));

  // it('get', () => prepareData().then(() => credentials.get({
  //   headers,
  //   pathParameters: {
  //     componentId: 'keboola.ex-google-drive',
  //   },
  // }).then((res) => {
  //   Map(consumer2).forEach((value, key) => {
  //     expect(res[key], 'to be', value);
  //   });
  // })));
  //
  // it('add', () => credentials.add({
  //   headers,
  //   body: JSON.stringify(credentials1),
  // }).then((res) => {
  //   Map(credentials1).forEach((value, key) => {
  //     expect(res[key], 'to be', value);
  //   });
  // }));
});
