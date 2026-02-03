/**
 * Copyright 2021-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

"use strict";

const redis = require('redis');
const config = require('./config');

// In-memory fallback
const memoryCache = new Map();

const client = redis.createClient({
  socket: {
    host: config.redisHost,
    port: config.redisPort,
    reconnectStrategy: (retries) => {
      if (retries > 5) {
        console.log("[Redis] Too many retries, switching to in-memory cache.");
        return new Error("Too many retries");
      }
      return Math.min(retries * 50, 500);
    }
  }
});

let redisAvailable = false;

client.on('error', (err) => {
  // Suppress heavy logging after fallback
  if (redisAvailable) {
    console.warn('[Redis] Connection lost, switching to memory.', err.message);
  }
  redisAvailable = false;
});

client.on('ready', () => {
  console.log('[Redis] Connected and ready.');
  redisAvailable = true;
});

// Attempt to connect cleanly
client.connect().catch(err => {
  console.warn("[Redis] Initialization failed, using in-memory cache.");
});

module.exports = class Cache {
  static async insert(key) {
    /**
     * As of when this was written, the redis client doesn't support
     * setting a TTL on members of the set dataytype. Instead, we'll
     * use the standard hash map with a dummy value to mimic one.
    */
    if (redisAvailable && client.isOpen) {
      try {
        await client.set(key, "");
        // Assume that most "delivered / read" webhooks will happen within
        // 15 seconds.
        await client.expire(key, 15);
        return;
      } catch (e) {
        console.warn("[Redis] Write failed, using memory:", e.message);
        redisAvailable = false;
      }
    }

    // Fallback
    memoryCache.set(key, Date.now() + 15000); // 15s expiry roughly
  }

  static async remove(key) {
    if (redisAvailable && client.isOpen) {
      try {
        let resp = await client.del(key);

        /**
         * Optionally, your application can measure / report the ingress latency
         * from Cloud API webhooks via Redis's TTL.
         * Ex.
         *      someLoggingFunc(client.ttl(key));
        */

        return resp > 0;
      } catch (e) {
        console.warn("[Redis] Read failed, using memory:", e.message);
        redisAvailable = false;
      }
    }

    // Fallback
    const expiry = memoryCache.get(key);
    if (expiry && expiry > Date.now()) {
      memoryCache.delete(key);
      return true;
    }
    memoryCache.delete(key); // Cleanup
    return false;
  }
}
