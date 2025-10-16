/**
 * Cloud OCR using OCR.space API
 * Alternative to Tesseract.js for MV3 compatibility
 * Free tier: 25,000 requests/month
 */

import type { OcrResult, OcrLine, OcrWord } from './types';

const DEFAULT_API_KEY = 'helloworld'; // Free demo key
const OCR_API_URL = 'https://api.ocr.space/parse/image';

export class CloudOcrEngine {
  private apiKey: string;
  private initialized = false;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || DEFAULT_API_KEY;
  }

  /**
   * Initialize the OCR engine
   */
  async initialize(): Promise<void> {
    this.initialized = true;
    console.log('[CloudOCR] Initialized with API key');
  }

  /**
   * Process an image and extract text
   */
  async recognize(imageData: string): Promise<OcrResult> {
    if (!this.initialized) {
      throw new Error('OCR engine not initialized');
    }

    try {
      console.log('[CloudOCR] Sending image to OCR.space...');

      // Remove data URL prefix if present
      const base64Image = imageData.replace(/^data:image\/\w+;base64,/, '');

      const formData = new FormData();
      formData.append('base64Image', `data:image/png;base64,${base64Image}`);
      formData.append('apikey', this.apiKey);
      formData.append('language', 'eng');
      formData.append('isOverlayRequired', 'true'); // Get word positions
      formData.append('detectOrientation', 'true');
      formData.append('scale', 'true');
      formData.append('OCREngine', '2'); // Engine 2 is more accurate

      const response = await fetch(OCR_API_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`OCR API error: ${response.status}`);
      }

      const result = await response.json();
      console.log('[CloudOCR] API response:', result);

      if (result.IsErroredOnProcessing) {
        throw new Error(result.ErrorMessage || 'OCR processing failed');
      }

      // Convert OCR.space format to our format
      return this.convertOcrSpaceResult(result);
    } catch (error: any) {
      console.error('[CloudOCR] Recognition failed:', error);
      throw new Error(`OCR failed: ${error.message}`);
    }
  }

  /**
   * Convert OCR.space result to our format
   */
  private convertOcrSpaceResult(result: any): OcrResult {
    const lines: OcrLine[] = [];

    if (!result.ParsedResults || result.ParsedResults.length === 0) {
      return { lines: [], confidence: 0 };
    }

    const parsedResult = result.ParsedResults[0];
    const textLines = parsedResult.TextOverlay?.Lines || [];

    for (const line of textLines) {
      const words: OcrWord[] = [];

      for (const word of line.Words || []) {
        words.push({
          text: word.WordText,
          bbox: {
            x: word.Left,
            y: word.Top,
            width: word.Width,
            height: word.Height,
          },
          confidence: 0.9, // OCR.space doesn't provide word-level confidence
          baseline: {
            x0: word.Left,
            y0: word.Top + word.Height,
            x1: word.Left + word.Width,
            y1: word.Top + word.Height,
            has_baseline: true,
          },
        });
      }

      lines.push({
        text: line.LineText,
        words,
        bbox: {
          x: line.MinLeft || 0,
          y: line.MinTop || 0,
          width: line.MaxWidth || 0,
          height: line.MaxHeight || 0,
        },
        confidence: 0.9,
      });
    }

    return {
      lines,
      confidence: 0.9,
    };
  }

  /**
   * Check if engine is ready
   */
  isReady(): boolean {
    return this.initialized;
  }
}

/**
 * Singleton instance
 */
let cloudOcrInstance: CloudOcrEngine | null = null;

export function getCloudOcrEngine(apiKey?: string): CloudOcrEngine {
  if (!cloudOcrInstance) {
    cloudOcrInstance = new CloudOcrEngine(apiKey);
  }
  return cloudOcrInstance;
}

