/**
 * Author: miro@keboola.com
 * Date: 30/11/2017
 */

import axios from 'axios';
import FB from 'fb';
import qs from 'qs';
import R from 'ramda';
import { UserError } from '@keboola/serverless-request-handler';
import uuid from 'uuid';

const GRANT_TYPE = 'authorization_code';
const BASE_URL = 'https://www.facebook.com';

class Facebook {
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
    // permissions are stored in db under auth_url column
    const params = {
      client_id: this.appKey,
      // state: uuid.v4(),
      response_type: 'code',
      redirect_uri: callbackUrl,
      scope: this.authUrl
    };
    // graphVersion is stored in tokenUrl
    const graphVersion = this.tokenUrl;

    return { url: `${BASE_URL}/${graphVersion}/dialog/oauth?${qs.stringify(params)}` };
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
    });
  }
}

export default Facebook;
