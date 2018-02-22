#!/usr/bin/env bash
./node_modules/.bin/eslint . && \
./node_modules/.bin/mocha --timeout 0 --compilers js:babel-core/register tests/app tests/lib/*
