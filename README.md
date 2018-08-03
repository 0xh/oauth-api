## keboola-oauth-api

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
[![Build Status](https://travis-ci.org/keboola/oauth-api.svg?branch=master)](https://travis-ci.org/keboola/oauth-api)

Application based on Serverless framework utilizing AWS Lamda, API Gateway to manage OAuth credentials.

### Development

1. Clone git repository: `git clone git@github.com:keboola/oauth-api.git`
2. Create a AWS User, which will be used for local development, using `serrverless-offline`:
    1. Choose a `SERVICE_NAME` (i.e. `miro-oauth-api`)
    2. Create a stack from template [cf-dev-policy.json](https://github.com/keboola/oauth-api/blob/master/cf-dev-policy.json)
        - name your stack (i.e. `miro-oauth-api-local`)
        - set a KeboolaStack name (i.e. `miro-oauth-api-local`)
        - set a ServiceName = SERVICE_NAME
    3. Create IAM user (same name as stack for example), with programmatic access and assign this user to Group created in previous step and create AWS credentials for this user
3. Create `.env` file:
    ```dotenv
    # AWS keys created in step 2.iii
    AWS_ACCESS_KEY_ID=
    AWS_SECRET_ACCESS_KEY=
    
    # AWS region where the stack was created
    REGION=
    
    # SERVICE_NAME from step 2.i
    SERVICE_NAME=
    
    STAGE=dev
    
    # KeboolaStack from step 2.ii
    KEBOOLA_STACK=
    
    KBC_URL=https://connection.keboola.com
    DOCKER_RUNNER_URL=https://docker-runner.keboola.com
    
    # Keboola Manage API application token with oauth:manage scope
    TEST_KBC_MANAGE_API_TOKEN=
    
    # Keboola Connection Storage API Token
    TEST_KBC_STORAGE_API_TOKEN=
    
    # Session settings
    SESSION_HASH_PREFIX=somePrefix
    SESSION_COOKIE_NAME=oauthSessionId
    
    # Hostname of the app (i.e. http://0.0.0.0:3030 for local development)
    REDIRECT_URI_BASE=
    
    # Twitter settings for tests
    TW_APP_KEY=
    TW_APP_SECRET=
    ```
4. Develop and test. Conform your code to included ESLint rules.
    1. Run tests:
        ```bash
        docker-compose run --rm tests
        ```
    2. Start local instance: 
        - API will be accessible on `http://localhost:3030/` 
        ```bash
        docker-compose run --rm --service-ports dev
        ```    
    3. Run Linter, automatically fixing errors:
        ```bash
        docker-compose run --rm dev ./node_modules/.bin/eslint --fix .
        ```  

### Deployment

1. Create another AWS User, which will be used to deploy the app to `dev` environment:    
    1. Create a stack from template [cf-deploy-policy.json](https://github.com/keboola/oauth-api/blob/master/cf-deploy-policy.json)
        - name your stack (i.e. `miro-oauth-api-deploy`)
        - set a KeboolaStack name (i.e. `miro-oauth-api-deploy`)
        - set a ServiceName = SERVICE_NAME
        - set Stage to `dev`
    3. Create IAM user (with the same name as stack for example), programmatic access, assign this user to Group created in previous step and create AWS credentials for this user
2. Update AWS credentials in your `.env` file
3. Deploy service to `dev` environment:
    ```bash
    docker-compose run --rm deploy
    ```

### CI

[cf-deploy-policy.json](https://github.com/keboola/oauth-api/blob/master/cf-deploy-policy.json) Cloudformation template creates IAM Group 
which should be assigned to IAM user used for CI.
This stack should be created in each region where the service is deployed. 






