const ragService = require('./services/rag-service');
const path = require('path');

async function runTest() {
    console.log('Starting standalone RAG test...');

    try {
        // Clear existing data for clean test
        ragService.vectorStore.clear();
        console.log('🧹 Cleared vector store');

        // Path to menu.json
        const filePath = path.join(__dirname, 'menu.json');

        // 1. Process the file
        console.log('Processing menu.json...');
        const source = await ragService.processFile(filePath, 'menu.json');
        console.log('✅ File processed. Source info:', source);

        if (source.chunks <= 1) {
            console.warn('⚠️ WARNING: Chunk count is 1. This indicates flattening might have failed.');
        } else {
            console.log(`✅ Success: Created ${source.chunks} chunks from menu.json`);
        }

        // 2. Search
        const query = 'Margherita';
        console.log(`\nSearching for "${query}"...`);
        const results = await ragService.searchContext(query, 5);

        if (results.length > 0) {
            console.log('✅ Found results:');
            results.forEach((r, i) => {
                console.log(`${i + 1}. [${r.score.toFixed(3)}] ${r.text.substring(0, 100)}...`);
            });
        } else {
            console.log('❌ No results found.');
        }

    } catch (err) {
        console.error('❌ Test failed:', err);
    }
}

runTest();
