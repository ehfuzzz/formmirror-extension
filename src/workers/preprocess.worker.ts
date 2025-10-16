/**
 * Preprocessing Worker
 * Image preprocessing using canvas operations
 * OpenCV.js integration would go here for advanced preprocessing
 */

/**
 * Preprocess image for better OCR
 */
async function preprocessImage(imageData: string, options: any): Promise<string> {
  // Create an offscreen canvas
  const img = await loadImage(imageData);
  const canvas = new OffscreenCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Draw original image
  ctx.drawImage(img, 0, 0);

  // Get image data
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  // Apply preprocessing steps
  if (options.grayscale) {
    grayscale(data);
  }

  if (options.adaptiveThreshold) {
    adaptiveThreshold(data, canvas.width, canvas.height);
  }

  if (options.denoise) {
    denoise(data, canvas.width, canvas.height);
  }

  // Put processed image back
  ctx.putImageData(imgData, 0, 0);

  // Convert to blob and then to data URL
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return await blobToDataURL(blob);
}

/**
 * Convert to grayscale
 */
function grayscale(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
}

/**
 * Simple adaptive thresholding
 */
function adaptiveThreshold(data: Uint8ClampedArray, _width: number, _height: number): void {
  const threshold = 128; // Simple global threshold for now
  
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i]; // Already grayscale
    const binary = gray > threshold ? 255 : 0;
    data[i] = binary;
    data[i + 1] = binary;
    data[i + 2] = binary;
  }
}

/**
 * Simple denoising using median filter approximation
 */
function denoise(data: Uint8ClampedArray, width: number, height: number): void {
  // Simple box blur as noise reduction
  const tempData = new Uint8ClampedArray(data);
  const kernelSize = 3;
  const offset = Math.floor(kernelSize / 2);

  for (let y = offset; y < height - offset; y++) {
    for (let x = offset; x < width - offset; x++) {
      let sum = 0;
      let count = 0;

      for (let ky = -offset; ky <= offset; ky++) {
        for (let kx = -offset; kx <= offset; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          sum += tempData[idx];
          count++;
        }
      }

      const avg = sum / count;
      const idx = (y * width + x) * 4;
      data[idx] = avg;
      data[idx + 1] = avg;
      data[idx + 2] = avg;
    }
  }
}

/**
 * Load image from data URL
 */
async function loadImage(dataUrl: string): Promise<ImageBitmap> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return await createImageBitmap(blob);
}

/**
 * Convert blob to data URL
 */
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Message handler
 */
self.onmessage = async (e: MessageEvent) => {
  const { type, payload, id } = e.data;

  try {
    switch (type) {
      case 'PREPROCESS': {
        const result = await preprocessImage(payload.imageData, payload.options || {});
        self.postMessage({ type: 'PREPROCESS_COMPLETE', payload: result, id });
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

