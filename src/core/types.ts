/**
 * Core type definitions for FormMirror
 * Privacy-first: No user values are stored, only mapping rules
 */

// ============================================================================
// OCR & Image Processing Types
// ============================================================================

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OcrWord {
  text: string;
  bbox: Rect;
  confidence: number;
  baseline: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    has_baseline: boolean;
  };
}

export interface OcrLine {
  text: string;
  words: OcrWord[];
  bbox: Rect;
  confidence: number;
}

export interface OcrResult {
  lines: OcrLine[];
  confidence: number;
}

export type FieldKind =
  | 'text'
  | 'email'
  | 'tel'
  | 'date'
  | 'number'
  | 'url'
  | 'zip'
  | 'ssn'
  | 'time'
  | 'select'
  | 'textarea'
  | 'unknown';

export interface OcrPair {
  id: string; // unique identifier
  labelText: string; // normalized (lowercased, punctuation trimmed)
  rawLabel: string; // original OCR text
  value: string; // exact OCR result
  bboxLabel: Rect; // label bounding box
  bboxValue: Rect; // value bounding box
  kind: FieldKind; // inferred type
  conf: number; // confidence 0..1
}

// ============================================================================
// DOM Field Discovery Types
// ============================================================================

export interface FieldDescriptor {
  id: string; // unique runtime id
  element: HTMLElement; // the actual DOM element
  labelText: string; // normalized human-readable label
  rawLabels: string[]; // all source texts used to derive label
  type: string; // input type attribute
  inputType: FieldKind; // normalized type
  attrs: Record<string, string>; // relevant attributes
  bbox: Rect; // position for overlay
  autocomplete?: string; // autocomplete hint
  placeholder?: string;
  name?: string;
  required: boolean;
}

// ============================================================================
// Matching & Mapping Types
// ============================================================================

export interface MatchCandidate {
  field: FieldDescriptor;
  ocrPair: OcrPair;
  score: number; // 0..1
  confidence: 'high' | 'medium' | 'low';
  reasons: string[]; // explanation of why this match was made
}

export interface FillMapping {
  fieldId: string;
  ocrPairId: string;
  score: number;
  status: 'auto' | 'review' | 'ignored' | 'manual';
  value: string; // the value to fill (can be edited by user)
}

export interface MatchResult {
  mappings: FillMapping[];
  unmatchedFields: FieldDescriptor[];
  unmatchedPairs: OcrPair[];
}

// ============================================================================
// Macro System Types
// ============================================================================

export interface Macro {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  lastUsed?: number;
  useCount: number;
  
  // Training data
  trainingScreenshot: string; // base64 image
  extractionRegions: ExtractionRegion[];
  targetFields: TargetField[];
}

export type PatternPresetKey =
  | 'everything'
  | 'email'
  | 'us_phone'
  | 'date_iso'
  | 'zip_us'
  | 'url'
  | 'uppercase6'
  | 'number'
  | 'custom';

export interface ExtractionRegion {
  id: string;
  name: string; // User-friendly name like "Price", "Volume", etc.
  bbox: Rect; // Coordinates in the training screenshot
  color?: string; // Optional color hint for visual matching
  textPattern?: string; // Optional regex pattern for validation
  textPatternPreset?: PatternPresetKey; // Selected preset for pattern matching
  textPatternCustom?: string; // Last custom regex entered by the user
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'; // Position preference
  tolerance?: number; // Color matching tolerance (0-1)
}

export interface TargetField {
  id: string;
  fieldId: string; // The actual form field ID
  fieldLabel: string; // Human-readable field name
  regionId: string; // Links to ExtractionRegion
  confidence: number; // How confident we are this mapping is correct
}

export interface MacroExecution {
  macroId: string;
  screenshot: string;
  extractedData: ExtractedData[];
  timestamp: number;
}

export interface ExtractedData {
  regionId: string;
  regionName: string;
  extractedText: string;
  confidence: number;
  bbox: Rect;
}

// ============================================================================
// Rule Storage Types (NO VALUES, only mappings)
// ============================================================================

export interface DomainRule {
  domain: string;
  rules: FieldMappingRule[];
  createdAt: number;
  updatedAt: number;
}

export interface FieldMappingRule {
  // Label from screenshot
  normalizedLabel: string;
  // Target field selectors (multiple for fallback)
  selectors: string[];
  // Field identification hints
  hints: {
    name?: string;
    type?: string;
    autocomplete?: string;
    placeholder?: string;
  };
  confidence: number;
  useCount: number;
}

// ============================================================================
// Settings & Configuration
// ============================================================================

export interface ExtensionSettings {
  // OCR settings
  ocrLanguage: string; // default 'eng'
  usePreprocessing: boolean; // enable OpenCV preprocessing
  
  // Matching settings
  autoFillThreshold: number; // default 0.78
  reviewThreshold: number; // default 0.55
  
  // UI settings
  showConfidenceScores: boolean;
  highlightFields: boolean;
  
  // Advanced
  enableDebugMode: boolean;
  customSynonyms: Record<string, string[]>;
}

// ============================================================================
// Messages (Background <-> Content <-> Popup)
// ============================================================================

export type MessageType =
  | 'OCR_START'
  | 'OCR_PROGRESS'
  | 'OCR_COMPLETE'
  | 'OCR_ERROR'
  | 'OCR_PROCESS'
  | 'DISCOVER_FIELDS'
  | 'FIELDS_DISCOVERED'
  | 'FILL_FIELDS'
  | 'FILL_COMPLETE'
  | 'SAVE_RULES'
  | 'LOAD_RULES'
  | 'UNDO_FILL'
  | 'CLEAR_SESSION'
  | 'MATCH_FIELDS'
  | 'GET_TAB_INFO'
  | 'CREATE_MACRO'
  | 'SAVE_MACRO'
  | 'LOAD_MACROS'
  | 'DELETE_MACRO'
  | 'EXECUTE_MACRO'
  | 'MACRO_EXECUTION_COMPLETE';

export interface Message<T = any> {
  type: MessageType;
  payload?: T;
  tabId?: number;
  error?: string;
}

export interface OcrStartPayload {
  imageData: string; // base64 data URL
}

export interface OcrProgressPayload {
  status: string;
  progress: number; // 0..1
}

export interface OcrCompletePayload {
  pairs: OcrPair[];
  processingTime: number;
}

export interface DiscoverFieldsPayload {
  includeHidden?: boolean;
}

export interface FieldsDiscoveredPayload {
  fields: FieldDescriptor[];
  url: string;
  domain: string;
}

export interface FillFieldsPayload {
  mappings: FillMapping[];
  dryRun?: boolean;
}

export interface FillCompletePayload {
  success: boolean;
  filled: number;
  failed: number;
  errors?: string[];
}

export interface SaveRulesPayload {
  domain: string;
  mappings: FillMapping[];
  fields: FieldDescriptor[];
}

// ============================================================================
// Session State (in-memory only)
// ============================================================================

export interface SessionState {
  ocrPairs: OcrPair[];
  fields: FieldDescriptor[];
  mappings: FillMapping[];
  originalValues: Map<string, string>; // for undo
  domain: string;
  timestamp: number;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface Point {
  x: number;
  y: number;
}

export interface SynonymDictionary {
  [key: string]: string[];
}

export interface ProcessingOptions {
  enablePreprocessing: boolean;
  preprocessingSteps?: {
    grayscale?: boolean;
    adaptiveThreshold?: boolean;
    denoise?: boolean;
    deskew?: boolean;
    dilation?: boolean;
  };
  tesseractOptions?: {
    lang?: string;
    whitelist?: string;
  };
}

