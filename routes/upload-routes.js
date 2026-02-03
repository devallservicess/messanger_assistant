"use strict";

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ragService = require('../services/rag-service');

const router = express.Router();

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.csv', '.json', '.txt'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`File type ${ext} not allowed. Allowed types: ${allowedTypes.join(', ')}`));
        }
    }
});

// Upload a file and process it
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        console.log(`[Upload] Received file: ${req.file.originalname}`);

        // Process the file
        const source = await ragService.processFile(
            req.file.path,
            req.file.originalname
        );

        res.json({
            success: true,
            message: 'File processed successfully',
            data: source
        });

    } catch (err) {
        console.error('[Upload] Error:', err.message);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// Get all data sources
router.get('/data', (req, res) => {
    try {
        const sources = ragService.getDataSources();
        res.json({
            success: true,
            data: sources,
            totalDocuments: ragService.vectorStore.size
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// Delete a data source
router.delete('/data/:id', (req, res) => {
    try {
        const success = ragService.deleteDataSource(req.params.id);
        if (success) {
            res.json({
                success: true,
                message: 'Data source deleted'
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Data source not found'
            });
        }
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// Search for relevant documents
router.get('/search', async (req, res) => {
    try {
        const { q, k = 5 } = req.query;

        if (!q) {
            return res.status(400).json({
                success: false,
                error: 'Query parameter "q" is required'
            });
        }

        const results = await ragService.searchContext(q, parseInt(k));

        res.json({
            success: true,
            query: q,
            results
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// Health check for RAG service
router.get('/status', (req, res) => {
    res.json({
        success: true,
        status: 'RAG service is running',
        vectorStoreSize: ragService.vectorStore.size,
        dataSources: ragService.getDataSources().length
    });
});

module.exports = router;
