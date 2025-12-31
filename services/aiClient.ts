
import { AiFields } from '../types';

/**
 * Frontend API client for PDF-related AI operations.
 * These requests are sent to a backend proxy which interacts with Gemini 3.
 */

interface SummaryResponse {
  summary: string;
}

interface FieldsResponse extends AiFields {
  notes?: string;
}

/**
 * Requests a comprehensive summary of a PDF document from the backend.
 * The backend will use Gemini 3 Flash to analyze the provided PDF text/content.
 */
export async function requestPdfSummary(pdfId: string, base64Pdf: string, userEmail?: string): Promise<SummaryResponse> {
  const response = await fetch('/api/ai/summary', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pdfId, pdfBase64: base64Pdf, userEmail }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Summary request failed (${response.status}): ${errorText || 'Unknown error'}`);
  }

  return response.json();
}

/**
 * Requests structured field extraction from the backend.
 * The backend will use Gemini 3 Pro with a defined JSON schema to extract metadata.
 */
export async function requestPdfFields(pdfId: string, base64Pdf: string, userEmail?: string): Promise<FieldsResponse> {
  const response = await fetch('/api/ai/extract-fields', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pdfId, pdfBase64: base64Pdf, userEmail }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Extraction request failed (${response.status}): ${errorText || 'Unknown error'}`);
  }

  return response.json();
}
