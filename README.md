# podr

[![Node.js CI](https://github.com/cascadiacollections/podr/actions/workflows/node.js.yml/badge.svg)](https://github.com/cascadiacollections/podr/actions/workflows/node.js.yml)
[![Daily Build](https://github.com/cascadiacollections/podr/actions/workflows/daily-build.yml/badge.svg)](https://github.com/cascadiacollections/podr/actions/workflows/daily-build.yml)
[![Netlify Status](https://api.netlify.com/api/v1/badges/f066f5b0-8c2c-4a63-a776-5ecb880f76ad/deploy-status)](https://app.netlify.com/sites/podr/deploys)

A podcast player for the web.

## Features

- Top podcasts data is inlined at build time for fast initial render
- Daily builds ensure fresh content
- Background refresh of data for long sessions

## Local development

1. Git clone the repository `gh repo clone cascadiacollections/podr`.
1. Ensure yarn is installed `npm i -g yarn`
1. Run `yarn`.
1. Run `yarn start` to launch the local web server with live reload.
