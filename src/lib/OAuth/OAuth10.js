import { UserError } from '@keboola/serverless-request-handler';
import OAuth from 'oauth';
import R from 'ramda';

class OAuth10 {
  /**
   * @param {Object} config
   *  - authUrl: {String} Authentication endpoint
   *  - tokenUrl: {String} Token endpoint
   *  - appKey: {String} OAuth client ID
   *  - appSecret: {String} OAuth client secret
   *  - requestTokenUrl: {String} Request token endpoint
   */
  constructor(config) {
    this.authUrl = config.auth_url;
    this.tokenUrl = config.token_url;
    this.appKey = config.app_key;
    this.appSecret = config.app_secret;
    this.requestTokenUrl = config.request_token_url;
  }

  getClient(callbackUrl) {
    return new OAuth.OAuth(
      this.requestTokenUrl,
      this.tokenUrl,
      this.appKey,
      this.appSecret,
      '1.0',
      callbackUrl,
      'HMAC-SHA1');
  }

  getRedirectData(callbackUrl) {
    return this.getRequestToken(callbackUrl)
      .then(res => ({
        url: this.authUrl.replace('%%oauth_token%%', res.oauth_token),
        sessionData: res,
      }));
  }

  getToken(callbackUrl, sessionData, query) {
    return this.getAccessToken(callbackUrl, sessionData, query);
  }

  getRequestToken(callbackUrl, extraParams) {
    return new Promise(((resolve, reject) => {
      this.getClient(callbackUrl).getOAuthRequestToken(
        extraParams || {},
        (err, oauthToken, oauthTokenSecret, parsedQueryString) => {
          if (err) {
            return reject(err);
          }
          return resolve({
            oauth_token: oauthToken,
            oauth_token_secret: oauthTokenSecret,
            query: parsedQueryString,
          });
        }
      );
    }));
  }

  getAccessToken(callbackUrl, sessionData, query) {
    if (!R.hasIn('oauth_verifier', query)) {
      throw UserError.error("'oauth_verifier' not returned in query from the auth API!");
    }

    return new Promise(((resolve, reject) => {
      this.getClient(callbackUrl).getOAuthAccessToken(
        sessionData.oauth_token,
        sessionData.oauth_token_secret,
        query.oauth_verifier,
        (err, oauthAccessToken, oauthAccessTokenSecret) => {
          if (err) {
            return reject(err);
          }
          return resolve({
            oauth_token: oauthAccessToken,
            oauth_token_secret: oauthAccessTokenSecret,
          });
        }
      );
    }));
  }
}

export default OAuth10;
