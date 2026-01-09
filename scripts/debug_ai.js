
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GOOGLE_API_KEY);

async function run() {
    console.log("Listing available models...");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Dummy for init, not used for list
        // Actually listModels is on the client or we can just try to iterate if specific method exists, 
        // but the SDK structure is slightly different. 
        // Let's use the underlying format if known, or just error output usually suggests correct names.
        // Better yet, let's try the direct list logic if available in this SDK version.

        // SDK 0.1.3+ supports fetching model list? 
        // Let's just try to fetch the specific one User saw "gemma-3-2b-it" and "gemma-3-2b"

        console.log("Testing gemma-3-12b-it...");
        try {
            const m1 = genAI.getGenerativeModel({ model: "gemma-3-12b-it" });
            await m1.generateContent("test");
            console.log("gemma-3-12b-it EXISTS");
        } catch (e) { console.log("gemma-3-12b-it FAILED:", e.message); }

        console.log("Testing gemma-3-12b...");
        try {
            const m2 = genAI.getGenerativeModel({ model: "gemma-3-12b" });
            await m2.generateContent("test");
            console.log("gemma-3-12b EXISTS");
        } catch (e) { console.log("gemma-3-12b FAILED:", e.message); }

    } catch (error) {
        console.error("Fatal:", error);
    }
}
run();
