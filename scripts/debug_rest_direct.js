require('dotenv').config();

async function testDirectRest() {
    const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
    const modelName = "gemini-2.5-flash-native-audio-dialog";
    const url = `https://generativelanguage.googleapis.com/v1alpha/models/${modelName}:generateContent?key=${API_KEY}`;

    console.log(`Testando POST direto para: ${url.split('?')[0]}`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    role: "user",
                    parts: [{ text: "Olá" }]
                }]
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log("SUCESSO (REST)!");
            console.log(JSON.stringify(data, null, 2));
        } else {
            console.log(`ERRO ${response.status}: ${response.statusText}`);
            const errorText = await response.text();
            console.log(errorText);
        }

    } catch (error) {
        console.error("Erro de rede:", error);
    }
}

testDirectRest();
