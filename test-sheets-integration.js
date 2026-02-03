const sheetsService = require('./services/sheets-service');

async function runTest() {
    console.log('Testing Sheets Service...');

    // Mock order data
    const mockOrder = {
        customerName: 'Test User',
        phoneNumber: '123456789',
        address: '123 Test St',
        items: '1x Pizza Test',
        total: '15.000 DT',
        status: 'Test'
    };

    try {
        const result = await sheetsService.appendOrder(mockOrder);

        if (result) {
            console.log('✅ Order successfully appended (or would be if creds were valid)');
        } else {
            console.log('❌ Failed to append order (Expected if no credentials are set)');
        }
    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }
}

runTest();
