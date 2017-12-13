/**
 * Author: miro@keboola.com
 * Date: 22/11/2017
 */


'use strict';

import expect from 'unexpected';
import R from 'ramda';
import { UserError } from '@keboola/serverless-request-handler';
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
  name: '12',
  component_id: 'keboola.ex-google-analytics',
  project_id: '219',
  creator: JSON.stringify({
    id: '789',
    description: 'miro',
  }),
  data: 'encrypted data',
  authorized_for: 'me',
  created: Date.now(),
};

const credentials2 = {
  id: '1',
  name: '13',
  component_id: 'keboola.ex-google-drive',
  project_id: '219',
  creator: JSON.stringify({
    id: '789',
    description: 'miro',
  }),
  data: 'encrypted data',
  authorized_for: 'me',
  created: Date.now(),
};

const credentials3 = {
  id: '2',
  name: '14',
  component_id: 'keboola.ex-google-drive',
  project_id: '123',
  creator: JSON.stringify({
    id: '789',
    description: 'miro',
  }),
  data: 'encrypted data',
  authorized_for: 'me',
  created: Date.now(),
};

const credentials4 = {
  id: '3',
  name: '15',
  component_id: 'keboola.ex-google-analytics',
  project_id: '219',
  creator: JSON.stringify({
    id: '789',
    description: 'miro',
  }),
  data: 'encrypted data',
  authorized_for: 'me',
  created: Date.now(),
};

function prepareData() {
  const consumerList = R.map(item => ({
    PutRequest: { Item: item },
  }), [consumer1, consumer2]);

  const credentialsList = R.map(item => ({
    PutRequest: { Item: item },
  }), [credentials1, credentials2, credentials3, credentials4]);

  return dynamoDb.batchWrite({
    RequestItems: {
      consumers: consumerList,
      credentials: credentialsList,
    },
  }).promise();
}

function prepareConsumers() {
  const consumerList = R.map(item => ({
    PutRequest: { Item: item },
  }), [consumer1, consumer2]);

  return dynamoDb.batchWrite({
    RequestItems: {
      consumers: consumerList,
    },
  }).promise();
}

function clearData() {
  const consumerList = R.map(item => ({
    DeleteRequest: {
      Key: {
        component_id: item.component_id,
      },
    },
  }), [consumer1, consumer2]);

  return dynamoDb.scan({
    TableName: 'credentials',
  }).promise().then((res) => {
    const credentialsList = R.map(item => ({
      DeleteRequest: {
        Key: {
          id: item.id,
        },
      },
    }), res.Items);

    const params = { RequestItems: {} };
    if (!R.isEmpty(consumerList)) {
      params.RequestItems.consumers = consumerList;
    }

    if (!R.isEmpty(credentialsList)) {
      params.RequestItems.credentials = credentialsList;
    }

    return dynamoDb.batchWrite(params).promise();
  });
}

describe('Credentials', () => {
  const credentials = new Credentials(dynamoDb, new KbcApi());

  beforeEach(() => clearData());

  it('list', () => prepareData().then(() => credentials.list({
    headers,
    pathParameters: {
      componentId: 'keboola.ex-google-analytics',
    },
  }).then((res) => {
    expect(res, 'to have length', 2);
    expect(res, 'to have items satisfying', (item) => {
      expect(item, 'to have own properties', [
        'id',
        'authorizedFor',
        'creator',
        'created',
      ]);
      expect(item, 'to have properties', {
        creator: {
          id: '789',
          description: 'miro',
        },
        authorizedFor: 'me',
      });
    });
  })));

  it('list - empty', () => credentials.list({
    headers,
    pathParameters: {
      componentId: 'keboola.ex-google-analytics',
    },
  }).then((res) => {
    expect(res, 'to be empty');
  }));

  it('get - success', () => prepareData().then(() => credentials.get({
    headers,
    pathParameters: {
      componentId: 'keboola.ex-google-drive',
      name: '13',
    },
  }).then((res) => {
    expect(res, 'to have own properties', [
      'id',
      'authorizedFor',
      'creator',
      'created',
      '#data',
      'oauthVersion',
      'appKey',
      '#appSecret',
    ]);
  })));

  it('get - not found', () => prepareData().then(() => expect(
    credentials.get({
      headers,
      pathParameters: {
        componentId: 'keboola.ex-google-drive',
        name: '14',
      },
    }),
    'to be rejected with error satisfying',
    UserError.notFound('Credentials not found')
  )));

  it('get - missing params', () => prepareData()
    .then(() => expect(
      credentials.get({
        headers,
        pathParameters: {
          componentId: 'keboola.ex-google-drive',
        },
      }),
      'to be rejected with error satisfying',
      UserError.badRequest('Missing "id" url parameter')
    ))
  );

  it('add', () => prepareConsumers()
    .then(() => credentials.add({
      headers,
      pathParameters: {
        componentId: 'keboola.ex-google-drive',
      },
      body: JSON.stringify({
        id: 'something',
        authorizedFor: 'miro',
        data: {
          access_token: 'abcdefg',
          refresh_token: 'hijklmnop',
        },
      }),
    }))
    .then((res) => {
      expect(res, 'to have own properties', [
        'id',
        'authorizedFor',
        'creator',
        'created',
        '#data',
        'oauthVersion',
        'appKey',
        '#appSecret',
      ]);
    })
  );
});
