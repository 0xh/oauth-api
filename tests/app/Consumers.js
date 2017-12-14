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
import R from "ramda";
import {UserError} from "@keboola/serverless-request-handler/src/index";

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
      consumers: consumerList,
    },
  }).promise();
}

function deleteConsumers() {
  const consumerList = R.map(item => ({
    DeleteRequest: {
      Key: {
        component_id: item.component_id,
      },
    },
  }), [consumer1, consumer2]);

  return dynamoDb.batchWrite({
    RequestItems: {
      consumers: consumerList,
    },
  }).promise();
}

describe('Consumers', () => {
  const consumers = new Consumers(dynamoDb, new KbcApi());

  beforeEach(() => deleteConsumers());

  it('list', () => insertConsumers().then(() => consumers.list({
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

  it('list - empty', () => consumers.list({
    headers,
  }).then((res) => {
    expect(res, 'to be empty');
  }));

  it('get', () => insertConsumers().then(() => consumers.get({
    headers,
    pathParameters: {
      componentId: 'keboola.ex-google-drive',
    },
  }).then((res) => {
    expect(res, 'to have own properties', consumer2);
  })));

  it('get - not found', () => deleteConsumers().then(() => expect(
    consumers.get({
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
      consumers.get({
        headers,
        pathParameters: { },
      }),
      'to be rejected with error satisfying',
      UserError.badRequest('Missing "componentId" url parameter')
    ))
  );

  it('add', () => consumers.add({
    headers,
    body: JSON.stringify(consumer1),
  }).then((res) => {
    expect(res, 'to have own properties', consumer1);
  }));

  it('add - invalid body', () => expect(
      consumers.add({
        headers,
        body: JSON.stringify(consumerFlawed)
      }),
      'to be rejected with error satisfying',
      UserError.unprocessable('child "component_id" fails because ["component_id" is required]')
    )
  );

  it('patch', () => insertConsumers()
    .then(() => consumers.patch({
      headers,
      pathParameters: {
        componentId: 'keboola.ex-google-drive',
      },
      body: JSON.stringify({
        auth_url: 'some other url',
      })
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
        component_id: 'keboola.ex-google-drive'
      });
    })
  );
});
