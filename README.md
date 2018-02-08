## keboola-oauth-api

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
[![Build Status](https://travis-ci.org/keboola/oauth-api.svg?branch=master)](https://travis-ci.org/keboola/oauth-api)

Application based on Serverless framework utilizing AWS Lamda, API Gateway to manage OAuth credentials.


### Installation

1. Download git repository: `git clone git@github.com:keboola/oauth-api.git`
2. Cd into directory: `cd oauth-api`
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

Deploy service to `test` environment:
```
docker-compose run --rm deploy-test
```
