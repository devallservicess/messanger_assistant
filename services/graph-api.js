/**
 * Copyright 2021-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

"use strict";

const { FacebookAdsApi } = require('facebook-nodejs-business-sdk');
const config = require("./config");

const api = new FacebookAdsApi(config.accessToken);
FacebookAdsApi.setDefaultApi(api);

module.exports = class GraphApi {
  static async #makeApiCall(senderPsid, requestBody) {
    try {
      const response = await api.call(
        'POST',
        [config.pageId, 'messages'],
        requestBody
      );
      console.log('API call successful:', response);
      return response;
    } catch (error) {
      console.error('Error making API call:', error);
      throw error;
    }
  }

  static async markAsRead(senderPsid) {
    try {
      await api.call(
        'POST',
        [config.pageId, 'messages'],
        {
          recipient: { id: senderPsid },
          sender_action: "mark_seen"
        }
      );
    } catch (error) {
      console.warn('[GraphApi] Could not mark message as seen:', error.message);
    }
  }

  static async sendTypingOn(senderPsid) {
    try {
      await api.call(
        'POST',
        [config.pageId, 'messages'],
        {
          recipient: { id: senderPsid },
          sender_action: "typing_on"
        }
      );
    } catch (error) {
      console.warn('[GraphApi] Could not send typing indicator:', error.message);
    }
  }

  /**
   * Sends a simple text message
   * @param {string} senderPsid - The PSID of the recipient
   * @param {string} messageText - The text to send
   * @returns {Promise}
   */
  static async sendTextMessage(senderPsid, messageText) {
    const requestBody = {
      recipient: {
        id: senderPsid
      },
      message: {
        text: messageText
      }
    };

    await this.markAsRead(senderPsid);
    await this.sendTypingOn(senderPsid);
    return this.#makeApiCall(senderPsid, requestBody);
  }

  /**
   * Sends a generic template message (equivalent to carousel/cards)
   */
  static async sendGenericMessage(senderPsid, elements) {
    const requestBody = {
      recipient: {
        id: senderPsid
      },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "generic",
            elements: elements
          }
        }
      }
    };

    await this.markAsRead(senderPsid);
    await this.sendTypingOn(senderPsid);
    return this.#makeApiCall(senderPsid, requestBody);
  }

  /**
 * Sends buttons with text
 */
  static async sendButtonMessage(senderPsid, text, buttons) {
    const requestBody = {
      recipient: {
        id: senderPsid
      },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text: text,
            buttons: buttons
          }
        }
      }
    };

    await this.markAsRead(senderPsid);
    await this.sendTypingOn(senderPsid);
    return this.#makeApiCall(senderPsid, requestBody);
  }

};

