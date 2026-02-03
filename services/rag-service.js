"use strict";

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// Simple in-memory vector store implementation
// Uses cosine similarity for search
class SimpleVectorStore {
    constructor() {
        this.documents = [];
        this.embeddings = [];
        this.metadata = [];
    }

    // Add documents with their embeddings
    addDocuments(docs, embeddings, metadata = []) {
        for (let i = 0; i < docs.length; i++) {
            this.documents.push(docs[i]);
            this.embeddings.push(embeddings[i]);
            this.metadata.push(metadata[i] || {});
        }
    }

    // Cosine similarity between two vectors
    cosineSimilarity(vecA, vecB) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    // Search for similar documents
    search(queryEmbedding, k = 5) {
        const scores = this.embeddings.map((emb, idx) => ({
            score: this.cosineSimilarity(queryEmbedding, emb),
            document: this.documents[idx],
            metadata: this.metadata[idx],
            index: idx
        }));

        scores.sort((a, b) => b.score - a.score);
        return scores.slice(0, k);
    }

    // Clear all data
    clear() {
        this.documents = [];
        this.embeddings = [];
        this.metadata = [];
    }

    // Get document count
    get size() {
        return this.documents.length;
    }

    // Serialize to JSON
    toJSON() {
        return {
            documents: this.documents,
            embeddings: this.embeddings,
            metadata: this.metadata
        };
    }

    // Load from JSON
    fromJSON(data) {
        this.documents = data.documents || [];
        this.embeddings = data.embeddings || [];
        this.metadata = data.metadata || [];
    }
}

// Global vector store instance
const vectorStore = new SimpleVectorStore();

// Data sources tracking
const dataSources = [];

// Data storage path
const DATA_DIR = path.join(__dirname, '..', 'rag-data');
const VECTOR_STORE_PATH = path.join(DATA_DIR, 'vector-store.json');
const SOURCES_PATH = path.join(DATA_DIR, 'sources.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load existing data on startup
function loadPersistedData() {
    try {
        if (fs.existsSync(VECTOR_STORE_PATH)) {
            const data = JSON.parse(fs.readFileSync(VECTOR_STORE_PATH, 'utf8'));
            vectorStore.fromJSON(data);
            console.log(`[RAG] Loaded ${vectorStore.size} documents from vector store`);
        }
        if (fs.existsSync(SOURCES_PATH)) {
            const sources = JSON.parse(fs.readFileSync(SOURCES_PATH, 'utf8'));
            dataSources.push(...sources);
            console.log(`[RAG] Loaded ${dataSources.length} data sources`);
        }
    } catch (err) {
        console.error('[RAG] Error loading persisted data:', err.message);
    }
}

// Save data to disk
function persistData() {
    try {
        fs.writeFileSync(VECTOR_STORE_PATH, JSON.stringify(vectorStore.toJSON()));
        fs.writeFileSync(SOURCES_PATH, JSON.stringify(dataSources));
        console.log('[RAG] Data persisted to disk');
    } catch (err) {
        console.error('[RAG] Error persisting data:', err.message);
    }
}

// Simple text embedding using TF-IDF-like approach
// This is a fallback when no embedding API is available
function simpleTextEmbedding(text, vocabSize = 4096) {
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(vocabSize).fill(0);

    for (const word of words) {
        // Hash the word to get a position in the embedding
        let hash = 0;
        for (let i = 0; i < word.length; i++) {
            hash = ((hash << 5) - hash) + word.charCodeAt(i);
            hash = hash & hash;
        }
        const idx = Math.abs(hash) % vocabSize;
        embedding[idx] += 1;
    }

    // Normalize
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
        for (let i = 0; i < embedding.length; i++) {
            embedding[i] /= norm;
        }
    }

    return embedding;
}

// Generate embeddings for text chunks
async function generateEmbeddings(texts) {
    // Use simple text embedding (works without external API)
    return texts.map(text => simpleTextEmbedding(text));
}

// Parse file content based on type
function parseFileContent(filePath, originalName) {
    const ext = path.extname(originalName).toLowerCase();
    const content = fs.readFileSync(filePath, 'utf8');
    const chunks = [];

    if (ext === '.csv') {
        // Parse CSV
        const records = parse(content, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        // Convert each row to a text chunk
        for (const record of records) {
            const text = Object.entries(record)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ');
            chunks.push({
                text,
                metadata: { ...record, source: originalName, type: 'csv' }
            });
        }
    } else if (ext === '.json') {
        // Parse JSON
        const data = JSON.parse(content);
        let items = [];

        // Check for restaurant menu structure
        if (data.restaurant_menu && Array.isArray(data.restaurant_menu.categories)) {
            for (const category of data.restaurant_menu.categories) {
                // Direct items in category
                if (Array.isArray(category.items)) {
                    for (const item of category.items) {
                        items.push({
                            ...item,
                            category: category.category_name,
                            _text_context: `${item.name} - ${category.category_name} - ${item.description || ''} - ${item.price || ''}`
                        });
                    }
                }
                // Items in subcategories
                if (Array.isArray(category.subcategories)) {
                    for (const sub of category.subcategories) {
                        if (Array.isArray(sub.items)) {
                            for (const item of sub.items) {
                                items.push({
                                    ...item,
                                    category: category.category_name,
                                    subcategory: sub.subcategory_name,
                                    _text_context: `${item.name} - ${category.category_name} > ${sub.subcategory_name} - ${item.description || ''} - ${item.price || ''}`
                                });
                            }
                        }
                    }
                }
            }
        } else {
            // Default flat list or single item
            items = Array.isArray(data) ? data : [data];
        }

        for (const item of items) {
            let text = '';
            if (item._text_context) {
                text = item._text_context;
                delete item._text_context;
            } else {
                text = typeof item === 'string'
                    ? item
                    : Object.entries(item)
                        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
                        .join(', ');
            }

            chunks.push({
                text,
                metadata: { ...(typeof item === 'object' ? item : {}), source: originalName, type: 'json' }
            });
        }
    } else {
        // Plain text - split by paragraphs or sentences
        const paragraphs = content.split(/\n\n+/).filter(p => p.trim());

        for (const para of paragraphs) {
            if (para.trim().length > 10) {
                chunks.push({
                    text: para.trim(),
                    metadata: { source: originalName, type: 'text' }
                });
            }
        }
    }

    return chunks;
}

// Process and add file to vector store
async function processFile(filePath, originalName) {
    console.log(`[RAG] Processing file: ${originalName}`);

    // Parse file content
    const chunks = parseFileContent(filePath, originalName);
    console.log(`[RAG] Extracted ${chunks.length} chunks from file`);

    if (chunks.length === 0) {
        throw new Error('No content could be extracted from the file');
    }

    // Generate embeddings
    const texts = chunks.map(c => c.text);
    const embeddings = await generateEmbeddings(texts);

    // Add to vector store
    const metadataList = chunks.map(c => c.metadata);
    vectorStore.addDocuments(texts, embeddings, metadataList);

    // Track data source
    const sourceId = Date.now().toString();
    const source = {
        id: sourceId,
        name: originalName,
        chunks: chunks.length,
        uploadedAt: new Date().toISOString()
    };
    dataSources.push(source);

    // Persist to disk
    persistData();

    console.log(`[RAG] Added ${chunks.length} documents to vector store`);
    return source;
}

// Search for relevant context
async function searchContext(query, k = 5) {
    if (vectorStore.size === 0) {
        return [];
    }

    const queryEmbedding = simpleTextEmbedding(query);
    const results = vectorStore.search(queryEmbedding, k);

    return results.map(r => ({
        text: r.document,
        score: r.score,
        metadata: r.metadata
    }));
}

// Get context string for AI prompt
async function getContextForQuery(query) {
    const results = await searchContext(query, 5);

    if (results.length === 0) {
        return '';
    }

    // Filter by relevance score (threshold)
    const relevant = results.filter(r => r.score > 0.1);

    if (relevant.length === 0) {
        return '';
    }

    const contextParts = relevant.map(r => r.text);
    return `\n\nINFORMATIONS DU MAGASIN (données actuelles):\n${contextParts.join('\n')}`;
}

// Get all data sources
function getDataSources() {
    return dataSources;
}

// Delete a data source
function deleteDataSource(sourceId) {
    const idx = dataSources.findIndex(s => s.id === sourceId);
    if (idx === -1) {
        return false;
    }

    const source = dataSources[idx];
    dataSources.splice(idx, 1);

    // Clear and rebuild vector store (simple approach)
    // In production, you'd want to track which documents belong to which source
    // For now, we'll need to re-process all remaining files

    persistData();
    return true;
}

// Initialize - load persisted data
loadPersistedData();

module.exports = {
    processFile,
    searchContext,
    getContextForQuery,
    getDataSources,
    deleteDataSource,
    vectorStore
};
