require('dotenv').config();

async function listModelsAlpha() {
    const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
    if (!API_KEY) {
        console.error("Erro: API KEY não encontrada no .env");
        return;
    }

    console.log("Consultando API v1alpha...");
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1alpha/models?key=${API_KEY}`);
        const data = await response.json();

        if (data.models) {
            console.log("Modelos Disponíveis (v1alpha):");
            const targetModel = data.models.find(m => m.name.includes('native-audio-dialog'));

            if (targetModel) {
                console.log("\n!!! MODELO ENCONTRADO !!!");
                console.log(JSON.stringify(targetModel, null, 2));
            } else {
                console.log("Modelo 'native-audio-dialog' NÃO encontrado na lista completa.");
            }

            // Log all for verify
            data.models.forEach(m => {
                if (m.name.includes('gemini-2.5')) {
                    console.log(`- ${m.name}`);
                }
            });

        } else {
            console.log("Erro ao listar modelos:", data);
        }

    } catch (error) {
        console.error(error);
    }
}

listModelsAlpha();
