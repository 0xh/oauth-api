'use strict';

import expect from 'unexpected';
import Facebook from '../../../src/lib/OAuth/Facebook';

describe('Facebook', () => {
  const facebook = new Facebook({
    auth_url: 'manage_pages,public_profile,read_insights,pages_show_list',
    token_url: 'v2.8',
    app_key: 'fbAppKeyTest',
    app_secret: 'fbAppSecretTest',
  });

  it('get redirect data', () => {
    const res = facebook.getRedirectData(
      'https://syrup.keboola.com/oauth-v2/authorize/keboola.ex-facebook/callback'
    );
    expect(res['url'], 'to contain', 'https://www.facebook.com/v2.8/dialog/oauth?client_id=fbAppKeyTest');
    expect(res['url'], 'to contain', '&redirect_uri=https%3A%2F%2Fsyrup.keboola.com%2Foauth-v2%2Fauthorize%2Fkeboola.ex-facebook%2Fcallback');
    expect(res['url'], 'to contain', '&scope=manage_pages%2Cpublic_profile%2Cread_insights%2Cpages_show_list');
    expect(res['url'], 'to contain', '&response_type=code');
  });

  it('get token', () => {

  });
});