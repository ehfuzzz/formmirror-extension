/**
 * Rules Storage System
 * Stores per-domain field mapping rules (NO VALUES, only mappings)
 * Privacy-first: Only stores how to map labels to fields, never user data
 */

import type {
  DomainRule,
  FieldMappingRule,
  FillMapping,
  FieldDescriptor,
  OcrPair,
  ExtensionSettings,
} from './types';

const STORAGE_KEY_RULES = 'formmirror_domain_rules';
const STORAGE_KEY_SETTINGS = 'formmirror_settings';

/**
 * Load domain rules from storage
 */
export async function loadDomainRules(domain: string): Promise<DomainRule | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_RULES);
    const allRules = result[STORAGE_KEY_RULES] || {};
    return allRules[domain] || null;
  } catch (error) {
    console.error('[Rules] Failed to load domain rules:', error);
    return null;
  }
}

/**
 * Save domain rules to storage
 */
export async function saveDomainRules(
  domain: string,
  mappings: FillMapping[],
  fields: FieldDescriptor[],
  pairs: OcrPair[]
): Promise<void> {
  try {
    // Convert mappings to rules (no values!)
    const fieldMap = new Map(fields.map((f) => [f.id, f]));
    const pairMap = new Map(pairs.map((p) => [p.id, p]));

    const rules: FieldMappingRule[] = [];

    for (const mapping of mappings) {
      const field = fieldMap.get(mapping.fieldId);
      const pair = pairMap.get(mapping.ocrPairId);

      if (!field || !pair) continue;

      // Create selector for this field
      const selectors = generateSelectors(field);

      rules.push({
        normalizedLabel: pair.labelText,
        selectors,
        hints: {
          name: field.name,
          type: field.type,
          autocomplete: field.autocomplete,
          placeholder: field.placeholder,
        },
        confidence: mapping.score,
        useCount: 1,
      });
    }

    // Load existing rules
    const result = await chrome.storage.local.get(STORAGE_KEY_RULES);
    const allRules = result[STORAGE_KEY_RULES] || {};

    // Merge with existing rules
    const existingDomainRule = allRules[domain];
    if (existingDomainRule) {
      // Update use counts and merge
      const existingRuleMap = new Map(
        existingDomainRule.rules.map((r: FieldMappingRule) => [r.normalizedLabel, r])
      );

      for (const newRule of rules) {
        const existing = existingRuleMap.get(newRule.normalizedLabel) as FieldMappingRule | undefined;
        if (existing) {
          existing.useCount++;
          existing.confidence = (existing.confidence + newRule.confidence) / 2;
          // Merge selectors
          existing.selectors = [...new Set([...existing.selectors, ...newRule.selectors])];
        } else {
          existingRuleMap.set(newRule.normalizedLabel, newRule);
        }
      }

      existingDomainRule.rules = Array.from(existingRuleMap.values());
      existingDomainRule.updatedAt = Date.now();
    } else {
      allRules[domain] = {
        domain,
        rules,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }

    // Save back
    await chrome.storage.local.set({ [STORAGE_KEY_RULES]: allRules });
  } catch (error) {
    console.error('[Rules] Failed to save domain rules:', error);
    throw error;
  }
}

/**
 * Apply saved rules to current fields
 */
export function applyDomainRules(
  rules: DomainRule,
  fields: FieldDescriptor[],
  pairs: OcrPair[]
): FillMapping[] {
  const mappings: FillMapping[] = [];

  for (const pair of pairs) {
    // Find matching rule
    const matchingRule = rules.rules.find((r) => r.normalizedLabel === pair.labelText);
    if (!matchingRule) continue;

    // Find field that matches selectors
    const matchingField = findFieldBySelectors(fields, matchingRule.selectors, matchingRule.hints);
    if (!matchingField) continue;

    mappings.push({
      fieldId: matchingField.id,
      ocrPairId: pair.id,
      score: matchingRule.confidence,
      status: matchingRule.confidence > 0.8 ? 'auto' : 'review',
      value: pair.value,
    });
  }

  return mappings;
}

/**
 * Find field by trying multiple selectors
 */
function findFieldBySelectors(
  fields: FieldDescriptor[],
  selectors: string[],
  hints: FieldMappingRule['hints']
): FieldDescriptor | null {
  // Try selectors first
  for (const selector of selectors) {
    try {
      const element = document.querySelector(selector);
      if (element) {
        const field = fields.find((f) => f.element && f.element === element);
        if (field) return field;
      }
    } catch {
      // Invalid selector
      continue;
    }
  }

  // Fallback: match by hints
  for (const field of fields) {
    let score = 0;
    if (hints.name && field.name === hints.name) score++;
    if (hints.type && field.type === hints.type) score++;
    if (hints.autocomplete && field.autocomplete === hints.autocomplete) score++;
    if (hints.placeholder && field.placeholder === hints.placeholder) score++;

    if (score >= 2) return field;
  }

  return null;
}

/**
 * Generate CSS selectors for a field
 */
function generateSelectors(field: FieldDescriptor): string[] {
  const selectors: string[] = [];

  // ID selector (most specific)
  if (field.attrs.id) {
    selectors.push(`#${CSS.escape(field.attrs.id)}`);
  }

  // Name selector
  if (field.attrs.name) {
    selectors.push(`[name="${CSS.escape(field.attrs.name)}"]`);
  }

  // Type + name
  if (field.type && field.attrs.name && field.element) {
    selectors.push(`${field.element.tagName.toLowerCase()}[type="${field.type}"][name="${CSS.escape(field.attrs.name)}"]`);
  }

  // Autocomplete
  if (field.autocomplete) {
    selectors.push(`[autocomplete="${field.autocomplete}"]`);
  }

  return selectors;
}

/**
 * Clear all rules (for privacy)
 */
export async function clearAllRules(): Promise<void> {
  try {
    await chrome.storage.local.remove(STORAGE_KEY_RULES);
  } catch (error) {
    console.error('[Rules] Failed to clear rules:', error);
    throw error;
  }
}

/**
 * Get all saved domains
 */
export async function getAllDomains(): Promise<string[]> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_RULES);
    const allRules = result[STORAGE_KEY_RULES] || {};
    return Object.keys(allRules);
  } catch (error) {
    console.error('[Rules] Failed to get domains:', error);
    return [];
  }
}

/**
 * Delete rules for a specific domain
 */
export async function deleteDomainRules(domain: string): Promise<void> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_RULES);
    const allRules = result[STORAGE_KEY_RULES] || {};
    delete allRules[domain];
    await chrome.storage.local.set({ [STORAGE_KEY_RULES]: allRules });
  } catch (error) {
    console.error('[Rules] Failed to delete domain rules:', error);
    throw error;
  }
}

/**
 * Load extension settings
 */
export async function loadSettings(): Promise<ExtensionSettings> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_SETTINGS);
    const settings = result[STORAGE_KEY_SETTINGS];

    // Default settings
    return {
      ocrLanguage: settings?.ocrLanguage || 'eng',
      usePreprocessing: settings?.usePreprocessing ?? false,
      autoFillThreshold: settings?.autoFillThreshold ?? 0.78,
      reviewThreshold: settings?.reviewThreshold ?? 0.55,
      showConfidenceScores: settings?.showConfidenceScores ?? true,
      highlightFields: settings?.highlightFields ?? true,
      enableDebugMode: settings?.enableDebugMode ?? false,
      customSynonyms: settings?.customSynonyms || {},
    };
  } catch (error) {
    console.error('[Rules] Failed to load settings:', error);
    // Return defaults
    return {
      ocrLanguage: 'eng',
      usePreprocessing: false,
      autoFillThreshold: 0.78,
      reviewThreshold: 0.55,
      showConfidenceScores: true,
      highlightFields: true,
      enableDebugMode: false,
      customSynonyms: {},
    };
  }
}

/**
 * Save extension settings
 */
export async function saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
  try {
    const current = await loadSettings();
    const updated = { ...current, ...settings };
    await chrome.storage.local.set({ [STORAGE_KEY_SETTINGS]: updated });
  } catch (error) {
    console.error('[Rules] Failed to save settings:', error);
    throw error;
  }
}

