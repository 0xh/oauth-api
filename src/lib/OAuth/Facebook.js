import axios from 'axios';
import R from 'ramda';
import { UserError } from '@keboola/serverless-request-handler';
import OAuth20 from './OAuth20';

const fbApi = (url, params, method = 'get') => axios({
  method,
  url,
  headers: {
    Accept: 'application/json',
  },
  params,
})
  .then(res => res.data)
  .catch((err) => {
    console.log(err.response);
    throw UserError.error(`FB API error: ${err.response.data.error}`);
  });

class Facebook extends OAuth20 {
  getToken(callbackUrl, sessionData, query) {
    if (!R.hasIn('code', query)) {
      throw UserError.error("'code' not returned in query from the auth API!");
    }

    return fbApi(this.tokenUrl, {
      client_id: this.appKey,
      client_secret: this.appSecret,
      redirect_uri: callbackUrl,
      code: query.code,
    })
      .then((response) => {
        if (!R.has('expires_in', response)) {
          return Promise.resolve(response);
        }
        // exchange for long-lived access token
        return fbApi(this.tokenUrl, {
          client_id: this.appKey,
          client_secret: this.appSecret,
          grant_type: 'fb_exchange_token',
          fb_exchange_token: response.access_token,
        });
      });
  }
}

export default Facebook;
