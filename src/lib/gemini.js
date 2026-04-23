import { GoogleGenerativeAI } from "@google/generative-ai";

// TO THE USER: Generate your API Key at https://aistudio.google.com/
// Hardcoded here for the "Platinum Experience"
const GEMINI_API_KEY = "REPLACE_WITH_YOUR_GEMINI_KEY";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export const scanScoreboard = async (base64Image) => {
    try {
        if (GEMINI_API_KEY === "REPLACE_WITH_YOUR_GEMINI_KEY") {
            throw new Error("API KEY MALTANTE. Configúrala en src/lib/gemini.js");
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            Analiza esta imagen que es un scoreboard de pelea de gallos.
            Extrae los siguientes datos en formato JSON puro:
            - post_number: el número de la pelea (donde dice PELEA #).
            - gallo_a_name: el nombre del primer gallo (el de arriba/azul).
            - gallo_b_name: el nombre del segundo gallo (el de abajo/blanco).
            
            Si no estás seguro de alguno, pon null. 
            Responde SOLO el JSON, sin bloques de código markdown.
        `;

        const imageParts = [
            {
                inlineData: {
                    data: base64Image.split(',')[1],
                    mimeType: "image/png"
                }
            }
        ];

        const result = await model.generateContent([prompt, ...imageParts]);
        const response = await result.response;
        const text = response.text();
        
        // Clean markdown code blocks if any
        const cleanedJson = text.replace(/```json|```/g, "").trim();
        return JSON.parse(cleanedJson);
    } catch (error) {
        console.error("Gemini Scan Error:", error);
        throw error;
    }
};
