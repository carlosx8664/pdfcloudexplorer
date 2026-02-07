import { Handler } from '@netlify/functions';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY!
});

function cleanAiOutput(text: string): string {
  return text
    .replace(/###\s*\*\*(.*?)\*\*/g, '$1')
    .replace(/###\s+(.*?)$/gm, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^\*\s+/gm, '• ')
    .replace(/^-\s+/gm, '• ')
    .replace(/^\*\s*(\d+\.)/gm, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { base64Data } = JSON.parse(event.body || '{}');

    if (!base64Data) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing base64Data' }) };
    }

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

    if (keyPoints.length === 0 && !mainSummary) {
      mainSummary = cleanedText;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        summary: mainSummary.trim(),
        keyPoints: keyPoints
      })
    };
  } catch (error: any) {
    console.error('Summarize error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
