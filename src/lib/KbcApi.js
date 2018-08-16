'use strict';

import axios from 'axios';
import axiosRetry from 'axios-retry';
import R from 'ramda';
import { UserError } from '@keboola/serverless-request-handler';
import DockerRunnerApi from './DockerRunnerApi';

axiosRetry(axios, { retries: 5 });

const getHeader = (name, event) => {
  const headerInverted = R.invertObj(event.headers);
  const headers = R.invertObj(R.map(item => R.toLower(item), headerInverted));
  return R.prop(R.toLower(name), headers);
};

class KbcApi {
  constructor(baseUri = null) {
    this.baseUri = baseUri !== null ? baseUri : `${process.env.KBC_URL}`;
    if (!this.baseUri) {
      throw UserError.error('KBC url must be set');
    }
  }

  static getStorageToken(event) {
    const token = getHeader('X-StorageApi-Token', event);
    if (!token) {
      throw UserError.unauthorized('Storage API token is missing');
    }
    return token;
  }

  static getManageToken(event) {
    const token = getHeader('X-KBC-ManageApiToken', event);
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
        if (err.response.status === 401) {
          throw UserError.unauthorized('Invalid access token');
        }
        const errorMessage = err.response.data ? err.response.data : err.message;
        const code = R.propOr(null, 'status', err);
        throw UserError.error(errorMessage, code);
      })
      .then((res) => {
        if (!R.has('owner', res.data)) {
          throw UserError.badRequest('Token verification is missing owner field');
        }
        if (!R.has('id', res.data.owner)) {
          throw UserError.badRequest('Token verification is missing owner.id field');
        }
        if (!R.has('description', res.data)) {
          throw UserError.badRequest('Token verification is missing description field');
        }
        return {
          token,
          project: res.data.owner.id,
          id: res.data.id,
          name: res.data.description,
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
        if (err.response.status === 401) {
          throw UserError.unauthorized('Invalid access token');
        }
        const errorMessage = err.response.data ? err.response.data : err.message;
        const code = R.propOr(null, 'status', err);
        throw UserError.error(errorMessage, code);
      })
      .then((res) => {
        if (!R.has('scopes', res.data)) {
          throw UserError.badRequest('Token verification is missing owner scopes');
        }
        if (!R.contains('oauth:manage', res.data.scopes)) {
          throw UserError.unauthorized('Invalid access token');
        }
        return {
          token,
          project: -1,
          id: res.data.id,
          name: res.data.description,
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
        if (!R.has('id', res.data)) {
          throw UserError.badRequest('Unique id generation is missing id field');
        }
        return parseInt(res.data.id, 10);
      });
  }

  getServiceUrl(token, serviceName) {
    return axios({
      method: 'get',
      url: `${this.baseUri}/v2/storage`,
      headers: { 'X-StorageApi-Token': token },
    })
      .then((res) => {
        const service = R.find(R.propEq('id', serviceName))(res.data.services);
        if (R.isNil(service)) {
          throw UserError.badRequest(`${serviceName} doesn't exist in KBC`);
        }
        return service;
      });
  }

  getDockerRunner(token) {
    return this.getServiceUrl(token, 'docker-runner').then(service => new DockerRunnerApi(service.url));
  }
}

export default KbcApi;
