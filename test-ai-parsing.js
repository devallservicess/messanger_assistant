
const assert = require('assert');

// Mock response from AI properly formatted
const aiResponseWithType = `Merci Jean ! Votre commande a bien été enregistrée. Elle arrivera au 10 rue de la Paix dans environ 30-40 minutes. Bon appétit ! 🍕
\`\`\`json
{
  "order_confirmed": true,
  "customer_name": "Jean",
  "phone_number": "0612345678",
  "address": "10 rue de la Paix",
  "items": "1 Pizza Margherita, 1 Coca",
  "total": "19.000 DT"
}
\`\`\`
`;

const aiResponseWithoutType = `Merci Jean ! Votre commande a bien été enregistrée. Elle arrivera au 10 rue de la Paix dans environ 30-40 minutes. Bon appétit ! 🍕
\`\`\`
{
  "order_confirmed": true,
  "customer_name": "Jean",
  "phone_number": "0612345678",
  "address": "10 rue de la Paix",
  "items": "1 Pizza Margherita, 1 Coca",
  "total": "19.000 DT"
}
\`\`\`
`;

function testParsing(response, label) {
    console.log(`Testing: ${label}`);

    // Updated Regex to be more permissive (with or without 'json' tag)
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);

    if (jsonMatch) {
        try {
            const orderData = JSON.parse(jsonMatch[1]);
            if (orderData.order_confirmed) {
                console.log("✅ JSON Block detected and parsed:");
                console.log(orderData);

                const cleanResponse = response.replace(/```(?:json)?\s*[\s\S]*?\s*```/, '').trim();
                console.log("✅ Cleaned Response:");
                console.log(`"${cleanResponse}"`);

                if (cleanResponse.includes('```')) {
                    console.error("❌ Failed to strip code block completely");
                }
            }
        } catch (e) {
            console.error("❌ JSON detected but parse error:", e.message);
        }
    } else {
        console.error("❌ No JSON block detected");
    }
    console.log('-'.repeat(40));
}

testParsing(aiResponseWithType, "Standard Response with ```json");
// testParsing(aiResponseWithoutType, "Response with ``` only (Fallback)");
// Note: current regex in ai-response.js is /```json\s*([\s\S]*?)\s*```/ which requires 'json'
// If we want to support both, we should update the regex in the main file.
