import { describe, it, expect } from 'vitest';
import { rankFieldsForPair } from '../../src/core/match';
import type { FieldDescriptor, OcrPair } from '../../src/core/types';

describe('rankFieldsForPair', () => {
  const fields: FieldDescriptor[] = [
    {
      id: 'field-1',
      labelText: 'Email address',
      rawLabels: ['Email address'],
      type: 'email',
      inputType: 'email',
      attrs: { name: 'email' },
      bbox: { x: 0, y: 0, width: 0, height: 0 },
      required: false,
      selector: '#email',
    },
    {
      id: 'field-2',
      labelText: 'Full name',
      rawLabels: ['Full name'],
      type: 'text',
      inputType: 'text',
      attrs: { name: 'full_name' },
      bbox: { x: 0, y: 0, width: 0, height: 0 },
      required: false,
      selector: '#name',
    },
  ];

  it('prioritizes the most relevant field for a label', () => {
    const pair: OcrPair = {
      id: 'pair-1',
      labelText: 'email',
      rawLabel: 'Email',
      value: 'user@example.com',
      bboxLabel: { x: 0, y: 0, width: 0, height: 0 },
      bboxValue: { x: 0, y: 0, width: 0, height: 0 },
      kind: 'email',
      conf: 0.9,
    };

    const ranked = rankFieldsForPair(pair, fields);
    expect(ranked[0].field.id).toBe('field-1');
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  it('returns all fields sorted even when labels differ', () => {
    const pair: OcrPair = {
      id: 'pair-2',
      labelText: 'name',
      rawLabel: 'Name',
      value: 'Jane Doe',
      bboxLabel: { x: 0, y: 0, width: 0, height: 0 },
      bboxValue: { x: 0, y: 0, width: 0, height: 0 },
      kind: 'text',
      conf: 0.9,
    };

    const ranked = rankFieldsForPair(pair, fields);
    expect(ranked).toHaveLength(2);
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
  });
});
