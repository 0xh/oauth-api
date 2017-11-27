/**
 * Author: miro@keboola.com
 * Date: 27/11/2017
 */
import OAuth20 from "./OAuth20";

class OAuthFactory {
  static getOAuth(consumer) {
    console.log(consumer);
    const version = consumer.oauth_version.toLowerCase();
    switch (version) {
      case '1.0':
        return new OAuth10(consumer);
        break;
      case '2.0':
        return new OAuth20(consumer);
        break;
      case 'facebook':
        return new Facebook(consumer);
        break;
      case 'quickbooks':
        return new Quickbooks(consumer);
        break;
      default:
        throw UserError.notFound(
          `Type '${version}' is not supported. Allowed types are OAuth20, OAuth10, Facebook, Quickbooks`
        );
    }
  }
}
export default OAuthFactory;
