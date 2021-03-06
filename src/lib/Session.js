'use strict';

import { UserError } from '@keboola/serverless-request-handler';
import cookie from 'cookie';
import R from 'ramda';
import uniqid from 'uniqid';
import DynamoDB from './DynamoDB';

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
    const optionsOr = R.propOr(R.__, R.__, options);
    this.dynamoDB = dynamoDb;
    this.tableName = optionsOr(DynamoDB.tableNames().sessions, 'name');
    this.hashKey = optionsOr('id', 'hashKey');
    this.hashPrefix = optionsOr(process.env.SESSION_HASH_PREFIX, 'hashPrefix');
    this.ttl = optionsOr(300000, 'ttl');
    this.cookieName = optionsOr(process.env.SESSION_COOKIE_NAME, 'cookieName');
  }

  getCookieHeaderValue(sid, path = null) {
    const nameStr = `${this.getCookieName()}=${sid}`;
    const pathStr = path ? `;path=${path}` : '';
    return nameStr + pathStr;
  }

  getCookieName() {
    return this.cookieName;
  }

  init(event) {
    if (R.has('headers', event)) {
      let eventCookie = {};
      if (R.has('Cookie', event.headers)) {
        eventCookie = cookie.parse(event.headers.Cookie);
      } else if (R.has('cookie', event.headers)) {
        eventCookie = cookie.parse(event.headers.cookie);
      }

      if (R.hasIn(this.cookieName, eventCookie)) {
        return eventCookie[this.cookieName];
      }
    }
    return uniqid();
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
          throw UserError.unauthorized('Session not found');
        }
        if (!result.Item.expires || result.Item.expires <= Date.now()) {
          return this.destroy(sid).then(() => {
            throw UserError.unauthorized('Session is expired');
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
        expires: this.getExpirationDate().getTime(),
        updated: Date.now(),
        session,
      },
    };

    return this.dynamoDB.put(params).promise().then(() => params.Item);
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
   * @return {Date} the session expiration date.
   */
  getExpirationDate() {
    return new Date(Date.now() + this.ttl);
  }
}
export default Session;
