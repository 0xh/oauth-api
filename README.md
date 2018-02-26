## keboola-oauth-api

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
[![Build Status](https://travis-ci.org/keboola/oauth-api.svg?branch=master)](https://travis-ci.org/keboola/oauth-api)

Application based on Serverless framework utilizing AWS Lamda, API Gateway to manage OAuth credentials.


### Installation

1. Download git repository: `git clone git@github.com:keboola/oauth-api.git`
2. Create a AWS User, which will be used to deploy app to `dev` environment:
    1. Choose a `SERVICE_NAME` (i.e. `martin-oauth-api`)
    2. Create a stack from template [cf-deploy-policy.json](https://github.com/keboola/oauth-api/blob/master/cf-deploy-policy.json)
        - name your stack (i.e. `martin-oauth-api-dev-deploy`)
        - set a ServiceName = SERVICE_NAME
        - set a KeboolaStack name `kbc-eu-central-1` or `kbc-us-east-1`, it doesn't really matter for development/testing
    3. Create IAM user (with the same name as stack for example), assign this user to Group created in previous step  and create AWS credentials for this user
2. Create `.env` file
```
# AWS keys created in step 2
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Your AWS account id
ACCOUNT_ID=

# AWS region where the stack was created
REGION=

# SERVICE_NAME from step 2.i.
SERVICE_NAME=

STAGE=dev

# KeboolaStack from step 2.ii.
KEBOOLA_STACK=

KBC_URL=https://connection.keboola.com

# Keboola Manage API application token with oauth:manage scope
TEST_KBC_MANAGE_API_TOKEN=

# Keboola Connection Storage API Token
TEST_KBC_STORAGE_API_TOKEN=

# Session settings
SESSION_HASH_PREFIX=somePrefix
SESSION_COOKIE_NAME=oauthSessionId

# Hostname of the app (i.e. http://0.0.0.0:3000 for local development)
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






