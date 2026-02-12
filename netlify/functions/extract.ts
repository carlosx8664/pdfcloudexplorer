
import { Handler } from '@netlify/functions';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ 
  apiKey: process.env.API_KEY!
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { base64Data } = JSON.parse(event.body || '{}');

    if (!base64Data) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing base64Data' }) };
    }

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

    const jsonStr = (response.text || '{}').trim();
    const parsed = JSON.parse(jsonStr);

    return {
      statusCode: 200,
      body: JSON.stringify(parsed)
    };
  } catch (error: any) {
    console.error('Extract error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
