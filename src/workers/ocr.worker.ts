/**
 * OCR Worker
 * Runs Tesseract.js OCR in a separate worker thread
 * All processing is local - no network calls
 */

import { createWorker, type Worker, PSM } from 'tesseract.js';

let tesseractWorker: Worker | null = null;

/**
 * Initialize Tesseract worker
 */
async function initWorker(lang = 'eng'): Promise<void> {
  if (tesseractWorker) {
    return; // Already initialized
  }

  try {
    // Create worker with local assets
    tesseractWorker = await createWorker(lang, 1, {
      // All paths must be local to ensure no network requests
      workerPath: '/assets/tesseract/worker.min.js',
      langPath: '/assets/tesseract/lang-data',
      corePath: '/assets/tesseract/tesseract-core.wasm.js',
    });

    // Configure for form recognition
    await tesseractWorker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
      preserve_interword_spaces: '1',
      tessedit_char_whitelist:
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@.,-/#()+ \'"',
    });

    console.log('[OCR Worker] Initialized successfully');
  } catch (error) {
    console.error('[OCR Worker] Initialization failed:', error);
    throw error;
  }
}

/**
 * Process image with OCR
 */
async function recognizeImage(imageData: string): Promise<any> {
  if (!tesseractWorker) {
    throw new Error('Worker not initialized');
  }

  try {
    const result = await tesseractWorker.recognize(imageData);
    return result;
  } catch (error) {
    console.error('[OCR Worker] Recognition failed:', error);
    throw error;
  }
}

/**
 * Terminate worker
 */
async function terminateWorker(): Promise<void> {
  if (tesseractWorker) {
    await tesseractWorker.terminate();
    tesseractWorker = null;
    console.log('[OCR Worker] Terminated');
  }
}

/**
 * Message handler
 */
self.onmessage = async (e: MessageEvent) => {
  const { type, payload, id } = e.data;

  try {
    switch (type) {
      case 'INIT': {
        await initWorker(payload?.lang || 'eng');
        self.postMessage({ type: 'INIT_COMPLETE', id });
        break;
      }

      case 'RECOGNIZE': {
        const result = await recognizeImage(payload.imageData);
        self.postMessage({ type: 'RECOGNIZE_COMPLETE', payload: result, id });
        break;
      }

      case 'TERMINATE': {
        await terminateWorker();
        self.postMessage({ type: 'TERMINATE_COMPLETE', id });
        break;
      }

      default:
        self.postMessage({ type: 'ERROR', error: 'Unknown message type', id });
    }
  } catch (error: any) {
    self.postMessage({ type: 'ERROR', error: error.message, id });
  }
};

export {};

