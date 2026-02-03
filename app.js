"use strict";

const crypto = require('crypto');
const path = require('path');

const { urlencoded, json } = require('body-parser');
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const config = require('./services/config');
const Conversation = require('./services/conversation');
const Message = require('./services/message');
const uploadRoutes = require('./routes/upload-routes');

const app = express();

// Enable CORS for React frontend
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

// Parse application/x-www-form-urlencoded
app.use(
  urlencoded({
    extended: true
  })
);

// Parse application/json. Verify that callback came from Facebook
app.use(json());

// Serve static files from frontend build
app.use(express.static(path.join(__dirname, 'frontend', 'dist')));

// API routes
app.use('/api', uploadRoutes);


// Handle webhook verification handshake
app.get("/webhook", function (req, res) {
  if (
    req.query["hub.mode"] != "subscribe" ||
    req.query["hub.verify_token"] != config.verifyToken
  ) {
    res.sendStatus(403);
    return;
  }

  res.send(req.query["hub.challenge"]);
});

// Handle incoming messages
app.post(
  "/webhook",
  json({ verify: verifyRequestSignature }),
  (req, res) => {
    console.log("\n========== INCOMING WEBHOOK ==========");
    console.log("Timestamp:", new Date().toISOString());
    // console.log("Headers:", JSON.stringify(req.headers, null, 2));
    // console.log("Body:", JSON.stringify(req.body, null, 2));

    if (req.body.object === "page") {
      req.body.entry.forEach(entry => {
        // Gets the body of the webhook event
        let webhook_event = entry.messaging[0];
        console.log(webhook_event);

        // Get the sender PSID
        let sender_psid = webhook_event.sender.id;
        console.log("Sender PSID: " + sender_psid);

        Conversation.handleMessage(sender_psid, webhook_event);
      });
      res.status(200).send("EVENT_RECEIVED");
    } else {
      res.sendStatus(404);
    }
  }
);

// Default route for health check
app.get('/', (req, res) => {
  res.json({
    message: 'Jasper\'s Market Server is running',
    endpoints: [
      'POST /webhook - WhatsApp webhook endpoint'
    ]
  });
});

// Check if all environment variables are set
config.checkEnvVariables();

// Verify that the callback came from Facebook.
function verifyRequestSignature(req, res, buf) {
  let signature = req.headers["x-hub-signature-256"];

  if (!signature) {
    console.warn(`Couldn't find "x-hub-signature-256" in headers.`);
  } else {
    let elements = signature.split("=");
    let signatureHash = elements[1];
    let expectedHash = crypto
      .createHmac("sha256", config.appSecret)
      .update(buf)
      .digest("hex");
    if (signatureHash != expectedHash) {
      throw new Error("Couldn't validate the request signature.");
    }
  }
}


var listener = app.listen(config.port, () => {
  console.log(`The app is listening on port ${listener.address().port}`);
});
