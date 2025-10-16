/**
 * Key-Value Extraction from OCR Results
 * Extracts label → value pairs from OCR text using geometry and heuristics
 */

import type { OcrResult, OcrLine, OcrPair, FieldKind, Rect } from './types';

/**
 * Extract label-value pairs from OCR result
 */
export function extractKeyValuePairs(ocrResult: OcrResult): OcrPair[] {
  const pairs: OcrPair[] = [];
  const lines = ocrResult.lines;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Strategy 1: Single line with colon or dash separator
    const colonPairs = extractFromColonSeparator(line, i);
    if (colonPairs.length > 0) {
      pairs.push(...colonPairs);
      continue;
    }

    // Strategy 2: Horizontal layout - label on left, value on right
    const horizontalPair = extractHorizontalPair(line, i);
    if (horizontalPair) {
      pairs.push(horizontalPair);
      continue;
    }

    // Strategy 3: Vertical layout - label above, value below
    if (i < lines.length - 1) {
      const verticalPair = extractVerticalPair(line, lines[i + 1], i);
      if (verticalPair) {
        pairs.push(verticalPair);
        i++; // Skip next line since we consumed it
        continue;
      }
    }
  }

  // Fallback: If no pairs found but we have text, treat each line as a labelless value
  // This helps with simple use cases like filling a single search bar
  if (pairs.length === 0 && lines.length > 0) {
    console.log('[KV Extract] No structured pairs found, using fallback mode');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const text = line.text.trim();
      
      // Skip empty lines or very short text (likely noise)
      if (text.length < 2) continue;
      
      pairs.push({
        id: `pair-${i}`,
        rawLabel: 'text', // Generic label
        labelText: 'text',
        value: text,
        kind: 'text',
        conf: line.confidence || 0.8,
        bboxLabel: line.bbox,
        bboxValue: line.bbox,
      });
    }
  }

  return pairs;
}

/**
 * Extract pairs from lines with : or — separators
 * Example: "First Name: John" or "Email — john@example.com"
 */
function extractFromColonSeparator(line: OcrLine, lineIndex: number): OcrPair[] {
  const pairs: OcrPair[] = [];
  const text = line.text.trim();

  // Match patterns like "Label: Value" or "Label — Value"
  const separatorRegex = /^(.+?)[:—]\s*(.+)$/;
  const match = text.match(separatorRegex);

  if (match) {
    const labelText = match[1].trim();
    const valueText = match[2].trim();

    // Skip if value looks like a label (ends with colon)
    if (valueText.endsWith(':')) {
      return pairs;
    }

    // Find approximate bounding boxes by splitting words
    const { labelBbox, valueBbox } = splitLineBbox(line, labelText, valueText);

    pairs.push({
      id: `pair-${lineIndex}`,
      labelText: normalizeLabel(labelText),
      rawLabel: labelText,
      value: valueText,
      bboxLabel: labelBbox,
      bboxValue: valueBbox,
      kind: inferFieldType(labelText, valueText),
      conf: line.confidence,
    });
  }

  return pairs;
}

/**
 * Extract pair from horizontal layout (two clusters in same line)
 * Example: "First Name        John" (label left, value right with gap)
 */
function extractHorizontalPair(line: OcrLine, lineIndex: number): OcrPair | null {
  const words = line.words;
  if (words.length < 2) return null;

  // Find the largest gap between words
  let maxGap = 0;
  let gapIndex = -1;

  for (let i = 0; i < words.length - 1; i++) {
    const gap = words[i + 1].bbox.x - (words[i].bbox.x + words[i].bbox.width);
    if (gap > maxGap) {
      maxGap = gap;
      gapIndex = i;
    }
  }

  // If gap is significant (> 50px), consider it a label-value separator
  const avgWordWidth = words.reduce((sum, w) => sum + w.bbox.width, 0) / words.length;
  if (maxGap > Math.max(50, avgWordWidth * 2)) {
    const labelWords = words.slice(0, gapIndex + 1);
    const valueWords = words.slice(gapIndex + 1);

    const labelText = labelWords.map((w) => w.text).join(' ');
    const valueText = valueWords.map((w) => w.text).join(' ');

    // Skip if label doesn't look like a label
    if (!looksLikeLabel(labelText)) {
      return null;
    }

    return {
      id: `pair-${lineIndex}`,
      labelText: normalizeLabel(labelText),
      rawLabel: labelText,
      value: valueText,
      bboxLabel: computeBoundingBox(labelWords.map((w) => w.bbox)),
      bboxValue: computeBoundingBox(valueWords.map((w) => w.bbox)),
      kind: inferFieldType(labelText, valueText),
      conf: line.confidence,
    };
  }

  return null;
}

/**
 * Extract pair from vertical layout (label on one line, value on next)
 * Example: Line 1: "Email Address"  Line 2: "john@example.com"
 */
function extractVerticalPair(labelLine: OcrLine, valueLine: OcrLine, lineIndex: number): OcrPair | null {
  const labelText = labelLine.text.trim();
  const valueText = valueLine.text.trim();

  // Check if label looks like a label and value doesn't
  if (!looksLikeLabel(labelText) || looksLikeLabel(valueText)) {
    return null;
  }

  // Check vertical alignment - value should be roughly below label
  const labelCenter = labelLine.bbox.x + labelLine.bbox.width / 2;
  const valueCenter = valueLine.bbox.x + valueLine.bbox.width / 2;
  const horizontalOffset = Math.abs(labelCenter - valueCenter);

  // Allow some horizontal offset but not too much
  if (horizontalOffset > Math.max(labelLine.bbox.width, valueLine.bbox.width)) {
    return null;
  }

  // Check vertical distance - lines should be close
  const verticalGap = valueLine.bbox.y - (labelLine.bbox.y + labelLine.bbox.height);
  if (verticalGap > 100) {
    return null;
  }

  return {
    id: `pair-${lineIndex}`,
    labelText: normalizeLabel(labelText),
    rawLabel: labelText,
    value: valueText,
    bboxLabel: labelLine.bbox,
    bboxValue: valueLine.bbox,
    kind: inferFieldType(labelText, valueText),
    conf: Math.min(labelLine.confidence, valueLine.confidence),
  };
}

/**
 * Check if text looks like a label
 */
function looksLikeLabel(text: string): boolean {
  const normalized = text.toLowerCase().trim();

  // Common label patterns
  const labelPatterns = [
    /^(first|last|middle|full)\s*name/i,
    /^email/i,
    /^phone/i,
    /^(mobile|cell)/i,
    /^address/i,
    /^city/i,
    /^state/i,
    /^zip/i,
    /^postal/i,
    /^country/i,
    /^company/i,
    /^title/i,
    /^(date|dob)/i,
    /^ssn/i,
    /^comment/i,
    /^message/i,
    /\?$/,  // Ends with question mark
  ];

  for (const pattern of labelPatterns) {
    if (pattern.test(normalized)) {
      return true;
    }
  }

  // Short text (1-4 words) ending with colon
  const words = normalized.split(/\s+/);
  if (words.length <= 4 && text.trim().endsWith(':')) {
    return true;
  }

  return false;
}

/**
 * Normalize label text for matching
 */
function normalizeLabel(text: string): string {
  return text
    .toLowerCase()
    .replace(/[:\-—*]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Infer field type from label and value
 */
function inferFieldType(label: string, value: string): FieldKind {
  const normalizedLabel = label.toLowerCase();

  // Email
  if (
    /email|e-mail/.test(normalizedLabel) ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  ) {
    return 'email';
  }

  // Phone
  if (
    /phone|tel|mobile|cell/.test(normalizedLabel) ||
    /^\+?[\d\s\-()]{7,}$/.test(value)
  ) {
    return 'tel';
  }

  // Date
  if (
    /date|dob|birth/.test(normalizedLabel) ||
    /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(value) ||
    /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(value)
  ) {
    return 'date';
  }

  // ZIP/Postal
  if (
    /zip|postal/.test(normalizedLabel) ||
    /^\d{5}(-\d{4})?$/.test(value) || // US ZIP
    /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/.test(value.toUpperCase()) // Canadian postal
  ) {
    return 'zip';
  }

  // SSN (masked)
  if (/ssn|social\s*security/.test(normalizedLabel)) {
    return 'ssn';
  }

  // Number
  if (/^\d+$/.test(value) && !/zip|postal|phone/.test(normalizedLabel)) {
    return 'number';
  }

  // URL
  if (/^https?:\/\//.test(value) || /website|url/.test(normalizedLabel)) {
    return 'url';
  }

  return 'text';
}

/**
 * Split line bounding box into label and value parts
 */
function splitLineBbox(line: OcrLine, labelText: string, valueText: string): {
  labelBbox: Rect;
  valueBbox: Rect;
} {
  const totalLength = labelText.length + valueText.length + 1; // +1 for separator
  const labelRatio = labelText.length / totalLength;

  const splitX = line.bbox.x + line.bbox.width * labelRatio;

  return {
    labelBbox: {
      x: line.bbox.x,
      y: line.bbox.y,
      width: splitX - line.bbox.x,
      height: line.bbox.height,
    },
    valueBbox: {
      x: splitX,
      y: line.bbox.y,
      width: line.bbox.x + line.bbox.width - splitX,
      height: line.bbox.height,
    },
  };
}

/**
 * Compute bounding box that encompasses all given boxes
 */
function computeBoundingBox(boxes: Rect[]): Rect {
  if (boxes.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const minX = Math.min(...boxes.map((b) => b.x));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxX = Math.max(...boxes.map((b) => b.x + b.width));
  const maxY = Math.max(...boxes.map((b) => b.y + b.height));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

