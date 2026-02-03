/**
 * Copyright 2021-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

"use strict";

const constants = require("./constants");
const config = require("./config");
const GraphApi = require('./graph-api');
const Message = require('./message');
const { generateAIResponse } = require('./ai-response');

/**
 * Sends an AI response for a text message
 * @param {string} senderPsid - The PSID of the recipient
 * @param {string} messageText - The text of the received message
 */
async function sendAIResponse(senderPsid, messageText) {
  try {
    console.log(`[Conversation] Message received from ${senderPsid}: "${messageText}"`);

    // Generate response with AI
    const aiResponseText = await generateAIResponse(messageText, senderPsid);

    console.log(`[Conversation] AI Response: "${aiResponseText}"`);

    // Send the response
    const response = await GraphApi.sendTextMessage(
      senderPsid,
      aiResponseText
    );

    return response;
  } catch (error) {
    console.error('[Conversation] Error sending AI response:', error);

    // Fallback message
    return GraphApi.sendTextMessage(
      senderPsid,
      "Sorry, I am encountering a technical issue. Please try again later."
    );
  }
}

module.exports = class Conversation {
  static async handleMessage(senderPsid, messagingEvent) {
    const message = new Message(messagingEvent);

    console.log(`[Conversation] Message Type: ${message.type}`);

    // If it's a text message, use AI to respond
    if (message.isTextMessage() && message.hasText()) {
      console.log(`[Conversation] Text message detected, generating AI response...`);
      await sendAIResponse(
        senderPsid,
        message.text
      );
      return;
    }

    // Handle Postbacks (Buttons)
    if (message.type === 'postback' || message.type === 'quick_reply') {
      console.log(`[Conversation] Postback/QuickReply received: ${message.payload}`);
      // You can handle specific payloads here if needed
      // For now, we interact as if it was text if it has a title/payload that makes sense, 
      // or just acknowledge it.
      const responseText = message.text || message.payload || "Button clicked";
      await sendAIResponse(senderPsid, responseText);
      return;
    }

    // For attachments or other types, we can just send a generic response or ignore
    if (message.type === 'image' || message.type === 'video' || message.type === 'audio') {
      console.log(`[Conversation] Media message received`);
      await GraphApi.sendTextMessage(senderPsid, "I received your media, but I can only process text messages for now.");
    }
  }
};