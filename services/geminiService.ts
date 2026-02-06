import { GoogleGenAI, Type } from "@google/genai";
import { uint8ArrayToBase64 } from "../utils/encoding";
import { AiFields, SummaryResult } from "../types";


const ai = new GoogleGenAI({ 
  apiKey: import.meta.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY 
});


function cleanAiOutput(text: string): string {
  return text
    // Remove markdown headers (### **text** or ### text)
    .replace(/###\s*\*\*(.*?)\*\*/g, '$1')
    .replace(/###\s+(.*?)$/gm, '$1')
    
    // Remove bold markers (**text**)
    .replace(/\*\*(.*?)\*\*/g, '$1')
    
    // Convert markdown bullets (* item) to proper bullets (• item)
    .replace(/^\*\s+/gm, '• ')
    .replace(/^-\s+/gm, '• ')
    
    // Convert numbered lists with asterisks
    .replace(/^\*\s*(\d+\.)/gm, '$1')
    
    // Remove extra blank lines (more than 2 consecutive)
    .replace(/\n{3,}/g, '\n\n')
    
    // Trim whitespace
    .trim();
}


/**
 * Generates a summary for the provided PDF data using Gemini 3 Flash.
 */
export const summarizePdf = async (pdfData: Uint8Array): Promise<SummaryResult> => {
  const base64Data = uint8ArrayToBase64(pdfData);


  const prompt = `You are a professional document summarizer. Analyze this PDF document and provide a clear, well-structured summary.


Use this format:
- Write section headers in plain text (no special symbols)
- Use bullet points with "•" symbol for lists
- Write in clear paragraphs for explanations
- Do NOT use markdown formatting (* # ** etc.)
- Be concise and professional


Provide:
1. A brief overview (2-3 sentences)
2. Key sections with bullet points for important details
3. Main takeaways or conclusions`;


  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: base64Data,
          },
        },
        {
          text: prompt,
        },
      ],
    }
  });
  
  const text = response.text || 'Summary generation failed.';
  const cleanedText = cleanAiOutput(text);


  // Parse structured data (Main Summary vs Key Points)
  const lines = cleanedText.split('\n');
  const keyPoints: string[] = [];
  let mainSummary = '';


  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;


    if (trimmed.startsWith('•')) {
      keyPoints.push(trimmed.substring(1).trim());
    } else {
      mainSummary += trimmed + '\n\n';
    }
  });


  // If strict parsing failed to separate (e.g. AI didn't use bullets as requested), fallback
  if (keyPoints.length === 0 && !mainSummary) {
      mainSummary = cleanedText;
  }


  return {
    summary: mainSummary.trim(),
    keyPoints: keyPoints
  };
};


/**
 * Extracts structured fields from the PDF data using Gemini 3 Pro.
 */
export const extractFields = async (pdfData: Uint8Array): Promise<AiFields & { notes?: string }> => {
  const base64Data = uint8ArrayToBase64(pdfData);


  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: base64Data,
          },
        },
        {
          text: "Extract key metadata fields from this PDF document into the specified JSON format. Ensure all arrays are populated with relevant items found in the document.",
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          documentType: { 
            type: Type.STRING,
            description: "The type of document (e.g., Invoice, Contract, Receipt)."
          },
          parties: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "List of entities or people involved."
          },
          amounts: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "List of monetary amounts mentioned."
          },
          dates: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "List of important dates found."
          },
          notes: {
            type: Type.STRING,
            description: "Brief analyst notes about the document structure or content."
          }
        },
        required: ["documentType", "parties", "amounts", "dates"]
      },
    }
  });


  try {
    const jsonStr = (response.text || '{}').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Failed to parse extracted fields:", error);
    throw new Error("Failed to extract structured data from PDF content.");
  }
};
