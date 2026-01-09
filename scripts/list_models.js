
const https = require('https');
require('dotenv').config();

const apiKey = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.models) {
                console.log("Available Models:");
                json.models.forEach(m => {
                    if (m.name.includes('gemma')) {
                        console.log(`- ${m.name} (${m.displayName})`);
                    }
                });
            } else {
                console.log("No models found or error:", json);
            }
        } catch (e) {
            console.error(e.message);
        }
    });
}).on('error', (err) => {
    console.error("Error: " + err.message);
});
