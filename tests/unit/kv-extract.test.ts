/**
 * Tests for key-value extraction
 */

import { describe, it, expect } from 'vitest';
import { extractKeyValuePairs } from '../../src/core/kv-extract';
import type { OcrResult, OcrLine } from '../../src/core/types';

describe('extractKeyValuePairs', () => {
  it('should extract from colon separator', () => {
    const ocrResult: OcrResult = {
      lines: [
        {
          text: 'First Name: John',
          words: [
            {
              text: 'First',
              bbox: { x: 10, y: 10, width: 40, height: 15 },
              confidence: 0.95,
              baseline: { x0: 10, y0: 25, x1: 50, y1: 25, has_baseline: true },
            },
            {
              text: 'Name:',
              bbox: { x: 55, y: 10, width: 50, height: 15 },
              confidence: 0.95,
              baseline: { x0: 55, y0: 25, x1: 105, y1: 25, has_baseline: true },
            },
            {
              text: 'John',
              bbox: { x: 110, y: 10, width: 40, height: 15 },
              confidence: 0.95,
              baseline: { x0: 110, y0: 25, x1: 150, y1: 25, has_baseline: true },
            },
          ],
          bbox: { x: 10, y: 10, width: 140, height: 15 },
          confidence: 0.95,
        },
      ],
      confidence: 0.95,
    };

    const pairs = extractKeyValuePairs(ocrResult);

    expect(pairs).toHaveLength(1);
    expect(pairs[0].labelText).toBe('first name');
    expect(pairs[0].value).toBe('John');
    expect(pairs[0].rawLabel).toBe('First Name');
  });

  it('should extract from horizontal layout with gap', () => {
    const ocrResult: OcrResult = {
      lines: [
        {
          text: 'Email                  john@example.com',
          words: [
            {
              text: 'Email',
              bbox: { x: 10, y: 10, width: 50, height: 15 },
              confidence: 0.9,
              baseline: { x0: 10, y0: 25, x1: 60, y1: 25, has_baseline: true },
            },
            {
              text: 'john@example.com',
              bbox: { x: 150, y: 10, width: 120, height: 15 },
              confidence: 0.95,
              baseline: { x0: 150, y0: 25, x1: 270, y1: 25, has_baseline: true },
            },
          ],
          bbox: { x: 10, y: 10, width: 260, height: 15 },
          confidence: 0.92,
        },
      ],
      confidence: 0.92,
    };

    const pairs = extractKeyValuePairs(ocrResult);

    expect(pairs).toHaveLength(1);
    expect(pairs[0].labelText).toBe('email');
    expect(pairs[0].value).toBe('john@example.com');
  });

  it('should infer email type from pattern', () => {
    const ocrResult: OcrResult = {
      lines: [
        {
          text: 'Contact: john@example.com',
          words: [],
          bbox: { x: 10, y: 10, width: 200, height: 15 },
          confidence: 0.9,
        },
      ],
      confidence: 0.9,
    };

    const pairs = extractKeyValuePairs(ocrResult);

    expect(pairs).toHaveLength(1);
    expect(pairs[0].kind).toBe('email');
  });

  it('should infer phone type from pattern', () => {
    const ocrResult: OcrResult = {
      lines: [
        {
          text: 'Phone: (555) 123-4567',
          words: [],
          bbox: { x: 10, y: 10, width: 200, height: 15 },
          confidence: 0.9,
        },
      ],
      confidence: 0.9,
    };

    const pairs = extractKeyValuePairs(ocrResult);

    expect(pairs).toHaveLength(1);
    expect(pairs[0].kind).toBe('tel');
  });

  it('should handle empty OCR result', () => {
    const ocrResult: OcrResult = {
      lines: [],
      confidence: 0,
    };

    const pairs = extractKeyValuePairs(ocrResult);

    expect(pairs).toHaveLength(0);
  });
});

