'use strict';

class Consumers {
  constructor(dynamoDb) {
    this.dynamoDb = dynamoDb;
  }

  add(event) {
    console.log(event);
    const consumer = JSON.parse(event.body);
    //@todo: validation

    return this.dynamoDb.put({
      TableName: 'consumers',
      Item: consumer,
    }).promise().then(res => consumer);
  }
}

export default Consumers;