'use strict';

import axios from 'axios';
import R from 'ramda';
import { UserError } from '@keboola/serverless-request-handler';
import OAuth20 from './OAuth20';

const GRANT_TYPE = 'authorization_code';

class Quickbooks extends OAuth20 {
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
        Authorization: this.getAuthorizationHeader(),
      },
      params: {
        grant_type: GRANT_TYPE,
        redirect_uri: callbackUrl,
        code: query.code,
      },
    });
  }

  getAuthorizationHeader() {
    const authString = Buffer.from(`${this.appKey}:${this.appSecret}`).toString('base64');
    return `Basic ${authString}`;
  }
}

export default Quickbooks;
