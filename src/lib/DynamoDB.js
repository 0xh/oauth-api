'use strict';

import Bluebird from 'bluebird';
import AWS from 'aws-sdk';

AWS.config.setPromisesDependency(Bluebird);

const tableNames = {
  consumers: `${process.env.SERVICE_NAME}-${process.env.STAGE}_consumers`,
  credentials: `${process.env.SERVICE_NAME}-${process.env.STAGE}_credentials`,
  sessions: `${process.env.SERVICE_NAME}-${process.env.STAGE}_sessions`,
};

const isOffline = () =>
  // Depends on serverless-offline plugin which adds
  // IS_OFFLINE to process.env when running offline
  process.env.IS_OFFLINE || !!process.env.DYNAMO_ENDPOINT;
class DynamoDB {
  static getDocClient() {
    if (isOffline()) {
      return new AWS.DynamoDB.DocumentClient({
        region: process.env.REGION,
        endpoint: process.env.DYNAMO_ENDPOINT,
      });
    }

    return new AWS.DynamoDB.DocumentClient();
  }

  static getRawClient() {
    if (isOffline()) {
      return new AWS.DynamoDB({
        region: process.env.REGION,
        endpoint: process.env.DYNAMO_ENDPOINT,
      });
    }

    return new AWS.DynamoDB();
  }

  static tableNames() {
    return tableNames;
  }
}

export default DynamoDB;
