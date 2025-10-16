/**
 * Autofill Engine
 * Framework-safe form filling with proper event dispatching
 */

import type { FieldDescriptor, FillMapping, OcrPair, FillCompletePayload } from './types';

/**
 * Fill form fields with values from mappings
 */
export async function fillFields(
  mappings: FillMapping[],
  fields: FieldDescriptor[],
  pairs: OcrPair[],
  dryRun = false
): Promise<FillCompletePayload> {
  const results = {
    success: true,
    filled: 0,
    failed: 0,
    errors: [] as string[],
  };

  // Create lookup maps
  const fieldMap = new Map(fields.map((f) => [f.id, f]));
  const pairMap = new Map(pairs.map((p) => [p.id, p]));

  for (const mapping of mappings) {
    const field = fieldMap.get(mapping.fieldId);
    const pair = pairMap.get(mapping.ocrPairId);

    if (!field || !pair) {
      results.errors.push(`Missing field or pair for mapping ${mapping.fieldId}`);
      results.failed++;
      continue;
    }

    try {
      if (!dryRun) {
        await fillField(field.element, mapping.value, field.inputType);
        results.filled++;
      } else {
        // Dry run: just highlight
        highlightField(field.element, 'dry-run');
        results.filled++;
      }
    } catch (error) {
      results.errors.push(`Failed to fill ${field.labelText}: ${error}`);
      results.failed++;
      results.success = false;
    }
  }

  return results;
}

/**
 * Fill a single field with framework-safe event dispatching
 */
async function fillField(
  element: HTMLElement,
  value: string,
  fieldType: string
): Promise<void> {
  // Handle different element types
  if (element instanceof HTMLInputElement) {
    await fillInput(element, value, fieldType);
  } else if (element instanceof HTMLSelectElement) {
    await fillSelect(element, value);
  } else if (element instanceof HTMLTextAreaElement) {
    await fillTextarea(element, value);
  } else if (element.isContentEditable) {
    await fillContentEditable(element, value);
  }
}

/**
 * Fill input element
 */
async function fillInput(
  input: HTMLInputElement,
  value: string,
  fieldType: string
): Promise<void> {
  // Special handling for date inputs
  if (input.type === 'date' && fieldType === 'date') {
    const isoDate = parseAndFormatDate(value);
    if (isoDate) {
      setValueAndDispatch(input, isoDate);
      return;
    }
  }

  // Special handling for number inputs
  if (input.type === 'number') {
    const numValue = value.replace(/[^\d.-]/g, '');
    setValueAndDispatch(input, numValue);
    return;
  }

  // Default: set value directly
  setValueAndDispatch(input, value);
}

/**
 * Fill select element by finding matching option
 */
async function fillSelect(select: HTMLSelectElement, value: string): Promise<void> {
  const normalizedValue = value.toLowerCase().trim();

  // Try exact match first
  for (const option of Array.from(select.options)) {
    if (option.value === value || option.text === value) {
      select.value = option.value;
      dispatchEvents(select);
      return;
    }
  }

  // Try fuzzy match
  let bestMatch: HTMLOptionElement | null = null;
  let bestScore = 0;

  for (const option of Array.from(select.options)) {
    const optionText = option.text.toLowerCase().trim();
    const score = stringSimilarity(normalizedValue, optionText);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = option;
    }
  }

  if (bestMatch && bestScore > 0.6) {
    select.value = bestMatch.value;
    dispatchEvents(select);
  }
}

/**
 * Fill textarea
 */
async function fillTextarea(textarea: HTMLTextAreaElement, value: string): Promise<void> {
  setValueAndDispatch(textarea, value);
}

/**
 * Fill contenteditable element
 */
async function fillContentEditable(element: HTMLElement, value: string): Promise<void> {
  element.textContent = value;
  dispatchEvents(element);
}

/**
 * Set value using native property setter and dispatch events
 * This ensures React/Vue/Angular detect the change
 */
function setValueAndDispatch(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  // Focus the element first
  element.focus();

  // Get native property descriptor
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    element.constructor.prototype,
    'value'
  )?.set;

  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(element, value);
  } else {
    element.value = value;
  }

  // Dispatch events
  dispatchEvents(element);

  // Blur to trigger validation
  element.blur();
}

/**
 * Dispatch input and change events
 */
function dispatchEvents(element: HTMLElement): void {
  // Input event (React listens to this)
  element.dispatchEvent(
    new Event('input', {
      bubbles: true,
      cancelable: true,
    })
  );

  // Change event (standard forms listen to this)
  element.dispatchEvent(
    new Event('change', {
      bubbles: true,
      cancelable: true,
    })
  );

  // Blur event (for validation)
  element.dispatchEvent(
    new Event('blur', {
      bubbles: true,
      cancelable: false,
    })
  );
}

/**
 * Parse date string to ISO format (YYYY-MM-DD)
 */
function parseAndFormatDate(dateStr: string): string | null {
  // Try various date formats
  const formats = [
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/, // MM/DD/YYYY or DD/MM/YYYY
    /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/, // YYYY/MM/DD
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/, // MM/DD/YY
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      try {
        let year: number, month: number, day: number;

        if (format === formats[1]) {
          // YYYY/MM/DD
          year = parseInt(match[1]);
          month = parseInt(match[2]);
          day = parseInt(match[3]);
        } else if (format === formats[2]) {
          // MM/DD/YY - assume 20YY for now
          month = parseInt(match[1]);
          day = parseInt(match[2]);
          year = 2000 + parseInt(match[3]);
        } else {
          // MM/DD/YYYY - US format assumption (can be enhanced)
          month = parseInt(match[1]);
          day = parseInt(match[2]);
          year = parseInt(match[3]);
        }

        // Validate
        if (month < 1 || month > 12 || day < 1 || day > 31) {
          continue;
        }

        // Format as ISO
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      } catch {
        continue;
      }
    }
  }

  return null;
}

/**
 * Simple string similarity (for select matching)
 */
function stringSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const maxLen = Math.max(len1, len2);

  if (maxLen === 0) return 1;

  // Check for substring match
  if (str1.includes(str2) || str2.includes(str1)) {
    return 0.8;
  }

  // Count matching characters
  let matches = 0;
  for (let i = 0; i < Math.min(len1, len2); i++) {
    if (str1[i] === str2[i]) matches++;
  }

  return matches / maxLen;
}

/**
 * Highlight a field (for dry run or review)
 */
function highlightField(element: HTMLElement, className: string): void {
  element.classList.add(`formmirror-${className}`);
  element.style.outline = '2px solid #4CAF50';
  element.style.outlineOffset = '2px';

  // Remove highlight after 2 seconds
  setTimeout(() => {
    element.classList.remove(`formmirror-${className}`);
    element.style.outline = '';
    element.style.outlineOffset = '';
  }, 2000);
}

/**
 * Store original values for undo functionality
 */
export function captureOriginalValues(fields: FieldDescriptor[]): Map<string, string> {
  const values = new Map<string, string>();

  for (const field of fields) {
    const element = field.element;
    let value = '';

    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      value = element.value;
    } else if (element instanceof HTMLSelectElement) {
      value = element.value;
    } else if (element.isContentEditable) {
      value = element.textContent || '';
    }

    values.set(field.id, value);
  }

  return values;
}

/**
 * Restore original values (undo)
 */
export function restoreOriginalValues(
  fields: FieldDescriptor[],
  originalValues: Map<string, string>
): void {
  for (const field of fields) {
    const originalValue = originalValues.get(field.id);
    if (originalValue !== undefined) {
      const element = field.element;

      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        setValueAndDispatch(element, originalValue);
      } else if (element instanceof HTMLSelectElement) {
        element.value = originalValue;
        dispatchEvents(element);
      } else if (element.isContentEditable) {
        element.textContent = originalValue;
        dispatchEvents(element);
      }
    }
  }
}

