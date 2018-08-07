'use strict';

import AWSSDK from 'aws-sdk';
import AWS from 'aws-sdk-mock';
import expect from 'unexpected';
import { List } from 'immutable';
import R from 'ramda';
import { UserError } from '@keboola/serverless-request-handler/src/index';
import Consumers from '../../src/app/Consumers';
import DynamoDB from '../../src/lib/DynamoDB';
import KbcApi from '../../src/lib/KbcApi';
import DynamoDBLocal from '../DynamoDBLocal';
import Encryption from '../../src/lib/Encryption';
import DockerRunnerApi from '../../src/lib/DockerRunnerApi';

AWS.setSDKInstance(AWSSDK);

const dynamoDb = DynamoDBLocal.getClient();
const consumersTable = DynamoDB.tableNames().consumers;
const headers = {
  'X-KBC-ManageApiToken': process.env.KBC_MANAGE_API_TOKEN,
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
};

const consumerFlawed = {
  friendly_name: 'Google Drive Writer',
  oauth_version: '2.0',
};

function insertConsumers() {
  const consumerList = List([consumer1, consumer2]).map(item => ({
    PutRequest: {
      Item: item,
    },
  })).toJS();

  return dynamoDb.batchWrite({
    RequestItems: {
      [consumersTable]: consumerList,
    },
  }).promise();
}

function getAllConsumers() {
  return dynamoDb.scan({ TableName: consumersTable }).promise();
}

function deleteConsumers() {
  return getAllConsumers()
    .then(res => R.map(item => ({
      DeleteRequest: {
        Key: {
          component_id: item.component_id,
        },
      },
    }), res.Items))
    .then((consumerList) => {
      if (R.isEmpty(consumerList)) {
        return Promise.resolve();
      }
      return dynamoDb.batchWrite({
        RequestItems: {
          [consumersTable]: consumerList,
        },
      }).promise();
    });
}

function getEncryption() {
  AWS.mock('KMS', 'encrypt', (params, callback) => callback(null, {
    CiphertextBlob: params.Plaintext,
  }));

  AWS.mock('KMS', 'decrypt', (params, callback) => callback(null, {
    Plaintext: params.CiphertextBlob,
  }));

  return new Encryption(new AWSSDK.KMS());
}

function getConsumersInstance() {
  return new Consumers(
    dynamoDb,
    new KbcApi(process.env.KBC_URL),
    getEncryption(),
    new DockerRunnerApi()
  );
}

describe('Consumers', () => {
  before(() => DynamoDBLocal.createTables());

  beforeEach(() => deleteConsumers());

  it('list', () => insertConsumers().then(() => getConsumersInstance().list({
    headers,
  }).then((res) => {
    expect(res, 'to have length', 2);
    expect(res, 'to have items satisfying', (item) => {
      expect(item, 'to have own properties', [
        'id',
        'friendly_name',
        'app_key',
        'oauth_version',
      ]);
    });
  })));

  it('list - empty', () => getConsumersInstance().list({
    headers,
  }).then((res) => {
    expect(res, 'to be empty');
  }));

  it('get', () => insertConsumers().then(() => getConsumersInstance().get({
    headers,
    pathParameters: {
      componentId: 'keboola.ex-google-drive',
    },
  }).then((res) => {
    expect(res, 'to have own properties', consumer2);
  })));

  it('get - not found', () => deleteConsumers().then(() => expect(
    getConsumersInstance().get({
      headers,
      pathParameters: {
        componentId: 'keboola.ex-google-drive',
      },
    }),
    'to be rejected with error satisfying',
    UserError.notFound('Consumer "keboola.ex-google-drive" not found')
  )));

  it('get - missing params', () => insertConsumers()
    .then(() => expect(
      getConsumersInstance().get({
        headers,
        pathParameters: { },
      }),
      'to be rejected with error satisfying',
      UserError.badRequest('Missing "componentId" url parameter')
    )));

  it('add', () => getConsumersInstance().add({
    headers,
    body: JSON.stringify(consumer1),
  }).then((res) => {
    expect(res, 'to have own properties', {
      status: 'created',
      component_id: consumer1.component_id,
    });
  }));

  it('add - invalid body', () => expect(
    getConsumersInstance().add({
      headers,
      body: JSON.stringify(consumerFlawed),
    }),
    'to be rejected with error satisfying',
    UserError.unprocessable('"component_id" is required')
  ));

  it('patch', () => insertConsumers()
    .then(() => getConsumersInstance().patch({
      headers,
      pathParameters: {
        componentId: 'keboola.ex-google-drive',
      },
      body: JSON.stringify({
        auth_url: 'some other url',
      }),
    }))
    .then((res) => {
      expect(res, 'to have own properties', {
        auth_url: 'some other url',
        app_key: 'test',
        oauth_version: '2.0',
        friendly_name: 'Google Drive Extractor',
        token_url: 'some other url',
        request_token_url: 'another url what?',
        app_secret: 'fsfsg',
        component_id: 'keboola.ex-google-drive',
      });
    }));

  it('delete', () => insertConsumers()
    .then(() => getConsumersInstance().delete({
      headers,
      pathParameters: {
        componentId: 'keboola.ex-google-drive',
      },
    }))
    .then(() => expect(
      getConsumersInstance().get({
        headers,
        pathParameters: {
          componentId: 'keboola.ex-google-drive',
        },
      }),
      'to be rejected with error satisfying',
      UserError.notFound('Consumer "keboola.ex-google-drive" not found')
    )));
});
