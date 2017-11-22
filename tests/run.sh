#!/usr/bin/env bash

serverless dynamodb install \
&& ./node_modules/.bin/mocha --timeout 0 --compilers js:babel-core/register tests/app