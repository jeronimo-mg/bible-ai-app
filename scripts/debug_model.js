require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testModel() {
    const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
    if (!API_KEY) {
        console.error("Erro: API KEY não encontrada no .env");
        return;
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const modelName = "gemini-2.5-flash-lite";

    console.log(`Testando modelo: ${modelName}...`);

    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Olá, isso é um teste de texto.");
        const response = await result.response.text();
        console.log("Sucesso! Resposta:", response);
    } catch (error) {
        console.error("Erro detalhado:");
        console.error(error);
        if (error.response) {
            console.error("Dados da resposta de erro:", JSON.stringify(error.response, null, 2));
        }
    }
}

testModel();
