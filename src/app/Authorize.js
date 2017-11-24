'use strict';

class Authorize {
  constructor(dynamoDb, session) {
    this.dynamoDb = dynamoDb;
    this.session = session;
  }

  init(event) {
    const componentId = event.pathParameters.componentId;
    const sessionId = this.session.init(event);
    const consumerParams = {
      TableName: 'consumers',
      Key: {
        component_id: componentId
      }
    };

    if (event.httpMethod === 'POST') {
      return this.session.set(sessionId, {
        'componentId': componentId
      });
    }

    return this.dynamoDb.get(consumerParams).promise()
      .then(res => res.Item);
  }

  callback(event) {
    return Promise.resolve("callback response");
  }
}

export default Authorize;