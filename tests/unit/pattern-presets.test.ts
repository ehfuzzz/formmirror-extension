import { describe, expect, it } from 'vitest';
import {
  BUILTIN_PATTERN_PRESETS,
  getPatternFromPreset,
  getPresetKeyFromPattern,
  resolvePatternSelection
} from '../../src/core/pattern-presets';

import type { PatternPresetKey } from '../../src/core/types';

describe('pattern presets', () => {
  it('maps built-in presets to their regex patterns', () => {
    const emailPattern = getPatternFromPreset('email');
    expect(emailPattern).toBe(BUILTIN_PATTERN_PRESETS.email.pattern);

    const phonePattern = getPatternFromPreset('us_phone');
    expect(phonePattern).toBe(BUILTIN_PATTERN_PRESETS.us_phone.pattern);
  });

  it('detects preset keys from known patterns', () => {
    expect(getPresetKeyFromPattern('.*')).toBe('everything');
    expect(getPresetKeyFromPattern(BUILTIN_PATTERN_PRESETS.number.pattern)).toBe('number');
  });

  it('falls back to custom when pattern is not built-in', () => {
    expect(getPresetKeyFromPattern('^foo$')).toBe('custom');
  });

  it('resolves custom patterns and validates empties and invalid regex', () => {
    const emptyResult = resolvePatternSelection('custom', '   ');
    expect(emptyResult.pattern).toBe(BUILTIN_PATTERN_PRESETS.everything.pattern);
    expect(emptyResult.isValid).toBe(false);
    expect(emptyResult.reason).toBe('empty');

    const invalidResult = resolvePatternSelection('custom', '[A-');
    expect(invalidResult.pattern).toBe(BUILTIN_PATTERN_PRESETS.everything.pattern);
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.reason).toBe('invalid');

    const validResult = resolvePatternSelection('custom', '^[A-Z]{2}\\d{4}$');
    expect(validResult.pattern).toBe('^[A-Z]{2}\\d{4}$');
    expect(validResult.isValid).toBe(true);
    expect(validResult.reason).toBeNull();
  });

  it('resolves built-in presets regardless of custom value', () => {
    const keys: PatternPresetKey[] = [
      'everything',
      'email',
      'us_phone',
      'date_iso',
      'zip_us',
      'url',
      'uppercase6',
      'number'
    ];

    for (const key of keys) {
      const result = resolvePatternSelection(key, 'ignored');
      expect(result.pattern).toBe(BUILTIN_PATTERN_PRESETS[key].pattern);
      expect(result.isValid).toBe(true);
      expect(result.reason).toBeNull();
    }
  });
});
