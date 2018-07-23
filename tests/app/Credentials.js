'use strict';

import expect from 'unexpected';
import R from 'ramda';
import { UserError } from '@keboola/serverless-request-handler';
import DynamoDB from '../../src/lib/DynamoDB';
import KbcApi from '../../src/lib/KbcApi';
import Credentials from '../../src/app/Credentials';
import DockerRunnerApi from '../../src/lib/DockerRunnerApi';
import DynamoDBLocal from '../DynamoDBLocal';

const dynamoDb = DynamoDBLocal.getClient();
const credentialsTable = DynamoDB.tableNames().credentials;
const consumersTable = DynamoDB.tableNames().consumers;
const headers = {
  'X-StorageApi-Token': process.env.KBC_STORAGE_API_TOKEN,
};

const projectIdFromToken = () => R.head(R.split('-', process.env.KBC_STORAGE_API_TOKEN));

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
};

const credentials1 = {
  id: '0',
  name: '12',
  component_id: 'keboola.ex-google-analytics',
  project_id: projectIdFromToken(),
  creator: {
    id: '789',
    description: 'miro',
  },
  data: 'encrypted data',
  authorized_for: 'me',
  created: Date.now(),
};

const credentials2 = {
  id: '1',
  name: '13',
  component_id: 'keboola.ex-google-drive',
  project_id: projectIdFromToken(),
  creator: {
    id: '789',
    description: 'miro',
  },
  data: 'encrypted data',
  authorized_for: 'me',
  created: Date.now(),
};

const credentials3 = {
  id: '2',
  name: '14',
  component_id: 'keboola.ex-google-drive',
  project_id: 'non_existent',
  creator: {
    id: '789',
    description: 'miro',
  },
  data: 'encrypted data',
  authorized_for: 'me',
  created: Date.now(),
};

const credentials4 = {
  id: '3',
  name: '15',
  component_id: 'keboola.ex-google-analytics',
  project_id: projectIdFromToken(),
  creator: {
    id: '789',
    description: 'miro',
  },
  data: 'encrypted data',
  authorized_for: 'me',
  created: Date.now(),
};

function clearData() {
  return DynamoDBLocal.truncateTable(credentialsTable, 'id')
    .then(() => DynamoDBLocal.truncateTable(consumersTable, 'component_id'));
}

function prepareData() {
  const consumerList = R.map(item => ({
    PutRequest: { Item: item },
  }), [consumer1, consumer2]);

  const credentialsList = R.map(item => ({
    PutRequest: { Item: item },
  }), [credentials1, credentials2, credentials3, credentials4]);

  return dynamoDb.batchWrite({
    RequestItems: {
      [consumersTable]: consumerList,
      [credentialsTable]: credentialsList,
    },
  }).promise();
}

function prepareConsumers() {
  const consumerList = R.map(item => ({
    PutRequest: { Item: item },
  }), [consumer1, consumer2]);

  return dynamoDb.batchWrite({
    RequestItems: {
      [consumersTable]: consumerList,
    },
  }).promise();
}

describe('Credentials', () => {
  const credentials = new Credentials(dynamoDb, new KbcApi(), new DockerRunnerApi());

  before(() => DynamoDBLocal.createTables());

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

  it('get', () => prepareData().then(() => credentials.get({
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
      UserError.badRequest('Missing \'id\' url parameter')
    )));

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
    }));

  it('delete', () => clearData()
    .then(() => prepareData())
    .then(() => credentials.delete({
      headers,
      pathParameters: {
        componentId: 'keboola.ex-google-drive',
        name: '13',
      },
    }))
    .then(() => credentials.list({
      headers,
      pathParameters: {
        componentId: 'keboola.ex-google-drive',
      },
    })
      .then((res) => {
        expect(res, 'to have length', 0);
      })));
});
