'use strict';

import expect from 'unexpected';
import Quickbooks from '../../../src/lib/OAuth/Quickbooks';

describe('Quickbooks', () => {
  const quickbooks = new Quickbooks({
    auth_url: 'https://appcenter.intuit.com/connect/oauth2?response_type=code&client_id=%%client_id%%&scope=com.intuit.quickbooks.accounting&redirect_uri=%%redirect_uri%%&state=security_token12345',
    token_url: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
    app_key: 'qbAppKeyTest',
    app_secret: 'qbAppSecretTest',
  });

  it('get authorization header', () => {
    const authHeader = quickbooks.getAuthorizationHeader('qbAppKeyTest', 'qbAppSecretTest');
    expect(authHeader, 'to be', 'Basic cWJBcHBLZXlUZXN0OnFiQXBwU2VjcmV0VGVzdA==');
  });

  it('get redirect data', () => {
    const callbackUrl = `${process.env.REDIRECT_URI_BASE}/authorize/keboola.ex-quickbooks/callback`;
    const res = quickbooks.getRedirectData(callbackUrl);
    expect(res.url, 'to contain', 'https://appcenter.intuit.com/connect/oauth2?response_type=code&client_id=qbAppKeyTest');
    expect(res.url, 'to contain', `&redirect_uri=${callbackUrl}`);
    expect(res.url, 'to contain', '&scope=com.intuit.quickbooks.accounting');
  });
});
