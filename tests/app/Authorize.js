/**
 * Author: miro@keboola.com
 * Date: 27/11/2017
 */

'use strict';

import expect from 'unexpected';
import sinon from 'sinon';
import AWS from 'aws-sdk';
import Authorize from '../../src/app/Authorize';
import DynamoDB from '../../src/lib/DynamoDB';
import OAuth20 from '../../src/lib/OAuth/OAuth20';
import Encryption from '../../src/lib/Encryption';
import KbcApi from '../../src/lib/KbcApi';
import DockerRunnerApi from '../../src/lib/DockerRunnerApi';
import R from 'ramda';

const dynamoDb = DynamoDB.getClient();

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
    TableName: 'consumers',
    Item: consumer1,
  }).promise();
}

function deleteConsumer() {
  const params = {
    TableName: 'consumers',
    Key: {
      component_id: 'keboola.ex-google-analytics',
    },
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


describe('Authorize', () => {
  const encryption = new Encryption(new AWS.KMS());
  const authorize = new Authorize(dynamoDb, encryption, new KbcApi(), new DockerRunnerApi());

  before(() => {
    sinon.stub(OAuth20.prototype, 'getToken').returns(
      Promise.resolve({
        refresh_token: 1234,
        access_token: 5678,
      })
    );
  });

  beforeEach(() => deleteConsumer());

  it('init', () => insertConsumer()
    .then(() => authorize.init(eventInit))
    .then((res) => {
      expect(res, 'to have property', 'url', 'https://accounts.google.com/o/oauth2/v2/auth?response_type=code&redirect_uri=https://0.0.0.0:3000/authorize/keboola.ex-google-drive/callback&client_id=test&access_type=offline&prompt=consent&scope=https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets.readonly');
    })
  );

  it('callback', () => insertConsumer()
    .then(() => encryption.encrypt(process.env.KBC_STORAGE_API_TOKEN))
    .then(encryptedToken => authorize.callback(eventCallback, {
      id: '12345',
      token: encryptedToken,
      authorizedFor: 'miro',
    }))
    .then((res) => {
      expect(res, 'to have properties', {
        id: '12345',
        component_id: 'keboola.ex-google-analytics',
        project_id: 219,
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
    .then(() => authorize.callback(eventCallback, {
      returnData: true
    }))
    .then((res) => {
      expect(res, 'to have properties', { refresh_token: 1234, access_token: 5678 });
    })
  );
});

