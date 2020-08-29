[![Build Status](https://travis-ci.org/unsegnor/new-app.svg?branch=master)](https://travis-ci.org/unsegnor/new-app)

# new-app
New application schema with:
- Cucumber tests
- Integration tests
- Unit tests
- Mutation testing
- Ports and adapters templates
- Travis yaml
- Script for configuring npm deployment

## Getting started
1. Rename the product name on package.json
2. Set the repository, bugs and homepage urls
3. Set the keywords, description and author

## Seting npm deployment

    npm run configure-deployment

## Run all tests

    npm test

## Publish a patch on npm
Once you have made and commited your changes run:

    npm run patch