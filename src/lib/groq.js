import { rawFetch } from "./supabase";

export const scanScoreboardWithGroq = async (base64Image) => {
    try {
        // 1. Get API Key from current settings (already fetched in AdminDashboard or we fetch directly here)
        const settings = await rawFetch('settings');
        const groqKey = settings.find(s => s.id === 'groq_api_key')?.value;

        if (!groqKey || groqKey.length < 10) {
            throw new Error("API KEY DE GROQ NO CONFIGURADA. Ve a la pestaña de ajustes en el panel admin.");
        }

        const prompt = `
            Analyze this image of a cockfighting scoreboard. 
            Extract:
            - post_number (integer or string)
            - gallo_a_name (string, top rooster)
            - gallo_b_name (string, bottom rooster)
            
            Return ONLY a valid JSON object. 
            Example: {"post_number": 3, "gallo_a_name": "DOCTOR ROSSO", "gallo_b_name": "TBA. DE LEON"}
        `;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${groqKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.2-11b-vision-preview",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
                            {
                                type: "image_url",
                                image_url: {
                                    url: base64Image
                                }
                            }
                        ]
                    }
                ],
                temperature: 0.1,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || "Error en la API de Groq");
        }

        const result = await response.json();
        const content = result.choices[0].message.content;
        return JSON.parse(content);
    } catch (error) {
        console.error("Groq Scan Error:", error);
        throw error;
    }
};
