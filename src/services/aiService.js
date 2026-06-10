import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyCBwn2aIm3G5U8FGtJa5mPII6ftNqldEkc";
const genAI = new GoogleGenerativeAI(apiKey);

export const getAIResponse = async (prompt, context = "") => {
  try {
    if (!apiKey) {
      return "Error: No se ha configurado la API Key de Gemini. Por favor, añádela al archivo .env como VITE_GEMINI_API_KEY.";
    }

    // Usamos el modelo sugerido por el usuario, que es estable y gratuito en 2026
    const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });

    const systemPrompt = `
      Eres "Consultor Pro", el motor de inteligencia de negocios de Gestionate Fácil.
      Tu misión es transformar datos en estrategias claras para el dueño del negocio.
      
      ESTRUCTURA DE RESPUESTA:
      1. ### 📊 Resumen Ejecutivo
      2. ### 🔍 Análisis de Datos
      3. ### 💡 Recomendaciones Estratégicas

      CONTEXTO DEL NEGOCIO:
      ${context}
    `;

    const fullPrompt = `${systemPrompt}\n\nPregunta: ${prompt}`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    return response.text();
    
  } catch (error) {
    console.error("Error en Google AI Logic:", error);
    return `Hubo un problema con la IA gratuita: ${error.message}. Verifica que tu API Key sea válida en Google AI Studio.`;
  }
};
