import type { PatternPresetKey } from './types';

export interface PatternPresetOption {
  key: PatternPresetKey;
  label: string;
}

export interface PatternResolution {
  pattern: string;
  isValid: boolean;
  reason: 'empty' | 'invalid' | null;
}

interface BuiltinPattern {
  label: string;
  pattern: string;
}

export const BUILTIN_PATTERN_PRESETS: Record<Exclude<PatternPresetKey, 'custom'>, BuiltinPattern> = {
  everything: {
    label: 'Everything (matches anything)',
    pattern: '.*'
  },
  email: {
    label: 'Email',
    pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
  },
  us_phone: {
    label: 'US Phone',
    pattern: '^\\(?\\d{3}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{4}$'
  },
  date_iso: {
    label: 'Date (YYYY-MM-DD)',
    pattern: '^\\d{4}-\\d{2}-\\d{2}$'
  },
  zip_us: {
    label: 'ZIP (US)',
    pattern: '^\\d{5}(-\\d{4})?$'
  },
  url: {
    label: 'URL',
    pattern: '^https?://.+$'
  },
  uppercase6: {
    label: 'Uppercase Code (6 letters)',
    pattern: '^[A-Z]{6}$'
  },
  number: {
    label: 'Numbers (integers)',
    pattern: '^\\d+$'
  }
};

export const BUILTIN_PATTERN_ORDER: Exclude<PatternPresetKey, 'custom'>[] = [
  'everything',
  'email',
  'us_phone',
  'date_iso',
  'zip_us',
  'url',
  'uppercase6',
  'number'
];

export const PATTERN_PRESET_OPTIONS: PatternPresetOption[] = [
  ...BUILTIN_PATTERN_ORDER.map((key) => ({
    key,
    label: BUILTIN_PATTERN_PRESETS[key].label
  })),
  { key: 'custom', label: 'Other (custom regex)' }
];

export function getPatternFromPreset(key: PatternPresetKey): string {
  if (key === 'custom') {
    return BUILTIN_PATTERN_PRESETS.everything.pattern;
  }

  return BUILTIN_PATTERN_PRESETS[key].pattern;
}

export function getPresetKeyFromPattern(pattern?: string): PatternPresetKey {
  if (!pattern) {
    return 'everything';
  }

  for (const [key, preset] of Object.entries(BUILTIN_PATTERN_PRESETS)) {
    if (pattern === preset.pattern) {
      return key as PatternPresetKey;
    }
  }

  return 'custom';
}

export function resolvePatternSelection(
  preset: PatternPresetKey,
  customPattern: string
): PatternResolution {
  if (preset !== 'custom') {
    return {
      pattern: getPatternFromPreset(preset),
      isValid: true,
      reason: null
    };
  }

  const trimmed = customPattern.trim();
  if (!trimmed) {
    return {
      pattern: getPatternFromPreset('everything'),
      isValid: false,
      reason: 'empty'
    };
  }

  try {
    // eslint-disable-next-line no-new
    new RegExp(trimmed);
    return {
      pattern: trimmed,
      isValid: true,
      reason: null
    };
  } catch (_error) {
    return {
      pattern: getPatternFromPreset('everything'),
      isValid: false,
      reason: 'invalid'
    };
  }
}
