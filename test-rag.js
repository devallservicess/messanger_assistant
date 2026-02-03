const fs = require('fs');
const path = require('path');
const http = require('http');

// Configuration
const API_HOST = 'localhost';
const API_PORT = 3000;
const FILE_PATH = path.join(__dirname, 'menu.json');

// Helper to make a multipart/form-data request
function uploadFile() {
    return new Promise((resolve, reject) => {
        console.log('Testing File Upload...');

        if (!fs.existsSync(FILE_PATH)) {
            reject(new Error(`File not found: ${FILE_PATH}`));
            return;
        }

        const fileContent = fs.readFileSync(FILE_PATH);
        const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substr(2);

        const postDataStart = [
            `--${boundary}`,
            `Content-Disposition: form-data; name="file"; filename="menu.json"`,
            `Content-Type: application/json`,
            '',
            ''
        ].join('\r\n');

        const postDataEnd = `\r\n--${boundary}--`;

        const options = {
            hostname: API_HOST,
            port: API_PORT,
            path: '/api/upload',
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': Buffer.byteLength(postDataStart) + fileContent.length + Buffer.byteLength(postDataEnd)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const json = JSON.parse(data);
                        console.log('✅ Upload Successful:', json);
                        resolve(json);
                    } catch (e) {
                        console.error('❌ Failed to parse response:', data);
                        reject(e);
                    }
                } else {
                    console.error(`❌ Upload failed with status ${res.statusCode}:`, data);
                    reject(new Error(`Status ${res.statusCode}`));
                }
            });
        });

        req.on('error', (e) => {
            console.error('❌ Request error:', e.message);
            reject(e);
        });

        // Write data
        req.write(postDataStart);
        req.write(fileContent);
        req.write(postDataEnd);
        req.end();
    });
}

// Helper to make a GET request
function search(query) {
    return new Promise((resolve, reject) => {
        console.log(`\nTesting Search for "${query}"...`);

        const options = {
            hostname: API_HOST,
            port: API_PORT,
            path: `/api/search?q=${encodeURIComponent(query)}&k=3`,
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const json = JSON.parse(data);
                        console.log('✅ Search Successful!');
                        if (json.results && json.results.length > 0) {
                            console.log('Found results:');
                            json.results.forEach((r, i) => {
                                console.log(`  ${i + 1}. [${(r.score * 100).toFixed(1)}%] ${r.text.substring(0, 80)}...`);
                            });
                        } else {
                            console.log('  No results found.');
                        }
                        resolve(json);
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    console.error(`❌ Search failed with status ${res.statusCode}`);
                    reject(new Error(`Status ${res.statusCode}`));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function runTests() {
    try {
        // 1. Upload File
        await uploadFile();

        // 2. Wait a moment
        await new Promise(r => setTimeout(r, 1000));

        // 3. Search
        await search('Margherita');

        console.log('\n✨ All tests passed!');
    } catch (err) {
        console.error('\n💥 Tests failed:', err.message);
        process.exit(1);
    }
}

runTests();
