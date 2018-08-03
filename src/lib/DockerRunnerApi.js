'use strict';

import axios from 'axios';
import axiosRetry from 'axios-retry';
import { UserError } from '@keboola/serverless-request-handler/src/index';

axiosRetry(axios, { retries: 5 });

class DockerRunnerApi {
  constructor(baseUri = process.env.DOCKER_RUNNER_URL) {
    if (!baseUri) {
      throw new Error('Docker Runner API url must not be empty');
    }
    this.baseUri = `${baseUri}/docker`;
  }

  encrypt(componentId, projectId, plainText) {
    return axios({
      method: 'post',
      url: `${this.baseUri}/encrypt?componentId=${componentId}&projectId=${projectId}`,
      headers: { 'Content-Type': 'text/plain' },
      data: plainText,
    }).then(response => response.data)
      .catch((error) => {
        const errorMessage = !!error.response.data ? error.response.data : error.message;
        throw UserError.error(`Docker encryption error: ${errorMessage}`);
      });
  }
}

export default DockerRunnerApi;
