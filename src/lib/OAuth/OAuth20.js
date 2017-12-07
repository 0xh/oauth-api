/**
 * Author: miro@keboola.com
 * Date: 27/11/2017
 */
import { UserError } from '@keboola/serverless-request-handler';
import axios from 'axios';
import R from 'ramda';

const GRANT_TYPE = 'authorization_code';

class OAuth20 {
  /**
   * @param {Object} config
   *  - authUrl: {String} Authentication endpoint
   *  - tokenUrl: {String} Token endpoint
   *  - appKey: {String} OAuth client ID
   *  - appSecret: {String} OAuth client secret
   */
  constructor(config) {
    this.authUrl = config.auth_url;
    this.tokenUrl = config.token_url;
    this.appKey = config.app_key;
    this.appSecret = config.app_secret;
  }

  getRedirectData(callbackUrl) {
    // %%client_id%% is deprecated and replaced by %%app_key%%
    return {
      url: this.authUrl
        .replace('%%redirect_uri%%', callbackUrl)
        .replace('%%client_id%%', this.appKey)
        .replace('%%app_key%%', this.appKey),
    };
  }

  getToken(callbackUrl, sessionData, query) {
    if (!R.hasIn('code', query)) {
      throw UserError.error("'code' not returned in query from the auth API!");
    }

    return axios({
      method: 'post',
      url: this.tokenUrl,
      headers: {
        'Content-type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      params: {
        client_id: this.appKey,
        client_secret: this.appSecret,
        grant_type: GRANT_TYPE,
        redirect_uri: callbackUrl,
        code: query.code,
      },
    }).then(res => res.data).catch((err) => {
      console.log({
        callbackUrl: callbackUrl,
        tokenUrl: this.tokenUrl,
        queryCode: query.code,
        clientId: this.appKey
      });
      console.log(err.response);
      throw err;
    });
  }
}

export default OAuth20;
