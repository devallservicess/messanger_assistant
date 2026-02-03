const http = require('http');

// Load environment variables
require('dotenv').config();

// Configuration from .env
const PORT = process.env.PORT || 3000;
const PATH = '/webhook';
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// Get custom message from command line argument, or use default
const TEST_MESSAGE = process.argv[2] || "Bonjour, quels sont vos horaires d'ouverture ?";
console.log(`Testing with message: "${TEST_MESSAGE}"`);

if (!process.env.APP_SECRET) {
    console.error("Error: APP_SECRET is missing in .env. Cannot sign the request.");
    process.exit(1);
}

// Fake payload mimicking a Messenger text message from PSID 'sender_123' to Page 'page_123'
const payload = JSON.stringify({
    object: 'page',
    entry: [
        {
            id: 'page_123',
            time: Date.now(),
            messaging: [
                {
                    sender: {
                        id: 'sender_123'
                    },
                    recipient: {
                        id: 'page_123'
                    },
                    timestamp: Date.now(),
                    message: {
                        mid: 'mid.1457764197618:41d102a3e1ae206a38',
                        text: TEST_MESSAGE
                    }
                }
            ]
        }
    ]
});

// Calculate signature (optional, but good for completeness if we wanted to fully mock it)
// For local testing, we might need to bypass signature verification in app.js OR implement it here.
// Since bypassing is easier for a quick test, we will assume the user might need to disable verification or we mock it.
// However, the app.js has `json({ verify: verifyRequestSignature })`. 
// To make this simple, we will try to send it. If it fails due to signature, we'll advise commenting it out or we compute it.
// Let's create a Helper to compute signature if needed, but for now let's try to send without specific headers 
// and see if we can explain to the user to disable validation for local test.
// Actually, let's implement the signature to be pro.

const crypto = require('crypto');
// We need the APP_SECRET to sign. 
// If we don't have it loaded, we can't sign correctly. 
// We will try to load from .env
require('dotenv').config();

const appSecret = process.env.APP_SECRET;

const options = {
    hostname: 'localhost',
    port: PORT,
    path: PATH,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'User-Agent': 'WhatsApp-Mock-Tester'
    }
};

if (appSecret) {
    const signature = crypto
        .createHmac('sha256', appSecret)
        .update(payload)
        .digest('hex');
    options.headers['x-hub-signature-256'] = `sha256=${signature}`;
    console.log('Signed request with APP_SECRET');
} else {
    console.warn('Warning: APP_SECRET not found in .env. Request signature will be missing (verification might fail).');
}

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
    res.on('end', () => {
        console.log('No more data in response.');
    });
});

req.on('error', (e) => {
    console.error('Problem with request:');
    console.error('Code:', e.code);
    console.error('Message:', e.message);
    if (e.code === 'ECONNREFUSED') {
        console.error(`\nHint: Make sure the server is running on port ${PORT}!`);
        console.error('Try running: "npm start" in another terminal.');
    }
});

// Write data to request body
req.write(payload);
req.end();

