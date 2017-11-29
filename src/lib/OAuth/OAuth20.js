/**
 * Author: miro@keboola.com
 * Date: 27/11/2017
 */
const R = require('ramda');
import {UserError} from '@keboola/serverless-request-handler';
import axios from 'axios';

const GRANT_TYPE = 'authorization_code';

class OAuth20 {

  /**
   * @param {Object} config
   *  - authUrl: {String} Authentication endpoint with placeholders (i.e. %%app_key%%, %%redirect_uri%%)
   *  - tokenUrl: {String} Token endpoint
   *  - appKey: {String} OAuth client ID
   *  - appSecret: {String} OAuth client secret
   */
  constructor(config) {
    this.authUrl = config.auth_url;
    this.tokenUrl = config.token_url;
    this.appKey = config.app_key;
    this.appSecret = config.app_secret;

    console.log(this.tokenUrl);
  }

  getRedirectData(callbackUrl) {
    // %%client_id%% is deprecated and replaced by %%app_key%%
    return {
      url: this.authUrl
        .replace('%%redirect_uri%%', callbackUrl)
        .replace('%%client_id%%', this.appKey)
        .replace('%%app_key%%', this.appKey)
    }
  }

  getToken(callbackUrl, sessionData, query) {
    console.log(query);
    if (!R.hasIn('code', query)) {
      throw UserError.error("'code' not returned in query from the auth API!");
    }

    return axios({
        method: 'post',
        url: this.tokenUrl,
        headers: {
          'Content-type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        params: {
          client_id: this.appKey,
          client_secret: this.appSecret,
          grant_type: GRANT_TYPE,
          redirect_uri: callbackUrl,
          code: query.code
        }
      })
      .then((res) => {
        console.log(res);
      }).catch((err) => {
        console.log(err);
      });
  }
}

export default OAuth20;
