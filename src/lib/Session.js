/**
 * Author: miro@keboola.com
 * Date: 24/11/2017
 */
'use strict';
import {UserError} from '@keboola/serverless-request-handler';
import cookie from 'cookie';
import {Map} from 'immutable';
const uniqid = require('uniqid');

/**
 * Class for storing sessions into DynamoDB table
 */
class Session {

  /**
   * @param dynamoDb DynamoDB doc client
   * @param {Object} options Optional options
   *  'name' DynamoDB table name, defaults to 'sessions'
   *  'hashKey' DynamoDB table primary key
   *  'hashPrefix' Session ID prefix
   */
  constructor(dynamoDb, options = {}) {
    this.dynamoDB = dynamoDb;

    const {
      name = process.env.SESSION_TABLE_NAME,
      hashKey = process.env.SESSION_HASH_KEY,
      hashPrefix = process.env.SESSION_HASH_PREFIX,
      ttl = process.env.SESSION_TTL
    } = options;

    this.tableName = name;
    this.hashKey = hashKey;
    this.hashPrefix = hashPrefix;
    this.ttl = ttl
  }

  static init(event) {
    return Map(cookie.parse(event.Cookie))
      .get('oauthSessionId', uniqid());
  }

  /**
   * Retrieve session from DynamoDB
   * @param {String} sid session id
   */
  get(sid) {
    const sessionId = this.getSessionId(sid);
    const params = {
      TableName: this.tableName,
      Key: {
        [this.hashKey]: sessionId,
      },
      ConsistentRead: true,
    };

    return this.dynamoDB.get(params).promise()
      .then((result) => {
        if (!result || !result.Item) {
          throw UserError.unauthorized(`Session '${sid}' not found`);
        }
        if (!result.Item.expires || result.Item.expires <= Date.now()) {
          return this.destroy(sid).then(() => {
            throw UserError.unauthorized(`Session '${sid}' is expired`)
          });
        }
        return result.Item.session;
      });
  }

  /**
   * @param {String} sid session id
   * @param {Object} session session object
   */
  set(sid, session) {
    const params = {
      TableName: this.tableName,
      Item: {
        [this.hashKey]: this.getSessionId(sid),
        expires: this.getExpirationDate(session),
        updated: Date.now(),
        session: session
      },
    };

    return this.dynamoDB.put(params).promise();
  }

  /**
   * Deletes a session from dynamo.
   * @param  {String} sid Session ID.
   */
  destroy(sid) {
    const params = {
      TableName: this.tableName,
      Key: {
        [this.hashKey]: this.getSessionId(sid),
      },
    };
    return this.dynamoDB.delete(params).promise();
  }

  /**
   * Builds the session ID foe storage.
   * @param  {String} sid Original session id.
   * @return {String} Prefix + original session id.
   */
  getSessionId(sid) {
    return `${this.hashPrefix}${sid}`;
  }

  /**
   * Calculates the session expiration date.
   * @param  {Object} session The session object.
   * @return {Date} the session expiration date.
   */
  getExpirationDate(session) {
    let expirationDate = Date.now();
    if (session.cookie && Number.isInteger(session.cookie.maxAge)) {
      expirationDate += session.cookie.maxAge;
    } else {
      expirationDate += this.ttl;
    }
    return new Date(expirationDate);
  }
}
export default Session;