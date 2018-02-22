'use strict';

import AWSSDK from 'aws-sdk';
import AWS from 'aws-sdk-mock';
import expect from 'unexpected';
import sinon from 'sinon';
import R from 'ramda';
import Authorize from '../../src/app/Authorize';
import DynamoDB from '../../src/lib/DynamoDB';
import OAuth20 from '../../src/lib/OAuth/OAuth20';
import Encryption from '../../src/lib/Encryption';
import KbcApi from '../../src/lib/KbcApi';
import DockerRunnerApi from '../../src/lib/DockerRunnerApi';
import DynamoDBLocal from '../DynamoDBLocal';

AWS.setSDKInstance(AWSSDK);

const dynamoDb = DynamoDB.getClient({
  region: 'eu-central-1',
  endpoint: 'http://dynamodb:8000',
});

const credentialsTable = DynamoDB.tableNames().credentials;
const consumersTable = DynamoDB.tableNames().consumers;

const consumer1 = {
  component_id: 'keboola.ex-google-analytics',
  auth_url: 'https://accounts.google.com/o/oauth2/v2/auth?response_type=code&redirect_uri=%%redirect_uri%%&client_id=%%client_id%%&access_type=offline&prompt=consent&scope=https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets.readonly',
  token_url: 'https://www.googleapis.com/oauth2/v4/token',
  app_key: 'test',
  app_secret: 'fsfsg',
  friendly_name: 'Google Analytics Extractor',
  oauth_version: '2.0',
};

function insertConsumer() {
  return dynamoDb.put({
    TableName: consumersTable,
    Item: consumer1,
  }).promise();
}

function deleteConsumer() {
  const params = {
    TableName: consumersTable,
    Key: {
      component_id: 'keboola.ex-google-analytics',
    },
  };

  return dynamoDb.delete(params).promise().then(res => res);
}

function deleteCredentials() {
  return dynamoDb.scan({
    TableName: credentialsTable,
  }).promise().then((res) => {
    const credentialsList = R.map(item => ({
      DeleteRequest: {
        Key: {
          id: item.id,
        },
      },
    }), res.Items);

    const params = { RequestItems: {} };
    if (!R.isEmpty(credentialsList)) {
      params.RequestItems[credentialsTable] = credentialsList;
    }

    return dynamoDb.batchWrite(params).promise();
  });
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
  body: null,
};

const eventCallback = {
  headers: {
    'Content-Type': 'application/json',
    Host: 'google.com',
  },
  path: '/authorize/keboola.ex-google-drive/callback',
  pathParameters: { componentId: 'keboola.ex-google-analytics' },
  resource: '/authorize/{componentId}/callback',
  httpMethod: 'GET',
  queryStringParameters: { code: '1234' },
  body: null,
};

function getEncryption() {
  AWS.mock('KMS', 'encrypt', (params, callback) => callback(null, {
    CiphertextBlob: params.Plaintext,
  }));

  AWS.mock('KMS', 'decrypt', (params, callback) => callback(null, {
    Plaintext: params.CiphertextBlob,
  }));

  return new Encryption(new AWSSDK.KMS());
}

function getAuthorize() {
  return new Authorize(
    dynamoDb,
    getEncryption(),
    new KbcApi(process.env.KBC_URL),
    new DockerRunnerApi()
  );
}

describe('Authorize', () => {
  before(() => DynamoDBLocal.createTables().then(() => {
    sinon.stub(OAuth20.prototype, 'getToken').returns(
      Promise.resolve({
        refresh_token: 1234,
        access_token: 5678,
      })
    );
  }));

  beforeEach(() => deleteConsumer());

  it('init', () => insertConsumer()
    .then(() => getAuthorize().init(eventInit))
    .then((res) => {
      expect(res, 'to have property', 'url', `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&redirect_uri=${process.env.REDIRECT_URI_BASE}/authorize/keboola.ex-google-drive/callback&client_id=test&access_type=offline&prompt=consent&scope=https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets.readonly`);
    })
  );

  it('callback', () => insertConsumer()
    .then(() => getEncryption().encrypt(process.env.KBC_STORAGE_API_TOKEN))
    .then(encryptedToken => getAuthorize().callback(eventCallback, {
      id: '12345',
      token: encryptedToken,
      authorizedFor: 'miro',
    }))
    .then((res) => {
      expect(res, 'to have properties', {
        name: '12345',
        component_id: 'keboola.ex-google-analytics',
        project_id: '219',
        authorized_for: 'miro',
        auth_url: null,
        token_url: null,
        request_token_url: null,
        app_key: null,
        app_secret: null,
      });
      expect(res, 'to have properties', ['creator', 'data', 'app_docker_secret']);
    })
  );

  it('callback browser', () => insertConsumer()
    .then(() => getAuthorize().callback(eventCallback, {
      returnData: true,
    }))
    .then((res) => {
      expect(res, 'to have properties', { refresh_token: 1234, access_token: 5678 });
    })
  );

  it('save credentials', () => insertConsumer()
    .then(() => deleteCredentials())
    .then(() => getEncryption().encrypt(process.env.KBC_STORAGE_API_TOKEN))
    .then(encryptedToken => getAuthorize().saveCredentials(
      {
        access_token: 'secretToken6789',
      },
      'keboola.ex-google-analytics',
      {
        id: '56789',
        token: encryptedToken,
        authorizedFor: 'miro',
      }
    ))
    .then((res) => {
      expect(res, 'to have properties', {
        name: '56789',
        component_id: 'keboola.ex-google-analytics',
        project_id: '219',
        authorized_for: 'miro',
        auth_url: null,
        token_url: null,
        request_token_url: null,
        app_key: null,
        app_secret: null,
      });
    })
    .then(() => dynamoDb.scan({
      TableName: credentialsTable,
      FilterExpression: '#cred_name = :name AND component_id = :component_id AND project_id = :project_id',
      ExpressionAttributeNames: {
        '#cred_name': 'name',
      },
      ExpressionAttributeValues: {
        ':name': '56789',
        ':component_id': 'keboola.ex-google-analytics',
        ':project_id': '219',
      },
    }).promise())
    .then((res) => {
      const credentials = res.Items[0];
      expect(res.Count, 'to be', 1);
      expect(credentials, 'to have properties', {
        name: '56789',
        component_id: 'keboola.ex-google-analytics',
        project_id: '219',
        authorized_for: 'miro',
        auth_url: null,
        token_url: null,
        request_token_url: null,
        app_key: null,
        app_secret: null,
      });
    })
  );

  after(() => AWS.restore());
});

