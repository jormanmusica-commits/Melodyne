import { GoogleGenAI, Type } from "@google/genai";
import { AudioAnalysisResult, Note } from "../types";

export const analyzeAudioWithGemini = async (
  base64Audio: string,
  mimeType: string,
  onProgress?: (msg: string) => void
): Promise<AudioAnalysisResult> => {
  if (!process.env.API_KEY) {
    throw new Error("Falta la clave API. Por favor configura la variable de entorno API_KEY.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  if (onProgress) onProgress("Enviando audio al motor neural de Gemini...");

  // We use gemini-2.5-flash for speed and good reasoning on audio inputs
  const modelId = "gemini-2.5-flash";

  // Keep prompt in English for better model adherence to schema, but the content will be musical data
  const prompt = `
    Analyze this audio file meticulously as a music producer. 
    1. Detect the overall musical key and scale (e.g., C Major, F# Minor).
    2. Estimate the Tempo (BPM).
    3. Perform a polyphonic transcription of the notes. 
       For each note event, provide:
       - MIDI note number (integer 21-108)
       - Start time in seconds (float)
       - Duration in seconds (float)
       - Velocity/Intensity (0.0 to 1.0)
    
    Return ONLY a valid JSON object.
  `;

  // Define strict schema for robust parsing
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      key: { type: Type.STRING, description: "Key and Scale, e.g. C Major" },
      scale: { type: Type.STRING, description: "Scale type, e.g. Major, Minor, Dorian" },
      bpm: { type: Type.NUMBER, description: "Tempo in Beats Per Minute" },
      notes: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            midi: { type: Type.INTEGER },
            startTime: { type: Type.NUMBER },
            duration: { type: Type.NUMBER },
            velocity: { type: Type.NUMBER }
          },
          required: ["midi", "startTime", "duration", "velocity"]
        }
      }
    },
    required: ["key", "scale", "bpm", "notes"]
  };

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.2 // Low temperature for factual analysis
      }
    });

    if (onProgress) onProgress("Procesando resultados del análisis...");

    const text = response.text;
    if (!text) throw new Error("Respuesta vacía de la IA");

    const data = JSON.parse(text);

    // Hydrate with IDs
    const notes: Note[] = data.notes.map((n: any, index: number) => ({
      ...n,
      id: `note-${index}-${Date.now()}`,
      selected: false
    }));

    return {
      key: data.key || "Desconocido",
      scale: data.scale || "Desconocido",
      bpm: data.bpm || 120,
      notes
    };

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};