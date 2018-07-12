#!/usr/bin/env bash
./node_modules/.bin/eslint . && \
./node_modules/.bin/mocha --timeout 0 --require babel-core/register --full-trace tests/app tests/lib/*
