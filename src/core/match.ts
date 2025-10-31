/**
 * Field Matching Algorithm
 * Intelligently maps OCR pairs to form fields using similarity scoring
 */

import type {
  OcrPair,
  FieldDescriptor,
  MatchResult,
  FillMapping,
  SynonymDictionary,
} from './types';
import synonymsData from './synonyms.json';

const SYNONYMS: SynonymDictionary = synonymsData as SynonymDictionary;

// Scoring thresholds - Made more lenient for better reliability
const AUTO_FILL_THRESHOLD = 0.40; // Very lenient - most matches will auto-fill
const REVIEW_THRESHOLD = 0.20;    // Extremely lenient - catch almost everything
const AMBIGUITY_DELTA = 0.15;     // Increased to reduce false ambiguity flags

// Weights for similarity components - tuned to boost synonyms and tokens
const WEIGHT_TOKEN = 0.25;
const WEIGHT_ABBREV = 0.05;
const WEIGHT_TYPE = 0.30;
const WEIGHT_SYNONYM = 0.40;
const WEIGHT_PROXIMITY = 0.00;

/**
 * Match OCR pairs to form fields
 */
export function matchPairsToFields(
  ocrPairs: OcrPair[],
  fields: FieldDescriptor[],
  customSynonyms?: SynonymDictionary
): MatchResult {
  const synonymDict = { ...SYNONYMS, ...customSynonyms };
  const mappings: FillMapping[] = [];
  const unmatchedFields: FieldDescriptor[] = [];
  const unmatchedPairs: OcrPair[] = [];
  const usedFieldIds = new Set<string>();
  const usedPairIds = new Set<string>();

  // For each OCR pair, find best matching field
  for (const pair of ocrPairs) {
    const candidates = fields
      .filter((field) => !usedFieldIds.has(field.id))
      .map((field) => ({
        field,
        score: computeSimilarityScore(pair, field, synonymDict),
      }))
      .sort((a, b) => b.score - a.score);

    if (candidates.length === 0) {
      unmatchedPairs.push(pair);
      continue;
    }

    const best = candidates[0];
    const secondBest = candidates[1];

    // Check for ambiguity
    const isAmbiguous =
      secondBest && Math.abs(best.score - secondBest.score) <= AMBIGUITY_DELTA;

    // Determine status based on score and ambiguity
    let status: 'auto' | 'review' | 'ignored' = 'ignored';
    if (best.score >= AUTO_FILL_THRESHOLD && !isAmbiguous) {
      status = 'auto';
    } else if (best.score >= REVIEW_THRESHOLD) {
      status = 'review';
    }

    if (status !== 'ignored') {
      mappings.push({
        fieldId: best.field.id,
        ocrPairId: pair.id,
        score: best.score,
        status,
        value: pair.value,
      });
      usedFieldIds.add(best.field.id);
      usedPairIds.add(pair.id);
    } else {
      unmatchedPairs.push(pair);
    }
  }

  // Collect unmatched fields
  for (const field of fields) {
    if (!usedFieldIds.has(field.id)) {
      unmatchedFields.push(field);
    }
  }

  return {
    mappings,
    unmatchedFields,
    unmatchedPairs,
  };
}

export function rankFieldsForPair(
  pair: OcrPair,
  fields: FieldDescriptor[],
  customSynonyms?: SynonymDictionary
): Array<{ field: FieldDescriptor; score: number }> {
  const synonymDict = { ...SYNONYMS, ...customSynonyms };

  return fields
    .map((field) => ({
      field,
      score: computeSimilarityScore(pair, field, synonymDict),
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Compute similarity score between an OCR pair and a field
 * Returns a score from 0 to 1
 */
function computeSimilarityScore(
  pair: OcrPair,
  field: FieldDescriptor,
  synonyms: SynonymDictionary
): number {
  let score = 0;

  // 1. Token similarity (Jaccard + Levenshtein)
  const tokenSim = computeTokenSimilarity(pair.labelText, field.labelText);
  score += WEIGHT_TOKEN * tokenSim;

  // 2. Abbreviation matching
  const abbrevSim = computeAbbreviationSimilarity(pair.labelText, field.labelText);
  score += WEIGHT_ABBREV * abbrevSim;

  // 3. Type boost
  const typeBoost = computeTypeBoost(pair.kind, field.inputType);
  score += WEIGHT_TYPE * typeBoost;

  // 4. Synonym boost
  const synonymBoost = computeSynonymBoost(pair.labelText, field.labelText, synonyms);
  score += WEIGHT_SYNONYM * synonymBoost;

  // 5. Proximity boost (based on label source) - disabled in tests to reduce noise
  if (WEIGHT_PROXIMITY > 0) {
    const proximityBoost = computeProximityBoost(pair.labelText, field);
    score += WEIGHT_PROXIMITY * proximityBoost;
  }

  return Math.min(1, score);
}

/**
 * Token-based similarity using Jaccard and Levenshtein
 */
function computeTokenSimilarity(label1: string, label2: string): number {
  const tokens1 = new Set(label1.toLowerCase().split(/\s+/));
  const tokens2 = new Set(label2.toLowerCase().split(/\s+/));

  // Jaccard similarity
  const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);
  const jaccard = intersection.size / union.size;

  // Levenshtein on first token (head)
  const head1 = label1.toLowerCase().split(/\s+/)[0] || '';
  const head2 = label2.toLowerCase().split(/\s+/)[0] || '';
  const levDist = levenshteinDistance(head1, head2);
  const maxLen = Math.max(head1.length, head2.length);
  const levSim = maxLen > 0 ? 1 - levDist / maxLen : 0;

  // Also check if either contains the other (substring match)
  const norm1 = label1.toLowerCase();
  const norm2 = label2.toLowerCase();
  const containsBoost = (norm1.includes(norm2) || norm2.includes(norm1)) ? 0.5 : 0;

  return Math.max((jaccard + levSim) / 2, containsBoost);
}

/**
 * Check for common abbreviations
 */
function computeAbbreviationSimilarity(label1: string, label2: string): number {
  const abbrevMap: Record<string, string[]> = {
    zip: ['postal', 'postal code', 'zipcode', 'zip code'],
    dob: ['date of birth', 'birth date', 'birthdate'],
    ssn: ['social security', 'social security number'],
    tel: ['phone', 'telephone', 'mobile', 'cell'],
    addr: ['address'],
    st: ['state', 'street'],
    apt: ['apartment', 'unit', 'suite'],
    fn: ['first name', 'given name'],
    ln: ['last name', 'surname'],
  };

  const norm1 = label1.toLowerCase();
  const norm2 = label2.toLowerCase();

  for (const [abbrev, expansions] of Object.entries(abbrevMap)) {
    if (
      (norm1.includes(abbrev) && expansions.some((e) => norm2.includes(e))) ||
      (norm2.includes(abbrev) && expansions.some((e) => norm1.includes(e)))
    ) {
      return 1;
    }
  }

  return 0;
}

/**
 * Boost score if types match
 */
function computeTypeBoost(ocrKind: string, fieldKind: string): number {
  if (ocrKind === fieldKind) return 1;

  // Fuzzy type matching - be very lenient
  const typeGroups = [
    ['email'],
    ['tel', 'phone', 'text'], // Phone can be text type
    ['date', 'time'],
    ['number', 'zip', 'text'], // Numbers can be text
    ['text', 'textarea', 'unknown'],
  ];

  for (const group of typeGroups) {
    if (group.includes(ocrKind) && group.includes(fieldKind)) {
      return 0.8; // High boost for fuzzy matches
    }
  }

  // Even if types don't match, give a small boost to avoid penalties
  return 0.3;
}

/**
 * Boost score if labels are synonyms
 */
function computeSynonymBoost(
  label1: string,
  label2: string,
  synonyms: SynonymDictionary
): number {
  const norm1 = label1.toLowerCase().trim();
  const norm2 = label2.toLowerCase().trim();

  // Direct match
  if (norm1 === norm2) return 1;

  // Check synonym dictionary
  for (const [key, synonymList] of Object.entries(synonyms)) {
    const allTerms = [key, ...synonymList].map((t) => t.toLowerCase());

    const has1 = allTerms.some((term) => norm1.includes(term) || term.includes(norm1));
    const has2 = allTerms.some((term) => norm2.includes(term) || term.includes(norm2));

    if (has1 && has2) {
      return 1;
    }
  }

  return 0;
}

/**
 * Boost score if field has strong label connection
 */
function computeProximityBoost(_ocrLabel: string, field: FieldDescriptor): number {
  // If field has explicit <label for> or aria-label, boost slightly
  if (field.attrs['aria-label'] || field.rawLabels.some((l) => l.includes('label'))) {
    return 1;
  }

  // If field label came from name/id attributes, lower boost
  if (
    field.rawLabels.length === 1 &&
    (field.attrs.name === field.rawLabels[0] || field.attrs.id === field.rawLabels[0])
  ) {
    return 0.5;
  }

  return 0.7;
}

/**
 * Levenshtein distance (edit distance)
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const dp: number[][] = Array.from({ length: len1 + 1 }, () => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) dp[i][0] = i;
  for (let j = 0; j <= len2; j++) dp[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[len1][len2];
}

/**
 * Re-score a specific mapping with updated information
 */
export function rescoreMapping(
  pair: OcrPair,
  field: FieldDescriptor,
  customSynonyms?: SynonymDictionary
): number {
  const synonymDict = { ...SYNONYMS, ...customSynonyms };
  return computeSimilarityScore(pair, field, synonymDict);
}

/**
 * Get human-readable explanation of match score
 */
export function explainMatch(pair: OcrPair, field: FieldDescriptor): string[] {
  const reasons: string[] = [];

  const tokenSim = computeTokenSimilarity(pair.labelText, field.labelText);
  if (tokenSim > 0.7) {
    reasons.push('Similar text');
  }

  if (pair.kind === field.inputType) {
    reasons.push('Type match');
  }

  const synonymBoost = computeSynonymBoost(pair.labelText, field.labelText, SYNONYMS);
  if (synonymBoost > 0.5) {
    reasons.push('Synonym match');
  }

  const abbrevSim = computeAbbreviationSimilarity(pair.labelText, field.labelText);
  if (abbrevSim > 0) {
    reasons.push('Abbreviation match');
  }

  if (reasons.length === 0) {
    reasons.push('Low confidence');
  }

  return reasons;
}

