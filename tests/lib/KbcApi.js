'use strict';

import expect from 'unexpected';
import KbcApi from '../../src/lib/KbcApi';

const eventInit = {
  headers: {
    'Content-Type': 'application/json',
    Host: '0.0.0.0:3000',
    'X-StorageApi-Token': process.env.KBC_STORAGE_API_TOKEN,
    'X-KBC-ManageApiToken': process.env.KBC_MANAGE_API_TOKEN,
  },
  path: '/authorize/keboola.ex-google-drive',
  pathParameters: { componentId: 'keboola.ex-google-analytics' },
  resource: '/authorize/{componentId}',
  httpMethod: 'POST',
  queryStringParameters: null,
  body: null,
};

describe('KBC API', () => {
  const kbc = new KbcApi(process.env.KBC_URL);

  it('get storage token from event', () => {
    const token = KbcApi.getStorageToken(eventInit);
    expect(token, 'to be', process.env.KBC_STORAGE_API_TOKEN);
  });

  it('get manage token from event', () => {
    const token = KbcApi.getManageToken(eventInit);
    expect(token, 'to be', process.env.KBC_MANAGE_API_TOKEN);
  });

  it('auth storage', () => kbc.authStorage(process.env.KBC_STORAGE_API_TOKEN).then((res) => {
    expect(res, 'to have properties', ['token', 'project', 'id', 'name']);
  }));

  it('auth manage', () => kbc.authManage(process.env.KBC_MANAGE_API_TOKEN).then((res) => {
    expect(res, 'to have properties', ['token', 'project', 'id', 'name']);
  }));
});
