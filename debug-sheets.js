require('dotenv').config();
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

async function debugSheets() {
    console.log('🔍 Starting Google Sheets Debug Script...');

    // 1. Check Env Vars
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;

    console.log(`\n📋 Configuration Check:`);
    console.log(`- Sheet ID: ${sheetId ? '✅ Present (' + sheetId + ')' : '❌ Missing'}`);
    console.log(`- Service Email: ${email ? '✅ Present (' + email + ')' : '❌ Missing'}`);
    console.log(`- Private Key: ${privateKeyRaw ? '✅ Present (Length: ' + privateKeyRaw.length + ')' : '❌ Missing'}`);

    if (!sheetId || !email || !privateKeyRaw) {
        console.error('\n🛑 CRITICAL: Missing environment variables. Check your .env file.');
        return;
    }

    // 2. Process Private Key
    // Handle both actual newlines and escaped "\n" literals
    const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

    // Check if key looks valid
    if (!privateKey.includes('BEGIN PRIVATE KEY')) {
        console.error('\n🛑 CRITICAL: Private key seems invalid. It should contain "BEGIN PRIVATE KEY".');
        return;
    }

    try {
        // 3. Authenticate
        console.log('\n🔑 Authenticating with Google...');
        const jwt = new JWT({
            email: email,
            key: privateKey,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(sheetId, jwt);

        // 4. Load Document Info
        console.log('📥 Loading Document Info...');
        await doc.loadInfo();
        console.log(`✅ Success! Connected to document: "${doc.title}"`);

        // 5. Check Permissions / Sheets
        const sheet = doc.sheetsByIndex[0];
        console.log(`📄 Using Sheet Index 0: "${sheet.title}"`);

        try {
            await sheet.loadHeaderRow();
            console.log(`   - Headers found: ${sheet.headerValues.join(', ')}`);
        } catch (e) {
            console.log('   - No headers found (Empty sheet?) - Setting them now...');
            await sheet.setHeaderRow(['Date', 'Nom Client', 'Téléphone', 'Adresse', 'Commande', 'Total', 'Statut']);
        }

        // 6. Try to Add a Row
        console.log('\n📝 Attempting to add a test row...');
        const testRow = {
            Date: new Date().toLocaleString(),
            'Nom Client': 'Debug User',
            'Téléphone': '00000000',
            'Adresse': 'Debug Address',
            'Commande': 'Test Item',
            'Total': '0.00',
            'Statut': 'DEBUG'
        };

        const row = await sheet.addRow(testRow);
        console.log('✅ Row added successfully!');
        console.log('   - Row Number:', row.rowIndex);

    } catch (err) {
        console.error('\n💥 ERROR OCCURRED:');
        console.error(err.message);

        if (err.message.includes('invalid_grant')) {
            console.error('👉 TIP: Check your GOOGLE_PRIVATE_KEY. It might be malformed or expired.');
        } else if (err.message.includes('403')) {
            console.error(`👉 TIP: The service account (${email}) might not have access to this Sheet.`);
            console.error(`   Action: Open the Google Sheet -> Share -> Add ${email} as Editor.`);
        } else if (err.message.includes('404')) {
            console.error('👉 TIP: Sheet ID might be incorrect or the Sheet does not exist.');
        }
    }
}

debugSheets();
