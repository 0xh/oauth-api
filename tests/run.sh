#!/usr/bin/env bash

serverless dynamodb remove \
&& serverless dynamodb install >/dev/null \
&& ./node_modules/.bin/mocha --timeout 0 --compilers js:babel-core/register tests/app
