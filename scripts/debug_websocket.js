require('dotenv').config();
const WebSocket = require('ws');

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
const HOST = "generativelanguage.googleapis.com";
const PATH = "/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";
const URL = `wss://${HOST}${PATH}?key=${API_KEY}`;

// Test 0: Public Echo (Sanity Check)
function testEcho() {
    console.log("\n--- Testing Public Echo (wss://echo.websocket.org) ---");
    const ws = new WebSocket('wss://echo.websocket.org');

    ws.on('open', () => {
        console.log('Echo Connected!');
        ws.send("Hello Echo");
        ws.close();
    });

    ws.on('error', (e) => console.error('Echo Error:', e));
}

function testConnection(modelId) {
    console.log(`\n--- Testing Model: ${modelId} ---`);
    // No extra headers, as they caused 1006
    const ws = new WebSocket(URL);

    ws.on('open', () => {
        console.log("Connected to Google!");

        const setupMsg = {
            setup: {
                model: modelId,
                generation_config: {
                    response_modalities: ["TEXT"]
                }
            }
        };
        console.log("Sending setup:", JSON.stringify(setupMsg, null, 2));
        ws.send(JSON.stringify(setupMsg));
    });

    ws.on('message', (data) => {
        console.log("Google Received:", data.toString());
    });

    ws.on('close', (code, reason) => {
        console.log(`Google Closed. Code: ${code}, Reason: ${reason}`);
    });

    ws.on('error', (err) => {
        console.error("Google Error:", err);
    });
}

// Sequence
console.log("Starting tests...");
testEcho();

setTimeout(() => {
    // User's latest finding:
    // MODEL = "models/gemini-2.5-flash-native-audio-preview-12-2025"
    testConnection("models/gemini-2.5-flash-native-audio-preview-12-2025");
}, 5000);
