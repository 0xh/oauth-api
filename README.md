## keboola-oauth-api

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
[![Build Status](https://travis-ci.org/keboola/oauth-api.svg?branch=master)](https://travis-ci.org/keboola/oauth-api)

Application based on Serverless framework utilizing AWS Lamda, API Gateway to manage OAuth credentials.


### Installation

1. Download git repository: `git clone git@github.com:keboola/oauth-api.git`
2. Create AWS User for service
 - Choose a `SERVICE_NAME` like `martin-oauth-api-dev`
 - Create a stack [cf-deploy-policy.json](https://github.com/keboola/oauth-api/blob/master/cf-deploy-policy.json) with permissions, use SERVICE_NAME as parameter
 - Create IAM user eq. `martin-oauth-api-dev-deploy`, assign this user to Group created in previous step  and create AWS credentials for this user
2. Create `.env` file
```
# AWS keys created in step 2
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Your AWS account id
ACCOUNT_ID=

# Name of user created in step 2
USER_NAME=

# AWS region where the stack was created
REGION=

# SERVICE_NAME from step 1
SERVICE_NAME=

STAGE=dev

KEBOOLA_STACK=
KBC_URL=https://connection.keboola.com

# Keboola Manage API application token with oauth:manage scope
TEST_KBC_MANAGE_API_TOKEN=

# Keboola Connection Storage API Token
TEST_KBC_STORAGE_API_TOKEN=

# Session settings
SESSION_HASH_PREFIX=somePrefix
SESSION_COOKIE_NAME=oauthSessionId


REDIRECT_URI_BASE=

# Twitter settings for tests
TW_APP_KEY=
TW_APP_SECRET=

```
3. Create `.env` file from template `.env.tmp`

### Development

Conform your code to included ESLint rules.

Run tests:
```
docker-compose run --rm tests
```

Start local instance: (The API will be accessible using url `http://localhost:3030/`)
```
docker-compose run --rm --service-ports dev
```

### Deploy 

Deploy service to `dev` environment:
```
docker-compose run --rm deploy-dev
```

### CI

[cf-deploy-policy.json](https://github.com/keboola/oauth-api/blob/master/cf-deploy-policy.json) Cloudformation template creates IAM Group 
which should be assigned to IAM user used for CI.
This stack should be created in each region where the service is deployed. 






