'use strict';

import expect from 'unexpected';
import OAuth10 from '../../../src/lib/OAuth/OAuth10';

describe('OAuth 1.0', () => {
  const oauth10 = new OAuth10({
    auth_url: 'https://api.twitter.com/oauth/authorize?oauth_token=%%oauth_token%%',
    token_url: 'https://api.twitter.com/oauth/access_token',
    request_token_url: 'https://api.twitter.com/oauth/request_token',
    app_key: process.env.TW_APP_KEY,
    app_secret: process.env.TW_APP_SECRET,
  });

  it('get redirect data', () => {
    const callbackUrl = `${process.env.REDIRECT_URI_BASE}/authorize/keboola.ex-twitter/callback`;
    return oauth10.getRedirectData(callbackUrl).then((res) => {
      expect(res.url, 'not to be empty');
      expect(res.sessionData, 'not to be empty');
      const { sessionData, url } = res;
      expect(sessionData, 'to have properties', ['oauth_token', 'oauth_token_secret']);
      const token = sessionData.oauth_token;
      expect(url, 'to be', `https://api.twitter.com/oauth/authorize?oauth_token=${token}`);
    });
  });
});
