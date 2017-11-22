## keboola-oauth-api

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
[![Build Status](https://travis-ci.org/keboola/oauth-api.svg?branch=master)](https://travis-ci.org/keboola/oauth-api.svg?branch=master)

Application based on Serverless framework utilizing AWS Lamda, API Gateway to manage OAuth credentials.


### Installation

1. Install Serverless: `npm install -g serverless/serverless`
2. Install AWS CLI (e.g. `pip install awscli` on Mac)
3. Install Yarn (see https://yarnpkg.com/en/docs/install)
4. Download git repository: `git clone git@github.com:keboola/oauth-api.git`
5. Cd into directory: `cd oauth-api`
6. Install dependencies: `yarn install`
7. Either save AWS credentials to `~/.aws/credentials` (see http://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html#cli-multiple-profiles) or set env variables `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` prior to running following commands
8. Create `.env` file for docker
9. Run `docker-compose run --rm deploy-dev`

### Development

Conform your code to included ESLint rules.

Local instance can be started using `docker-compose run --rm --service-ports run-dev`. The API will be accessible using url `http://localhost:3000/` 
