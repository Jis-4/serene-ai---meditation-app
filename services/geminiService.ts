
import { GoogleGenAI, Modality } from "@google/genai";

let ai: GoogleGenAI;
try {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
} catch(e) {
    console.error("Failed to initialize GoogleGenAI. Is the API key set?", e);
    // In a real app, you'd want to show a user-friendly error message.
}

export const generateImagePrompt = async (scriptText: string): Promise<string | null> => {
    if(!ai) return null;
    try {
        const prompt = `Based on the following meditation script, create a single, concise, visually descriptive prompt for an image generation model. The prompt should capture the essence and mood of the script, focusing on serene and calming imagery.

        Script: "${scriptText}"
        
        Image Prompt:`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error generating image prompt:", error);
        return null;
    }
};


export const generateMeditationImage = async (prompt: string): Promise<string | null> => {
    if (!ai) return null;
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '1:1',
            },
        });
        
        if (response.generatedImages && response.generatedImages.length > 0) {
            return response.generatedImages[0].image.imageBytes;
        }
        return null;
    } catch (error) {
        console.error('Error generating image:', error);
        return null;
    }
};

export const generateMeditationAudio = async (text: string): Promise<string | null> => {
    if (!ai) return null;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Speak in a calm, soothing, and gentle voice. Add appropriate pauses for meditation: ${text}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' }, // A calming voice
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return base64Audio || null;
    } catch (error) {
        console.error('Error generating audio:', error);
        return null;
    }
};
