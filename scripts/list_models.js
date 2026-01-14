require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
    const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
    if (!API_KEY) {
        console.error("Erro: API KEY não encontrada no .env");
        return;
    }

    const genAI = new GoogleGenerativeAI(API_KEY);

    try {
        // Note: The JS SDK might not expose listModels directly on the main class in all versions, 
        // but let's try the standard method if available or just test common names.
        // Actually, for the SDK, we often just try getGenerativeModel. 
        // There isn't a simple "listModels" in the high-level client always exposed easily without model manager.
        // We will try to fetch the ModelManager if possible, otherwise we infer.
        // Let's try to access the model list via the raw API fetch if needed, but 
        // standard SDK usually has it.

        // Correct way in some SDK versions:
        // const response = await genAI.getModelManager().listModels();
        // But let's try a direct fetch to the API endpoint to be sure if SDK fails.

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        const data = await response.json();

        if (data.models) {
            console.log("Modelos Disponíveis:");
            data.models.forEach(m => {
                console.log(`- ${m.name} (${m.displayName})`);
            });
        } else {
            console.log("Não foi possível listar modelos via API REST:", data);
        }

    } catch (error) {
        console.error(error);
    }
}

listModels();
