import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateRoomDescription = async (roomName: string, facilities: string[]): Promise<string> => {
  if (!process.env.API_KEY) return "AI Description unavailable (No API Key).";

  try {
    const prompt = `Write a professional and attractive description for a university laboratory room named "${roomName}". 
    It has the following facilities: ${facilities.join(', ')}. 
    The description should be about 2-3 sentences long, suitable for a booking system interface.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    return response.text || "No description generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Failed to generate description.";
  }
};

export const askAiAssistant = async (query: string, contextData: string): Promise<string> => {
   if (!process.env.API_KEY) return "AI unavailable.";

   try {
     const prompt = `You are an intelligent assistant for the FTI UKSW Laboratory Information System.
     Answer the user's question based on the following context about the lab system:
     
     ${contextData}
     
     User Question: ${query}
     
     Keep the answer concise and helpful.`;

     const response = await ai.models.generateContent({
       model: 'gemini-3-flash-preview',
       contents: prompt,
     });

     return response.text || "I could not understand that.";
   } catch (error) {
     console.error("Gemini Error:", error);
     return "Sorry, I am having trouble connecting right now.";
   }
};
