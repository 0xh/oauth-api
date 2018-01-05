/**
 * Author: miro@keboola.com
 * Date: 30/11/2017
 */
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
        Authorization: this.getAuthorizationHeader(this.appKey, this.appSecret),
      },
      params: {
        grant_type: GRANT_TYPE,
        redirect_uri: callbackUrl,
        code: query.code,
      },
    });
  }

  getAuthorizationHeader(appKey, appSecret) {
    const authString = Buffer.from(`${appKey}:${appSecret}`).toString('base64');
    return `Basic ${authString}`;
  }
}

export default Quickbooks;
