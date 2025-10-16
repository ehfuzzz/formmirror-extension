/**
 * DOM Field Discovery
 * Discovers fillable form fields and computes their human-readable labels
 * Follows WCAG accessible name computation algorithm
 */

import type { FieldDescriptor, FieldKind, Rect } from './types';

/**
 * Discover all fillable fields on the current page
 */
export function discoverFields(includeHidden = false): FieldDescriptor[] {
  const fields: FieldDescriptor[] = [];
  const seenElements = new Set<HTMLElement>();

  // Query selectors for fillable elements
  const selectors = [
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="image"]):not([type="reset"])',
    'select',
    'textarea',
    '[contenteditable="true"][role="textbox"]',
  ];

  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector) as NodeListOf<HTMLElement>;

    for (const element of elements) {
      // Skip duplicates
      if (seenElements.has(element)) continue;
      seenElements.add(element);

      // Skip hidden fields unless requested
      if (!includeHidden && !isVisible(element)) continue;

      // Skip password and file inputs for security
      if (element instanceof HTMLInputElement) {
        if (element.type === 'password' || element.type === 'file') continue;
      }

      const descriptor = buildFieldDescriptor(element, fields.length);
      if (descriptor) {
        fields.push(descriptor);
      }
    }
  }

  return fields;
}

/**
 * Build a complete field descriptor for an element
 */
function buildFieldDescriptor(element: HTMLElement, index: number): FieldDescriptor | null {
  try {
    const labelText = computeAccessibleName(element);
    const rawLabels = computeAllLabelSources(element);
    const bbox = getElementBoundingBox(element);

    // Get type information
    let type = 'text';
    let inputType: FieldKind = 'text';
    
    if (element instanceof HTMLInputElement) {
      type = element.type || 'text';
      inputType = mapInputTypeToFieldKind(type);
    } else if (element instanceof HTMLSelectElement) {
      type = 'select';
      inputType = 'select';
    } else if (element instanceof HTMLTextAreaElement) {
      type = 'textarea';
      inputType = 'textarea';
    }

    // Collect attributes
    const attrs: Record<string, string> = {};
    if (element.id) attrs.id = element.id;
    if (element.getAttribute('name')) attrs.name = element.getAttribute('name')!;
    if (element.getAttribute('placeholder')) attrs.placeholder = element.getAttribute('placeholder')!;
    if (element.getAttribute('autocomplete')) attrs.autocomplete = element.getAttribute('autocomplete')!;
    if (element.getAttribute('aria-label')) attrs['aria-label'] = element.getAttribute('aria-label')!;
    if (element.getAttribute('aria-labelledby')) attrs['aria-labelledby'] = element.getAttribute('aria-labelledby')!;

    return {
      id: `field-${index}`,
      element,
      labelText: normalizeLabel(labelText),
      rawLabels,
      type,
      inputType,
      attrs,
      bbox,
      autocomplete: element.getAttribute('autocomplete') || undefined,
      placeholder: element.getAttribute('placeholder') || undefined,
      name: element.getAttribute('name') || undefined,
      required: element.hasAttribute('required'),
    };
  } catch (error) {
    console.warn('[DOM Scan] Failed to build descriptor for element:', element, error);
    return null;
  }
}

/**
 * Compute accessible name following WCAG algorithm
 * Priority: label[for] > aria-labelledby > aria-label > placeholder > nearby text > name/id
 */
function computeAccessibleName(element: HTMLElement): string {
  // 1. Try <label for="id">
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label?.textContent) {
      return label.textContent.trim();
    }
  }

  // 2. Try aria-labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labels = labelledBy.split(/\s+/).map(id => {
      const el = document.getElementById(id);
      return el?.textContent?.trim() || '';
    });
    const combined = labels.filter(Boolean).join(' ');
    if (combined) return combined;
  }

  // 3. Try aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel.trim();

  // 4. Try <label> wrapping the element
  const parentLabel = element.closest('label');
  if (parentLabel?.textContent) {
    // Extract text excluding the input's own value
    const clone = parentLabel.cloneNode(true) as HTMLElement;
    const inputs = clone.querySelectorAll('input, select, textarea');
    inputs.forEach(input => input.remove());
    const text = clone.textContent?.trim();
    if (text) return text;
  }

  // 5. Try placeholder
  const placeholder = element.getAttribute('placeholder');
  if (placeholder) return placeholder.trim();

  // 6. Try nearby text (previous sibling or parent text)
  const nearbyText = findNearbyText(element);
  if (nearbyText) return nearbyText;

  // 7. Fallback to name or id attribute
  const name = element.getAttribute('name');
  if (name) return humanizeAttributeName(name);

  if (element.id) return humanizeAttributeName(element.id);

  return 'Unknown Field';
}

/**
 * Get all possible label sources for better matching
 */
function computeAllLabelSources(element: HTMLElement): string[] {
  const sources: string[] = [];

  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label?.textContent) sources.push(label.textContent.trim());
  }

  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) sources.push(ariaLabel.trim());

  const placeholder = element.getAttribute('placeholder');
  if (placeholder) sources.push(placeholder.trim());

  const name = element.getAttribute('name');
  if (name) sources.push(name);

  if (element.id) sources.push(element.id);

  const nearbyText = findNearbyText(element);
  if (nearbyText) sources.push(nearbyText);

  return [...new Set(sources)]; // Remove duplicates
}

/**
 * Find nearby text that might label this field
 */
function findNearbyText(element: HTMLElement): string {
  // Strategy 1: Previous sibling text nodes
  let prev = element.previousSibling;
  let attempts = 0;
  while (prev && attempts < 3) {
    if (prev.nodeType === Node.TEXT_NODE && prev.textContent?.trim()) {
      return prev.textContent.trim();
    }
    if (prev.nodeType === Node.ELEMENT_NODE) {
      const text = (prev as HTMLElement).textContent?.trim();
      if (text && text.length < 100) { // Avoid long paragraphs
        return text;
      }
    }
    prev = prev.previousSibling;
    attempts++;
  }

  // Strategy 2: Parent's text content
  const parent = element.parentElement;
  if (parent && parent.tagName !== 'BODY') {
    const clone = parent.cloneNode(true) as HTMLElement;
    const inputs = clone.querySelectorAll('input, select, textarea');
    inputs.forEach(input => input.remove());
    const text = clone.textContent?.trim();
    if (text && text.length < 100) {
      return text;
    }
  }

  return '';
}

/**
 * Humanize attribute names (camelCase, snake_case, kebab-case to Title Case)
 */
function humanizeAttributeName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1') // camelCase
    .replace(/[_-]/g, ' ') // snake_case, kebab-case
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Check if element is visible
 */
function isVisible(element: HTMLElement): boolean {
  if (!element.offsetParent && element.tagName !== 'BODY') {
    return false;
  }

  const style = window.getComputedStyle(element);
  if (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    style.opacity === '0'
  ) {
    return false;
  }

  return true;
}

/**
 * Get element bounding box
 */
function getElementBoundingBox(element: HTMLElement): Rect {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + window.scrollX,
    y: rect.top + window.scrollY,
    width: rect.width,
    height: rect.height,
  };
}

/**
 * Map HTML input type to our FieldKind
 */
function mapInputTypeToFieldKind(type: string): FieldKind {
  const typeMap: Record<string, FieldKind> = {
    email: 'email',
    tel: 'tel',
    phone: 'tel',
    date: 'date',
    number: 'number',
    url: 'url',
    time: 'time',
    text: 'text',
    search: 'text',
  };

  return typeMap[type.toLowerCase()] || 'text';
}

/**
 * Normalize label text for matching
 */
function normalizeLabel(text: string): string {
  return text
    .toLowerCase()
    .replace(/[:\-—*\?]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

