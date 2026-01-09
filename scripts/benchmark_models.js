
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GOOGLE_API_KEY);

const prompt = `
Contexto Bibliográfico: Mateus Capítulo 5
Texto Completo do Capítulo: 
"""
Bem-aventurados os pobres de espírito, porque deles é o reino dos céus.
Bem-aventurados os que choram, porque eles serão consolados.
"""

ALVO DA ANÁLISE:
Texto Selecionado: "pobres de espírito"
Localização Exata: Mateus 5:3

Instrução Crítica: O texto selecionado ("pobres de espírito") pode aparecer múltiplas vezes neste capítulo.
Você DEVE explicar o significado dele APENAS no contexto do versículo Mateus 5:3.
Ignore qualquer outra ocorrência dessa palavra em outros versículos.
Explique o que "pobres de espírito" significa EM Mateus 5:3. Máximo 3 frases.`;

async function benchmark(modelName) {
    console.log(`Testing ${modelName}...`);
    const times = [];
    const model = genAI.getGenerativeModel({ model: modelName });

    for (let i = 0; i < 3; i++) {
        const start = Date.now();
        try {
            await model.generateContent(prompt);
            const duration = Date.now() - start;
            times.push(duration);
            console.log(`   Run ${i + 1}: ${duration}ms`);
        } catch (e) {
            console.error(`   Run ${i + 1}: FAILED (${e.message})`);
        }
    }

    if (times.length > 0) {
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        console.log(`Average for ${modelName}: ${Math.round(avg)}ms\n`);
    }
}

async function run() {
    await benchmark("gemma-3-12b-it");
    await benchmark("gemma-3-27b-it");
}

run();
