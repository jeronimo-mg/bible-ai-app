require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini3() {
    const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
    const genAI = new GoogleGenerativeAI(API_KEY);
    const modelId = "gemini-3-flash-preview";

    console.log(`Testing standard REST generation with: ${modelId}`);

    try {
        const model = genAI.getGenerativeModel({ model: modelId });
        const result = await model.generateContent("Explain: 'In the beginning was the Word'");

        console.log("Response received:");
        console.log(result.response.text());

    } catch (error) {
        console.error("Error testing Gemini 3:", error);
    }
}

testGemini3();
