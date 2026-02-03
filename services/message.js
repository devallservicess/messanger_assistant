/**
 * Copyright 2021-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

"use strict";

module.exports = class Message {
  constructor(messagingEvent) {
    this.senderId = messagingEvent.sender.id;
    this.recipientId = messagingEvent.recipient.id;
    this.timestamp = messagingEvent.timestamp;

    // Check if it's a message or postback
    if (messagingEvent.message) {
      this.id = messagingEvent.message.mid;
      const message = messagingEvent.message;

      if (message.text) {
        this.type = 'text';
        this.text = message.text;
      } else if (message.attachments) {
        const attachment = message.attachments[0];
        this.type = attachment.type; // image, video, audio, file
        this.mediaId = null; // Messenger doesn't always give a reusable ID easily in this context
        this.url = attachment.payload.url;
        this.text = null;
      } else if (message.quick_reply) {
        this.type = 'quick_reply';
        this.text = message.text;
        this.payload = message.quick_reply.payload;
      } else {
        this.type = 'unknown';
        this.text = null;
      }
    } else if (messagingEvent.postback) {
      this.type = 'postback';
      this.id = messagingEvent.postback.mid; // Might not exist in some versions, but usually present
      this.payload = messagingEvent.postback.payload;
      this.text = messagingEvent.postback.title;
    } else {
      this.type = 'unknown';
    }
  }

  hasText() {
    return this.text !== null && this.text.trim().length > 0;
  }

  isTextMessage() {
    return this.type === 'text';
  }

  isInteractiveMessage() {
    return this.type === 'postback' || this.type === 'quick_reply';
  }
};