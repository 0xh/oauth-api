'use strict';

class Authorize {
  constructor(dynamoDb) {
    this.dynamoDb = dynamoDb;
  }

  init(event) {
    if (event.httpMethod === 'POST') {
      // const requestBody = JSON.parse(event.body);
      return event;
    }

    return {
      message: 'Authorize GET for component ' + event.pathParameters.componentId
    };
  }

  callback(event) {
    return Promise.resolve("callback response");
  }
}

export default Authorize;