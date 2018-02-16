'use strict';

import axios from 'axios';
import axiosRetry from 'axios-retry';
import { UserError } from '@keboola/serverless-request-handler';

const _ = require('lodash');

axiosRetry(axios, { retries: 5 });

class KbcApi {
  constructor(baseUri = null) {
    this.baseUri = baseUri !== null ? baseUri : `${process.env.KBC_URL}/docker`;
  }

  static getStorageToken(event) {
    const token = _.find(event.headers, (header, index) => _.toLower(index) === 'x-storageapi-token');
    if (!token) {
      throw UserError.unauthorized('Storage API token is missing');
    }
    return token;
  }

  static getManageToken(event) {
    const token = _.find(event.headers, (header, index) => _.toLower(index) === 'x-kbc-manageapitoken');
    if (!token) {
      throw UserError.unauthorized('Manage API token is missing');
    }
    return token;
  }

  auth(event) {
    try {
      return this.authManageToken(event);
    } catch (err) {
      return this.authStorageToken(event);
    }
  }

  authStorageToken(event) {
    const token = KbcApi.getStorageToken(event);
    return this.authStorage(token);
  }

  authManageToken(event) {
    const token = KbcApi.getManageToken(event);
    return this.authManage(token);
  }

  authStorage(token) {
    return axios({
      method: 'get',
      url: `${this.baseUri}/v2/storage/tokens/verify`,
      headers: { 'X-StorageApi-Token': token },
    })
      .catch((err) => {
        if (_.get(err, 'response.status', null) === 401) {
          throw UserError.unauthorized('Invalid access token');
        }
        throw UserError.error(_.get(err.response, 'data.error', err.msg), _.get(err, 'response.status', null));
      })
      .then((res) => {
        if (!_.has(res.data, 'owner')) {
          throw UserError.badRequest('Token verification is missing owner field');
        }
        if (!_.has(res.data.owner, 'id')) {
          throw UserError.badRequest('Token verification is missing owner.id field');
        }
        if (!_.has(res.data, 'description')) {
          throw UserError.badRequest('Token verification is missing description field');
        }
        return {
          token,
          project: res.data.owner.id,
          id: res.data.id,
          name: res.data.description,
          admin: _.has(res, 'data.admin.id') ? res.data.admin.id : null,
          adminName: _.has(res, 'data.admin.name') ? res.data.admin.name : null,
          adminSSO: _.has(res, 'data.admin.features') && _.includes(res.data.admin.features, 'wrgd-sso-admin'),
          limits: {
            demoTokenEnabled: _.get(res.data.owner, ['limits', 'goodData.demoTokenEnabled', 'value'], 0) === 1,
            prodTokenEnabled: _.get(res.data.owner, ['limits', 'goodData.prodTokenEnabled', 'value'], 0) === 1,
          },
        };
      });
  }

  authManage(token) {
    return axios({
      method: 'get',
      url: `${this.baseUri}/manage/tokens/verify`,
      headers: { 'X-KBC-ManageApiToken': token },
    })
      .catch((err) => {
        if (_.get(err, 'response.status', null) === 401) {
          throw UserError.unauthorized('Invalid access token');
        }
        throw UserError.error(_.get(err.response, 'data.error', err.msg), _.get(err, 'response.status', null));
      })
      .then((res) => {
        if (!_.has(res.data, 'scopes')) {
          throw UserError.badRequest('Token verification is missing owner scopes');
        }
        // if (!_.includes(res.data.scopes, 'gd-provisioning:manage')) {
        //   throw UserError.unauthorized('Invalid access token');
        // }
        return {
          token,
          project: -1,
          id: res.data.id,
          name: res.data.description,
          admin: null,
          adminName: null,
          adminSSO: false,
          limits: {},
        };
      });
  }

  generateId(token) {
    return axios({
      method: 'post',
      url: `${this.baseUri}/v2/storage/tickets`,
      headers: { 'X-StorageApi-Token': token },
    })
      .then((res) => {
        if (!_.has(res.data, 'id')) {
          throw UserError.badRequest('Unique id generation is missing id field');
        }
        return _.toInteger(res.data.id);
      });
  }
}

export default KbcApi;
