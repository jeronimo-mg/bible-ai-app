require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
    const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
    const genAI = new GoogleGenerativeAI(API_KEY);

    console.log("--- Listing models (v1beta) ---");
    try {
        // Direct fetch to v1beta models endpoint to bypass SDK types if needed, 
        // but SDK usually wraps this well. Let's try direct fetch for raw output.
        const responseup = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        const data = await responseup.json();
        if (data.models) {
            data.models.forEach(m => console.log(`v1beta: ${m.name}`));
        } else {
            console.log("No models found in v1beta response:", data);
        }
    } catch (e) {
        console.error("v1beta error:", e.message);
    }

    console.log("\n--- Listing models (v1alpha) ---");
    try {
        const responseup = await fetch(`https://generativelanguage.googleapis.com/v1alpha/models?key=${API_KEY}`);
        const data = await responseup.json();
        if (data.models) {
            data.models.forEach(m => console.log(`v1alpha: ${m.name}`));
        } else {
            console.log("No models found in v1alpha response:", data);
        }
    } catch (e) {
        console.error("v1alpha error:", e.message);
    }
}

listModels();
