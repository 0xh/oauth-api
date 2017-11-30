/**
 * Author: miro@keboola.com
 * Date: 22/11/2017
 */

'use strict';

import Bluebird from 'bluebird';
import AWS from 'aws-sdk';

AWS.config.setPromisesDependency(Bluebird);

class DynamoDB {
  static getClient() {
    return new AWS.DynamoDB.DocumentClient();
  }
}

export default DynamoDB;
