/**
 * Author: miro@keboola.com
 * Date: 27/11/2017
 */
import { UserError } from '@keboola/serverless-request-handler';
import OAuth10 from './OAuth10';
import OAuth20 from './OAuth20';
import Facebook from './Facebook';
import Quickbooks from './Quickbooks';

class OAuthFactory {
  static getOAuth(consumer) {
    const version = consumer.oauth_version.toLowerCase();
    switch (version) {
      case '1.0':
        return new OAuth10(consumer);
      case '2.0':
        return new OAuth20(consumer);
      case 'facebook':
        return new Facebook(consumer);
      case 'quickbooks':
        return new Quickbooks(consumer);
      default:
        throw UserError.notFound(`Type '${version}' is not supported. Allowed types are OAuth20, OAuth10, Facebook, Quickbooks`);
    }
  }
}
export default OAuthFactory;
