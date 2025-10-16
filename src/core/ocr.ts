/**
 * OCR Pipeline - Tesseract.js integration via Offscreen Document
 * All processing happens locally in WebAssembly
 * Uses MV3 offscreen document to bypass CSP restrictions
 */

import type { OcrResult, OcrLine, OcrWord, ProcessingOptions } from './types';

export class OcrEngine {
  private initialized = false;

  /**
   * Initialize the OCR engine
   * Creates offscreen document if needed
   */
  async initialize(_lang = 'eng'): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Create offscreen document for OCR processing
      await this.setupOffscreenDocument();
      this.initialized = true;
      console.log('[OCR] Initialized with offscreen document');
    } catch (error) {
      console.error('[OCR] Initialization failed:', error);
      throw new Error(`OCR initialization failed: ${error}`);
    }
  }

  /**
   * Setup offscreen document
   */
  private async setupOffscreenDocument(): Promise<void> {
    const existingContexts = await chrome.runtime.getContexts({});
    const offscreenDocument = existingContexts.find(
      (context) => context.contextType === 'OFFSCREEN_DOCUMENT'
    );

    if (!offscreenDocument) {
      await chrome.offscreen.createDocument({
        url: chrome.runtime.getURL('src/offscreen/offscreen.html'),
        reasons: ['WORKERS' as chrome.offscreen.Reason],
        justification: 'OCR processing with Tesseract.js requires Web Workers',
      });
    }
  }

  /**
   * Process an image and extract text with bounding boxes
   */
  async recognize(
    imageData: string | HTMLImageElement | HTMLCanvasElement,
    _options: ProcessingOptions = { enablePreprocessing: false }
  ): Promise<OcrResult> {
    if (!this.initialized) {
      throw new Error('OCR engine not initialized. Call initialize() first.');
    }

    try {
      // Convert to data URL if needed
      let dataUrl: string;
      if (typeof imageData === 'string') {
        dataUrl = imageData;
      } else {
        dataUrl = await this.imageToDataUrl(imageData);
      }

      // Send to offscreen document for processing
      const response = await chrome.runtime.sendMessage({
        type: 'OCR_PROCESS',
        payload: { imageData: dataUrl },
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      // Convert Tesseract format to our format
      return this.convertTesseractData(response.result);
    } catch (error) {
      console.error('[OCR] Recognition failed:', error);
      throw new Error(`OCR recognition failed: ${error}`);
    }
  }

  /**
   * Convert image/canvas to data URL
   */
  private async imageToDataUrl(img: HTMLImageElement | HTMLCanvasElement): Promise<string> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL();
  }


  /**
   * Convert Tesseract data to our format
   */
  private convertTesseractData(data: any): OcrResult {
    const lines: OcrLine[] = [];

    if (!data.lines) {
      return { lines: [], confidence: 0 };
    }

    for (const line of data.lines) {
      const words: OcrWord[] = line.words.map((word: any) => ({
        text: word.text,
        bbox: {
          x: word.bbox.x0,
          y: word.bbox.y0,
          width: word.bbox.x1 - word.bbox.x0,
          height: word.bbox.y1 - word.bbox.y0,
        },
        confidence: word.confidence / 100, // Tesseract uses 0-100
        baseline: {
          x0: word.baseline.x0,
          y0: word.baseline.y0,
          x1: word.baseline.x1,
          y1: word.baseline.y1,
          has_baseline: word.baseline.has_baseline,
        },
      }));

      lines.push({
        text: line.text,
        words,
        bbox: {
          x: line.bbox.x0,
          y: line.bbox.y0,
          width: line.bbox.x1 - line.bbox.x0,
          height: line.bbox.y1 - line.bbox.y0,
        },
        confidence: line.confidence / 100,
      });
    }

    return {
      lines,
      confidence: data.confidence / 100,
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
 * Singleton instance for the extension
 */
let ocrEngineInstance: OcrEngine | null = null;

export function getOcrEngine(): OcrEngine {
  if (!ocrEngineInstance) {
    ocrEngineInstance = new OcrEngine();
  }
  return ocrEngineInstance;
}

