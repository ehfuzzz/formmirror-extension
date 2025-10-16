/**
 * Macro Execution Engine
 * Executes macros by extracting data from specified regions and filling target fields
 */

import type { Macro, MacroExecution, ExtractedData, ExtractionRegion, Rect } from './types';
import { getCloudOcrEngine } from './ocr-cloud';
// Removed unused import

/**
 * Execute a macro on a new screenshot
 */
export async function executeMacro(macro: Macro, screenshot: string): Promise<MacroExecution> {
  console.log('[Macro Executor] Executing macro:', macro.name);
  
  try {
    // Run OCR on the new screenshot
    const ocr = getCloudOcrEngine();
    await ocr.initialize();
    const ocrResult = await ocr.recognize(screenshot);
    
    // Extract data from each region
    const extractedData: ExtractedData[] = [];
    
    for (const region of macro.extractionRegions) {
      const regionData = await extractFromRegion(ocrResult, region);
      if (regionData) {
        extractedData.push(regionData);
      }
    }
    
    const execution: MacroExecution = {
      macroId: macro.id,
      screenshot,
      extractedData,
      timestamp: Date.now()
    };
    
    console.log('[Macro Executor] Extracted data:', extractedData.length, 'regions');
    return execution;
    
  } catch (error) {
    console.error('[Macro Executor] Failed to execute macro:', error);
    throw new Error(`Macro execution failed: ${error}`);
  }
}

/**
 * Extract data from a specific region using coordinate-based extraction
 */
async function extractFromRegion(
  ocrResult: any, 
  region: ExtractionRegion
): Promise<ExtractedData | null> {
  
  // Find text that overlaps with the region's bounding box
  const overlappingText = findTextInRegion(ocrResult, region.bbox);
  
  if (!overlappingText) {
    console.log('[Macro Executor] No text found in region:', region.name);
    return null;
  }
  
  // Apply color filtering if specified
  let extractedText = overlappingText;
  if (region.color) {
    // TODO: Implement color-based filtering using image analysis
    // For now, we'll use the text as-is
    console.log('[Macro Executor] Color filtering not yet implemented for:', region.color);
  }
  
  // Apply text pattern validation if specified
  if (region.textPattern) {
    const regex = new RegExp(region.textPattern);
    if (!regex.test(extractedText)) {
      console.log('[Macro Executor] Text does not match pattern:', region.textPattern);
      return null;
    }
  }
  
  return {
    regionId: region.id,
    regionName: region.name,
    extractedText: extractedText.trim(),
    confidence: 0.8, // TODO: Calculate actual confidence
    bbox: region.bbox
  };
}

/**
 * Find text that overlaps with a specific region
 */
function findTextInRegion(ocrResult: any, targetBbox: Rect): string | null {
  const lines = ocrResult.lines || [];
  const overlappingTexts: string[] = [];
  
  for (const line of lines) {
    const lineBbox = line.bbox;
    
    // Check if line overlaps with target region
    if (bboxesOverlap(lineBbox, targetBbox)) {
      overlappingTexts.push(line.text);
    }
    
    // Also check individual words
    if (line.words) {
      for (const word of line.words) {
        if (bboxesOverlap(word.bbox, targetBbox)) {
          overlappingTexts.push(word.text);
        }
      }
    }
  }
  
  if (overlappingTexts.length === 0) {
    return null;
  }
  
  // Combine overlapping text, preferring longer matches
  return overlappingTexts.join(' ').trim();
}

/**
 * Check if two bounding boxes overlap
 */
function bboxesOverlap(bbox1: Rect, bbox2: Rect): boolean {
  return !(
    bbox1.x + bbox1.width < bbox2.x ||
    bbox2.x + bbox2.width < bbox1.x ||
    bbox1.y + bbox1.height < bbox2.y ||
    bbox2.y + bbox2.height < bbox1.y
  );
}

// Removed unused function
