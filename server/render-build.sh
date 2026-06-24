#!/usr/bin/env bash
# exit on error
set -o errexit

npm install

# Render doesn't preserve the puppeteer cache across builds by default.
# This ensures puppeteer is downloaded and available.
npx puppeteer browsers install chrome
