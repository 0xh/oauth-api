'use strict';

class Authorize {
  constructor(env) {
    this.env = env;
  }

  init(event) {
    if (event.httpMethod === 'POST') {
      return Promise.resolve("init post response");
    } else {
      return Promise.resolve("init get response");
    }
  }

  callback(event) {
    return Promise.resolve("callback response");
  }
}

export default Authorize;