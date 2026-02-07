import { uint8ArrayToBase64 } from "../utils/encoding";
import { AiFields, SummaryResult } from "../types";

/**
 * Generates a summary for the provided PDF data using Gemini 3 Flash.
 */
export const summarizePdf = async (pdfData: Uint8Array): Promise<SummaryResult> => {
  const base64Data = uint8ArrayToBase64(pdfData);

  const response = await fetch('/.netlify/functions/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Data })
  });

  if (!response.ok) {
    throw new Error('Summary generation failed.');
  }

  return await response.json();
};

/**
 * Extracts structured fields from the PDF data using Gemini 3 Pro.
 */
export const extractFields = async (pdfData: Uint8Array): Promise<AiFields & { notes?: string }> => {
  const base64Data = uint8ArrayToBase64(pdfData);

  const response = await fetch('/.netlify/functions/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Data })
  });

  if (!response.ok) {
    throw new Error('Failed to extract structured data from PDF content.');
  }

  return await response.json();
};
