'use strict';

import Bluebird from 'bluebird';
import AWS from 'aws-sdk';

AWS.config.setPromisesDependency(Bluebird);

const tableNames = {
  consumers: `${process.env.SERVICE_NAME}-${process.env.STAGE}_consumers`,
  credentials: `${process.env.SERVICE_NAME}-${process.env.STAGE}_credentials`,
  sessions: `${process.env.SERVICE_NAME}-${process.env.STAGE}_sessions`,
};

class DynamoDB {
  static getClient() {
    return new AWS.DynamoDB.DocumentClient();
  }

  static tableNames() {
    return tableNames;
  }
}

export default DynamoDB;
