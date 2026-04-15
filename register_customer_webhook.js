const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const MONDAY_API_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjYzNDUxOTgzOCwiYWFpIjoxMSwidWlkIjoxMDAwNzQ4MzcsImlhZCI6IjIwMjYtMDMtMThUMDQ6NTQ6MDEuMDAwWiIsInBlciI6Im1lOndyaXRlIiwiYWN0aWQiOjMzNzgzOTM5LCJyZ24iOiJ1c2UxIn0.NlBefIgLNM9S_tQgdcdfXYIRlQ07giZEjJtUiQi8idc";
const BOARD_ID = "18400951947"; // CUSTOMERS
const WEBHOOK_URL = "https://monday-linker-backend.onrender.com/api/webhooks/monday/item-created";

const query = `
mutation {
  create_webhook (board_id: ${BOARD_ID}, url: "${WEBHOOK_URL}", event: create_item) {
    id
  }
}
`;

async function registerWebhook() {
  console.log("Registering Customer Webhook...");
  try {
    const response = await fetch("https://api.monday.com/v2", {
      method: 'POST',
      headers: {
        'Authorization': MONDAY_API_TOKEN,
        'Content-Type': 'application/json',
        'API-Version': '2024-01'
      },
      body: JSON.stringify({ query })
    });

    const data = await response.json();

    if (data.errors) {
      console.error("Monday API Error:", JSON.stringify(data.errors, null, 2));
    } else {
      console.log("✓ Success! Customer Webhook Registered ID:", data.data.create_webhook.id);
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

registerWebhook();
