"use strict";

const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const config = require('./config');

class SheetsService {
    constructor() {
        this.doc = null;
        this.sheetId = config.googleSheetId;
        this.serviceAccountEmail = config.googleServiceAccountEmail;
        this.privateKey = config.googlePrivateKey ? config.googlePrivateKey.replace(/\\n/g, '\n') : null;
    }

    /**
     * Initialize authentication and load the document
     */
    async init() {
        if (this.doc) return; // Already initialized

        if (!this.sheetId || !this.serviceAccountEmail || !this.privateKey) {
            console.warn('[Sheets] Missing credentials, sheets integration disabled.');
            return;
        }

        try {
            const jwt = new JWT({
                email: this.serviceAccountEmail,
                key: this.privateKey,
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });

            this.doc = new GoogleSpreadsheet(this.sheetId, jwt);
            await this.doc.loadInfo();
            console.log(`[Sheets] Connected to document: ${this.doc.title}`);
        } catch (err) {
            console.error('[Sheets] Initialization check failed:', err.message);
            // Don't throw here to avoid crashing the app on startup if sheets fail
        }
    }

    /**
     * Append a new order row to the first sheet
     * @param {Object} orderDetails - { date, customerName, phoneNumber, address, items, total, status }
     */
    async appendOrder(orderDetails) {
        try {
            if (!this.doc) await this.init();
            if (!this.doc) throw new Error('Sheets integration not active');

            const sheet = this.doc.sheetsByIndex[0]; // Use the first sheet

            // Ensure headers are loaded
            await sheet.loadHeaderRow();

            // If headers are missing or empty (new sheet), set them
            if (!sheet.headerValues || sheet.headerValues.length === 0) {
                console.log('[Sheets] Setting up new sheet headers...');
                await sheet.setHeaderRow(['Date', 'Nom Client', 'Téléphone', 'Adresse', 'Commande', 'Total', 'Statut']);
            }

            const row = {
                Date: new Date().toLocaleString(),
                'Nom Client': orderDetails.customerName || 'N/A',
                'Téléphone': orderDetails.phoneNumber || 'N/A',
                'Adresse': orderDetails.address || 'N/A',
                'Commande': orderDetails.items || 'N/A',
                'Total': orderDetails.total || 'N/A',
                'Statut': orderDetails.status || 'Reçu'
            };

            await sheet.addRow(row);
            console.log(`[Sheets] Order added for ${orderDetails.customerName}`);
            return true;
        } catch (err) {
            console.error('[Sheets] Failed to add row:', err.message);
            return false;
        }
    }
}

// Singleton instance
const sheetsService = new SheetsService();

module.exports = sheetsService;
