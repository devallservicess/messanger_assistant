"use strict";

const Groq = require("groq-sdk");
const ragService = require("./rag-service");
const sheetsService = require("./sheets-service");

// Create the Groq instance with the API key
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * System prompt to define the assistant's behavior
 * Customize this prompt according to your needs
 */

/**
 * System prompt to define the assistant's behavior
 */
const SYSTEM_PROMPT = `Tu es un assistant virtuel (serveur/caissier) pour Jasper's Market, un restaurant/supermarché convivial.

TON RÔLE:
1. Accueillir les clients chaleureusement.
2. Aider à choisir dans le menu (pizzas, sandwichs, boissons, desserts, etc.). Utilise les données fournies pour les prix et ingrédients.
3. Prendre la commande du client.

RÈGLES CRUCIALES POUR LA PRISE DE COMMANDE:
- Tu ne dois JAMAIS valider une commande sans avoir obtenu ces 3 informations OBLIGATOIRES :
  1. **Nom du client**
  2. **Numéro de téléphone**
  3. **Adresse de livraison** (ou préciser "sur place/à emporter" si applicable)
- Si une information manque, demande-la poliment avant de confirmer.

FORMAT DE CONFIRMATION (IMPORTANT):
Lorsque la commande est COMPLÈTE et CONFIRMÉE par le client, tu dois générer un bloc JSON *caché* à la fin de ta réponse pour que le système puisse l'enregistrer.
Le format doit être EXACTEMENT celui-ci :

\`\`\`json
{
  "order_confirmed": true,
  "customer_name": "Nom du client",
  "phone_number": "Numéro de téléphone",
  "address": "Adresse complète",
  "items": "Liste détaillée des articles avec quantités",
  "total": "Prix total approximatif (si connu, sinon 'À calculer')"
}
\`\`\`

Ne montre PAS ce bloc JSON au client. Contente-toi de lui confirmer que la commande est prise en compte et qu'elle va être préparée.

EXEMPLE D'INTERACTION FINALE:
Client: "Oui c'est bon, je m'appelle Jean, 0612345678, j'habite au 10 rue de la Paix."
Assistant: "Merci Jean ! Votre commande a bien été enregistrée. Elle arrivera au 10 rue de la Paix dans environ 30-40 minutes. Bon appétit ! 🍕"
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

INFORMATIONS SUR JASPER'S MARKET:
- Horaires: Lundi-Samedi 8h-20h, Dimanche 9h-18h
- Services: Livraison à domicile, commande en ligne, produits frais
- Spécialités: Produits bio, fruits et légumes frais, boulangerie artisanale

RÈGLES DE CONVERSATION:
- Utilise les INFORMATIONS DU MAGASIN (fournies par le contexte) pour les prix exacts.
- Sois enthousiaste, utilise des emojis 🍕🥗🍹.
- Réponses courtes pour WhatsApp.`;

/**
 * Generates an AI response for a received message using Groq
 * Enhanced with RAG context from store data
 * @param {string} messageText - The user's message
 * @param {string} userPhone - User's phone number (optional)
 * @returns {Promise<string>}
 */
async function generateAIResponse(messageText, userPhone = null) {
  try {
    console.log(`[AI/Groq] Génération de réponse pour: "${messageText}"`);

    // Get relevant context from RAG system
    const ragContext = await ragService.getContextForQuery(messageText);

    // Build system prompt with RAG context
    const enhancedPrompt = SYSTEM_PROMPT + ragContext;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: enhancedPrompt },
        { role: "user", content: messageText }
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    let aiResponse = completion.choices[0].message.content;
    console.log(`[AI/Groq] RAW RESPONSE:`, aiResponse); // Verbose logging

    // Check for JSON order block (permissive regex: json tag optional)
    const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const jsonContent = jsonMatch[1];
        console.log(`[AI] Potential JSON block found:`, jsonContent);

        const orderData = JSON.parse(jsonContent);
        if (orderData.order_confirmed) {
          console.log("[AI] Commande détectée et validée !", orderData);

          // Save to Google Sheets
          const saveResult = await sheetsService.appendOrder({
            customerName: orderData.customer_name,
            phoneNumber: orderData.phone_number,
            address: orderData.address,
            items: orderData.items,
            total: orderData.total,
            status: 'Reçu'
          });

          if (saveResult) {
            console.log("[AI] Order saved to Sheets successfully.");
          } else {
            console.error("[AI] Failed to save order to Sheets.");
          }

          // Remove the JSON block from the response sent to the user
          aiResponse = aiResponse.replace(/```(?:json)?\s*[\s\S]*?\s*```/, '').trim();
        }
      } catch (e) {
        console.error("[AI] Erreur parsing JSON commande:", e);
      }
    } else {
      console.log("[AI] No JSON block detected in response.");
    }

    console.log(`[AI/Groq] Réponse finale envoyée: "${aiResponse.substring(0, 50)}..."`);
    return aiResponse;

  } catch (err) {
    console.error("[AI/Groq] Erreur lors de la génération:", err.message);
    return "Désolé, je rencontre un problème technique. Un membre de notre équipe vous répondra bientôt. Merci de votre patience ! 🙏";
  }
}

/**
 * Variante avec historique de conversation (optionnel, pour une future amélioration)
 * @param {Array} conversationHistory - Tableau de messages [{role, content}]
 * @returns {Promise<string>}
 */
async function generateAIResponseWithHistory(conversationHistory) {
  // Not implemented fully yet, using similar logic if needed
  return generateAIResponse(conversationHistory[conversationHistory.length - 1].content);
}

module.exports = {
  generateAIResponse,
  generateAIResponseWithHistory
};