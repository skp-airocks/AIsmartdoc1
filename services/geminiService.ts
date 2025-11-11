import { GoogleGenAI } from "@google/genai";
import { Analysis } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// A safe character limit to stay well under the model's token limit.
// gemini-2.5-pro has a 1M token limit, which is roughly 4M characters. 
// We set a conservative limit to be safe.
const CHARACTER_LIMIT = 800000;

/**
 * Splits a long string of text into smaller chunks, trying to break on newlines.
 * @param text The text to split.
 * @param limit The approximate maximum size of each chunk.
 * @returns An array of text chunks.
 */
function splitTextIntoChunks(text: string, limit: number): string[] {
    const chunks: string[] = [];
    if (!text) return chunks;
  
    let startIndex = 0;
    while (startIndex < text.length) {
      let endIndex = startIndex + limit;
      if (endIndex >= text.length) {
        chunks.push(text.substring(startIndex));
        break;
      }
  
      // Find the last newline character before the limit to avoid splitting mid-sentence.
      let splitIndex = text.lastIndexOf('\n', endIndex);
      
      // If no newline is found in a reasonable range, just cut at the limit.
      if (splitIndex === -1 || splitIndex < startIndex) {
        splitIndex = endIndex;
      }
      
      chunks.push(text.substring(startIndex, splitIndex));
      startIndex = splitIndex + 1; // +1 to skip the newline character itself
    }
  
    return chunks;
}


export async function analyzeDocument(
  prompt: string,
  document: { type: 'file'; base64Data: string; mimeType: string } | { type: 'text'; content: string }
): Promise<Analysis> {
  try {
    let responseText: string;

    if (document.type === 'file') {
      // File-based (image) analysis doesn't need chunking.
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { 
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: document.base64Data,
                mimeType: document.mimeType,
              },
            }
          ]
        },
      });
      responseText = response.text;
    } else { // document.type === 'text'
      if (document.content.length > CHARACTER_LIMIT) {
        // --- MAP-REDUCE STRATEGY FOR LARGE TEXTS ---
        console.log(`Document is large (${document.content.length} chars). Starting map-reduce process.`);
        
        const chunks = splitTextIntoChunks(document.content, CHARACTER_LIMIT);
        console.log(`Split into ${chunks.length} chunks.`);

        const mapPrompt = `You are an AI assistant helping to analyze a very large document. Please provide a detailed summary of the following text chunk. Extract all key information, especially any mention of critical findings, costs, and risks. Your summary will be combined with others to create a final report.\n\n--- DOCUMENT CHUNK ---\n\n`;

        const summaryPromises = chunks.map(chunk => 
            ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: mapPrompt + chunk,
            }).then(response => response.text)
        );

        const partialSummaries = await Promise.all(summaryPromises);
        console.log("Generated partial summaries for all chunks.");

        const combinedSummaries = partialSummaries.join('\n\n---\n\n');
        
        const reduceContents = `${prompt}\n\nThe original document was too large to process in one go. It has been summarized in sequential parts. Your task is to synthesize these summaries into a single, final analysis that adheres to the requested JSON format.\n\n--- COMBINED SUMMARIES ---\n\n${combinedSummaries}`;
        
        const finalResponse = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: reduceContents,
        });
        responseText = finalResponse.text;
      } else {
        // Standard analysis for smaller text
        const requestContents = `${prompt}\n\n--- DOCUMENT CONTENT TO ANALYZE ---\n\n${document.content}`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: requestContents,
        });
        responseText = response.text;
      }
    }

    // Common parsing logic for all successful API responses
    const jsonString = responseText.trim();
    const cleanJsonString = jsonString.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const parsedJson = JSON.parse(cleanJsonString);

    if (
      !parsedJson.summary ||
      !Array.isArray(parsedJson.criticalFindings) ||
      !parsedJson.costAndRiskAnalysis ||
      !Array.isArray(parsedJson.costAndRiskAnalysis.costs) ||
      !Array.isArray(parsedJson.costAndRiskAnalysis.risks)
    ) {
      throw new Error('Invalid JSON structure received from API. Please try again.');
    }
    
    return parsedJson as Analysis;

  } catch (error: any) {
    console.error("Error analyzing document with Gemini API:", error);

    if (error instanceof SyntaxError) {
        throw new Error('Failed to parse the AI response. The model may have returned an invalid format. Please try again.');
    }

    let errorMessage = 'An unknown error occurred while communicating with the AI.';
    
    if (typeof error === 'object' && error !== null) {
      const apiMessage = error.error?.message || error.message;
      if (typeof apiMessage === 'string') {
        errorMessage = apiMessage;
      }
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }

    if (errorMessage.includes('token count exceeds')) {
        errorMessage = 'The document is too large to analyze. Its content exceeds the maximum allowed length for the AI model.';
    }
    
    throw new Error(errorMessage);
  }
}