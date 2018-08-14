#!/bin/bash
set -e

# deploy to EU
docker-compose run \
    -e STAGE=prod \
    -e AWS_ACCESS_KEY_ID=${PROD_AWS_ACCESS_KEY_ID} \
    -e AWS_SECRET_ACCESS_KEY=${PROD_AWS_ACCESS_KEY_ID} \
    -e SERVICE_NAME=${PROD_SERVICE_NAME} \
    -e REGION=${PROD_EU_REGION} \
    -e KEBOOLA_STACK=${PROD_EU_KEBOOLA_STACK} \
    -e KBC_URL=${PROD_EU_KBC_URL} \
    deploy

# deploy to US
docker-compose run \
    -e STAGE=prod \
    -e AWS_ACCESS_KEY_ID=${PROD_AWS_ACCESS_KEY_ID} \
    -e AWS_SECRET_ACCESS_KEY=${PROD_AWS_ACCESS_KEY_ID} \
    -e SERVICE_NAME=${PROD_SERVICE_NAME} \
    -e REGION=${PROD_US_REGION} \
    -e KEBOOLA_STACK=${PROD_US_KEBOOLA_STACK} \
    -e KBC_URL=${PROD_US_KBC_URL} \
    deploy
