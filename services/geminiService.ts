
import { GoogleGenAI, Type } from "@google/genai";
import { Analysis } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "A concise, comprehensive summary of the entire document's content.",
    },
    criticalFindings: {
      type: Type.ARRAY,
      description: "A list of the most important, actionable insights, or key data points from the document.",
      items: { type: Type.STRING },
    },
    costAndRiskAnalysis: {
      type: Type.OBJECT,
      properties: {
        costs: {
          type: Type.ARRAY,
          description: "A list of all explicit or potential costs, financial figures, or pricing details mentioned.",
          items: { type: Type.STRING },
        },
        risks: {
          type: Type.ARRAY,
          description: "A list of all identified risks, warnings, potential issues, or liabilities mentioned.",
          items: { type: Type.STRING },
        },
      },
       required: ['costs', 'risks'],
    },
  },
  required: ['summary', 'criticalFindings', 'costAndRiskAnalysis'],
};

export async function analyzeDocument(prompt: string, base64ImageData: string, mimeType: string): Promise<Analysis> {
  try {
    const textPart = { text: prompt };
    const imagePart = {
      inlineData: {
        data: base64ImageData,
        mimeType: mimeType,
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [textPart, imagePart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
      }
    });
    
    const jsonString = response.text.trim();
    const parsedJson = JSON.parse(jsonString);

    // Basic validation to ensure the parsed object matches the Analysis structure
    if (
      !parsedJson.summary ||
      !Array.isArray(parsedJson.criticalFindings) ||
      !parsedJson.costAndRiskAnalysis ||
      !Array.isArray(parsedJson.costAndRiskAnalysis.costs) ||
      !Array.isArray(parsedJson.costAndRiskAnalysis.risks)
    ) {
      throw new Error('Invalid JSON structure received from API.');
    }
    
    return parsedJson as Analysis;

  } catch (error) {
    console.error("Error analyzing document with Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to analyze document: ${error.message}`);
    }
    throw new Error('An unknown error occurred while communicating with the AI.');
  }
}
