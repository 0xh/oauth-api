#!/bin/bash
set -e

# deploy to EU
docker-compose run \
    -e STAGE=prod \
    -e AWS_ACCESS_KEY_ID=${PROD_EU_AWS_ACCESS_KEY_ID} \
    -e AWS_SECRET_ACCESS_KEY=${PROD_EU_AWS_SECRET_ACCESS_KEY} \
    -e REGION=${PROD_EU_REGION} \
    -e SERVICE_NAME=${PROD_EU_SERVICE_NAME} \
    -e KEBOOLA_STACK=${PROD_EU_KEBOOLA_STACK} \
    -e KBC_URL=${PROD_EU_KBC_URL} \
    deploy

# deploy to US
docker-compose run \
    -e STAGE=prod \
    -e AWS_ACCESS_KEY_ID=${PROD_US_AWS_ACCESS_KEY_ID} \
    -e AWS_SECRET_ACCESS_KEY=${PROD_US_AWS_SECRET_ACCESS_KEY} \
    -e REGION=${PROD_US_REGION} \
    -e SERVICE_NAME=${PROD_US_SERVICE_NAME} \
    -e KEBOOLA_STACK=${PROD_US_KEBOOLA_STACK} \
    -e KBC_URL=${PROD_US_KBC_URL} \
    deploy
