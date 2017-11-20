'use strict';

class Consumers {
  constructor(dynamoDb) {
    this.dynamoDb = dynamoDb;
  }

  get(event) {
    const params = {
      TableName: 'consumers',
      Key: {
        component_id: event.pathParameters.componentId
      }
    };

    return this.dynamoDb.get(params).promise()
      .then(res => res.Item);
  }

  add(event) {
    const consumer = JSON.parse(event.body);
    const params = {
      TableName: 'consumers',
      Item: consumer
    };
    //@todo: validation

    return this.dynamoDb.put(params).promise()
      .then(res => consumer);
  }
}

export default Consumers;