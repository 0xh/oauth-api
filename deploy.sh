#!/bin/bash
set -e

docker-compose run \
    -e ACCOUNT_ID=${PROD_ACCOUNT_ID} \
    -e AWS_ACCESS_KEY_ID=${PROD_AWS_ACCESS_KEY_ID} \
    -e AWS_SECRET_ACCESS_KEY=${PROD_AWS_SECRET_ACCESS_KEY} \
    -e REGION=eu-central-1 \
    -e SERVICE_NAME=oauth-api-eu-central-1 \
    -e STAGE=prod \
    -e KEBOOLA_STACK=oauth-api-eu-central-1 \
    -e KBC_URL=https://connection.eu-central-1.keboola.com \
    deploy
