/**
 * Author: miro@keboola.com
 * Date: 30/11/2017
 */

'use strict';

import axios from 'axios';
import axiosRetry from 'axios-retry';

axiosRetry(axios, { retries: 5 });

class DockerRunnerApi {
  constructor(baseUri = null) {
    this.baseUri = baseUri !== null ? baseUri : `${process.env.SYRUP_URL}/docker`;
  }

  encrypt(componentId, projectId, plainText) {
    return axios({
      method: 'post',
      url: `${this.baseUri}/encrypt?componentId=${componentId}&projectId=${projectId}`,
      headers: { 'Content-Type': 'text/plain' },
      data: plainText,
    }).then(res => res.data);
  }
}

export default DockerRunnerApi;
