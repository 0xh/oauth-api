'use strict';

import axios from 'axios';
import axiosRetry from 'axios-retry';
import { UserError } from '@keboola/serverless-request-handler/src/index';

axiosRetry(axios, { retries: 5 });

class DockerRunnerApi {
  constructor(baseUri = null) {
    this.baseUri = baseUri !== null ? baseUri : `${process.env.DOCKER_RUNNER_URL}/docker`;
  }

  encrypt(componentId, projectId, plainText) {
    return axios({
      method: 'post',
      url: `${this.baseUri}/encrypt?componentId=${componentId}&projectId=${projectId}`,
      headers: { 'Content-Type': 'text/plain' },
      data: plainText,
    }).then(res => res.data)
      .catch((err) => {
        throw UserError.error(`Docker encryption error: ${err.response.data.error}`);
      });
  }
}

export default DockerRunnerApi;
