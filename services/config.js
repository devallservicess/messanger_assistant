/**
 * Copyright 2021-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

"use strict";

// Use dotenv to read .env vars into Node
require("dotenv").config();

// Required environment variables
const ENV_VARS = [
  "ACCESS_TOKEN",
  "APP_SECRET",
  "VERIFY_TOKEN",
  "REDIS_HOST",
  "REDIS_PORT",
  "GROQ_API_KEY",
  "PAGE_ID"
];

module.exports = Object.freeze({
  // Application information
  appSecret: process.env.APP_SECRET,
  accessToken: process.env.ACCESS_TOKEN,
  verifyToken: process.env.VERIFY_TOKEN,
  pageId: process.env.PAGE_ID,

  // Groq configuration
  groqApiKey: process.env.GROQ_API_KEY,

  // Google Sheets configuration
  googleSheetId: process.env.GOOGLE_SHEET_ID,
  googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  googlePrivateKey: process.env.GOOGLE_PRIVATE_KEY,

  // Server configuration
  port: process.env.PORT || 8080,
  redisHost: process.env.REDIS_HOST || "localhost",
  redisPort: process.env.REDIS_PORT || 6379,

  checkEnvVariables: function () {
    ENV_VARS.forEach(function (key) {
      if (!process.env[key]) {
        console.warn("WARNING: Missing the environment variable " + key);
      }
    });
  }
});