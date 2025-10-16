/**
 * Offscreen Document for OCR Processing
 * MV3-compliant way to run Tesseract.js workers
 */

import Tesseract from 'tesseract.js';

console.log('[Offscreen] OCR worker initialized');

// Handle messages from the main extension
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'OCR_PROCESS') {
    processImage(message.payload.imageData)
      .then((result) => {
        sendResponse({ success: true, result });
      })
      .catch((error) => {
        console.error('[Offscreen] OCR error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }
});

async function processImage(imageData: string) {
  console.log('[Offscreen] Starting OCR...');
  
  try {
    console.log('[Offscreen] Creating Tesseract worker...');
    const worker = await Tesseract.createWorker('eng', 1, {
      logger: (m) => console.log('[Tesseract]', m),
    });

    console.log('[Offscreen] Worker created, starting recognition...');
    const result = await worker.recognize(imageData);
    console.log('[Offscreen] Recognition complete!');
    
    await worker.terminate();
    return result.data;
  } catch (error: any) {
    console.error('[Offscreen] Processing error:', error);
    throw new Error(`OCR failed: ${error.message || error}`);
  }
}

