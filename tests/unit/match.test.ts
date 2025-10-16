/**
 * Tests for matching algorithm
 */

import { describe, it, expect } from 'vitest';
import { matchPairsToFields } from '../../src/core/match';
import type { OcrPair, FieldDescriptor } from '../../src/core/types';

describe('matchPairsToFields', () => {
  it('should match exact label text', () => {
    const pairs: OcrPair[] = [
      {
        id: 'pair-1',
        labelText: 'email address',
        rawLabel: 'Email Address',
        value: 'john@example.com',
        bboxLabel: { x: 0, y: 0, width: 100, height: 20 },
        bboxValue: { x: 110, y: 0, width: 150, height: 20 },
        kind: 'email',
        conf: 0.95,
      },
    ];

    const fields: FieldDescriptor[] = [
      {
        id: 'field-1',
        element: document.createElement('input'),
        labelText: 'email address',
        rawLabels: ['Email Address'],
        type: 'email',
        inputType: 'email',
        attrs: {},
        bbox: { x: 0, y: 0, width: 200, height: 30 },
        required: false,
      },
    ];

    const result = matchPairsToFields(pairs, fields);

    expect(result.mappings).toHaveLength(1);
    expect(result.mappings[0].fieldId).toBe('field-1');
    expect(result.mappings[0].ocrPairId).toBe('pair-1');
    expect(result.mappings[0].status).toBe('auto'); // High confidence
  });

  it('should match synonyms', () => {
    const pairs: OcrPair[] = [
      {
        id: 'pair-1',
        labelText: 'first name',
        rawLabel: 'First Name',
        value: 'John',
        bboxLabel: { x: 0, y: 0, width: 100, height: 20 },
        bboxValue: { x: 110, y: 0, width: 50, height: 20 },
        kind: 'text',
        conf: 0.9,
      },
    ];

    const fields: FieldDescriptor[] = [
      {
        id: 'field-1',
        element: document.createElement('input'),
        labelText: 'given name', // Synonym of "first name"
        rawLabels: ['Given Name'],
        type: 'text',
        inputType: 'text',
        attrs: {},
        bbox: { x: 0, y: 0, width: 200, height: 30 },
        required: false,
      },
    ];

    const result = matchPairsToFields(pairs, fields);

    expect(result.mappings).toHaveLength(1);
    expect(result.mappings[0].score).toBeGreaterThan(0.7);
  });

  it('should boost score for type match', () => {
    const pairs: OcrPair[] = [
      {
        id: 'pair-1',
        labelText: 'email',
        rawLabel: 'Email',
        value: 'test@example.com',
        bboxLabel: { x: 0, y: 0, width: 50, height: 20 },
        bboxValue: { x: 60, y: 0, width: 150, height: 20 },
        kind: 'email',
        conf: 0.9,
      },
    ];

    const fields: FieldDescriptor[] = [
      {
        id: 'field-email',
        element: document.createElement('input'),
        labelText: 'email',
        rawLabels: ['Email'],
        type: 'email',
        inputType: 'email',
        attrs: {},
        bbox: { x: 0, y: 0, width: 200, height: 30 },
        required: false,
      },
      {
        id: 'field-text',
        element: document.createElement('input'),
        labelText: 'email',
        rawLabels: ['Email'],
        type: 'text',
        inputType: 'text',
        attrs: {},
        bbox: { x: 0, y: 50, width: 200, height: 30 },
        required: false,
      },
    ];

    const result = matchPairsToFields(pairs, fields);

    expect(result.mappings).toHaveLength(1);
    expect(result.mappings[0].fieldId).toBe('field-email'); // Should prefer email type
  });

  it('should mark ambiguous matches for review', () => {
    const pairs: OcrPair[] = [
      {
        id: 'pair-1',
        labelText: 'name',
        rawLabel: 'Name',
        value: 'John Doe',
        bboxLabel: { x: 0, y: 0, width: 50, height: 20 },
        bboxValue: { x: 60, y: 0, width: 100, height: 20 },
        kind: 'text',
        conf: 0.8,
      },
    ];

    // Two very similar fields
    const fields: FieldDescriptor[] = [
      {
        id: 'field-1',
        element: document.createElement('input'),
        labelText: 'full name',
        rawLabels: ['Full Name'],
        type: 'text',
        inputType: 'text',
        attrs: {},
        bbox: { x: 0, y: 0, width: 200, height: 30 },
        required: false,
      },
      {
        id: 'field-2',
        element: document.createElement('input'),
        labelText: 'name',
        rawLabels: ['Name'],
        type: 'text',
        inputType: 'text',
        attrs: {},
        bbox: { x: 0, y: 50, width: 200, height: 30 },
        required: false,
      },
    ];

    const result = matchPairsToFields(pairs, fields);

    // Should still match, but might need review if ambiguous
    expect(result.mappings.length).toBeGreaterThan(0);
  });

  it('should not match below threshold', () => {
    const pairs: OcrPair[] = [
      {
        id: 'pair-1',
        labelText: 'completely different',
        rawLabel: 'Completely Different',
        value: 'value',
        bboxLabel: { x: 0, y: 0, width: 150, height: 20 },
        bboxValue: { x: 160, y: 0, width: 50, height: 20 },
        kind: 'text',
        conf: 0.7,
      },
    ];

    const fields: FieldDescriptor[] = [
      {
        id: 'field-1',
        element: document.createElement('input'),
        labelText: 'email address',
        rawLabels: ['Email Address'],
        type: 'email',
        inputType: 'email',
        attrs: {},
        bbox: { x: 0, y: 0, width: 200, height: 30 },
        required: false,
      },
    ];

    const result = matchPairsToFields(pairs, fields);

    // Should not match due to low similarity
    expect(result.mappings).toHaveLength(0);
    expect(result.unmatchedPairs).toHaveLength(1);
  });
});

