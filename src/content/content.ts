/**
 * Content Script
 * Handles field discovery, filling, and overlay UI in the page context
 */

import { discoverFields } from '../core/dom-scan';
import { fillFields, captureOriginalValues, restoreOriginalValues } from '../core/fill';
import { matchPairsToFields } from '../core/match';
import { saveDomainRules } from '../core/rules';
import type {
  Message,
  FieldDescriptor,
  SerializableFieldDescriptor,
  OcrPair,
  FillMapping,
  MatchResult,
  CandidateFieldsPayload,
  HighlightFieldPayload,
  ScrollToFieldPayload,
  StartElementPickerPayload,
} from '../core/types';
import { getRobustSelector, resolveElementBySelector } from '../core/selectors';

// Session state
let currentFields: FieldDescriptor[] = [];
let currentPairs: OcrPair[] = [];
let originalValues = new Map<string, string>();

// Overlay state
let overlayRoot: HTMLDivElement | null = null;

const selectorElementMap = new Map<string, HTMLElement>();

interface PickerState {
  active: boolean;
  regionId?: string;
  hoverElement?: HTMLElement | null;
  overlay?: HTMLDivElement;
}

const pickerState: PickerState = {
  active: false,
  regionId: undefined,
  hoverElement: null,
  overlay: undefined,
};

/**
 * Initialize content script
 */
function init() {
  console.log('[FormMirror] Content script loaded');
  
  // Inject global styles
  injectGlobalStyles();
  
  // Listen for messages from popup/background
  chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
    handleMessage(message)
      .then(sendResponse)
      .catch((error) => {
        console.error('[FormMirror] Message handler error:', error);
        sendResponse({ error: error.message });
      });
    
    // Return true to indicate async response
    return true;
  });
}

/**
 * Handle incoming messages
 */
async function handleMessage(message: Message): Promise<any> {
  switch (message.type) {
    case 'DISCOVER_FIELDS': {
      const fields = discoverFields(false);
      currentFields = fields;
      
      // Capture original values for undo
      originalValues = captureOriginalValues(fields);
      
      return {
        type: 'FIELDS_DISCOVERED',
        payload: {
          fields,
          url: window.location.href,
          domain: window.location.hostname,
        },
      };
    }

    case 'FILL_FIELDS': {
      const { mappings, fields: payloadFields, pairs: payloadPairs, dryRun } = message.payload;

      // Use fields/pairs from payload if current ones are empty
      const fieldsToUse = currentFields.length > 0 ? currentFields : (payloadFields || []);
      const pairsToUse = currentPairs.length > 0 ? currentPairs : (payloadPairs || []);
      
      console.log('[Content] Filling fields...', { 
        mappings: mappings.length,
        fields: fieldsToUse.length,
        pairs: pairsToUse.length,
        dryRun
      });
      
      const result = await fillFields(mappings, fieldsToUse, pairsToUse, dryRun);
      
      if (!dryRun) {
        showSuccessNotification(result.filled);
      } else {
        showOverlay(mappings, currentFields, currentPairs);
      }
      
      return {
        type: 'FILL_COMPLETE',
        payload: result,
      };
    }

    case 'MATCH_FIELDS': {
      const { pairs, fields } = message.payload;
      currentPairs = pairs;
      currentFields = fields;
      
      const matchResult: MatchResult = matchPairsToFields(pairs, fields);
      
      return matchResult;
    }

    case 'SAVE_RULES': {
      const { domain, mappings } = message.payload;
      await saveDomainRules(domain, mappings, currentFields, currentPairs);
      
      return { success: true };
    }

    case 'UNDO_FILL': {
      restoreOriginalValues(currentFields, originalValues);
      showNotification('Undo complete', 'success');
      
      return { success: true };
    }

    case 'CLEAR_SESSION': {
      currentFields = [];
      currentPairs = [];
      originalValues.clear();
      hideOverlay();

      return { success: true };
    }

    case 'LIST_CANDIDATE_FIELDS': {
      if (currentFields.length === 0) {
        currentFields = discoverFields(false);
        originalValues = captureOriginalValues(currentFields);
      }

      selectorElementMap.clear();
      const summaries = serializeFields(currentFields);

      const payload: CandidateFieldsPayload = { fields: summaries };
      return {
        type: 'CANDIDATE_FIELDS',
        payload,
      };
    }

    case 'HIGHLIGHT_FIELD': {
      const payload = message.payload as HighlightFieldPayload;
      highlightFieldBySelector(payload.selector, payload.durationMs);
      return { success: true };
    }

    case 'SCROLL_TO_FIELD': {
      const payload = message.payload as ScrollToFieldPayload;
      scrollFieldIntoView(payload.selector, payload.block);
      return { success: true };
    }

    case 'START_ELEMENT_PICKER': {
      const payload = message.payload as StartElementPickerPayload;
      startElementPicker(payload.regionId);
      return { success: true };
    }

    case 'STOP_ELEMENT_PICKER': {
      stopElementPicker(false);
      return { success: true };
    }

    default:
      return { error: 'Unknown message type' };
  }
}

/**
 * Show overlay with mappings for review
 */
function showOverlay(
  mappings: FillMapping[],
  fields: FieldDescriptor[],
  pairs: OcrPair[]
): void {
  // Remove existing overlay
  hideOverlay();

  // Create overlay root
  overlayRoot = document.createElement('div');
  overlayRoot.id = 'fm-overlay-host';
  overlayRoot.className = 'fm-overlay-host';

  // Use Shadow DOM to isolate styles
  const shadow = overlayRoot.attachShadow({ mode: 'open' });

  const sharedStyles = [
    'ui/styles/fm-tokens.css',
    'ui/styles/fm-fonts.css',
    'ui/styles/fm-base.css',
    'ui/styles/fm-components.css'
  ];

  for (const asset of sharedStyles) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL(asset);
    shadow.appendChild(link);
  }

  const style = document.createElement('style');
  style.textContent = getOverlayStyles();
  shadow.appendChild(style);

  // Create overlay content
  const content = createOverlayContent(mappings, fields, pairs);
  shadow.appendChild(content);

  document.body.appendChild(overlayRoot);

  // Highlight fields on hover
  highlightFields(mappings, fields);
}

/**
 * Create overlay content
 */
function createOverlayContent(
  mappings: FillMapping[],
  fields: FieldDescriptor[],
  pairs: OcrPair[]
): HTMLElement {
  const root = document.createElement('div');
  root.id = 'fm-overlay-root';
  root.className = 'fm-overlay-root';

  const scrim = document.createElement('div');
  scrim.className = 'fm-overlay-scrim';
  scrim.addEventListener('click', hideOverlay);
  root.appendChild(scrim);

  const panel = document.createElement('aside');
  panel.className = 'fm-overlay-panel';

  const header = document.createElement('div');
  header.className = 'fm-overlay-panel__header';

  const title = document.createElement('h2');
  title.className = 'fm-h3';
  title.textContent = 'Fill preview';

  const subtitle = document.createElement('p');
  subtitle.className = 'fm-text-muted';
  subtitle.textContent = `${mappings.length} fields will be filled`;

  header.appendChild(title);
  header.appendChild(subtitle);
  panel.appendChild(header);

  const list = document.createElement('div');
  list.className = 'fm-overlay-panel__list';

  const fieldMap = new Map(fields.map((f) => [f.id, f]));
  const pairMap = new Map(pairs.map((p) => [p.id, p]));

  if (mappings.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'fm-overlay-empty';
    empty.textContent = 'No mapped fields yet.';
    list.appendChild(empty);
  } else {
    for (const mapping of mappings) {
      const field = fieldMap.get(mapping.fieldId);
      const pair = pairMap.get(mapping.ocrPairId);
      if (!field || !pair) continue;

      const item = document.createElement('div');
      item.className = `fm-overlay-item fm-overlay-item--${mapping.status}`;

      const meta = document.createElement('div');
      meta.className = 'fm-overlay-item__meta';

      const label = document.createElement('span');
      label.textContent = field.labelText || field.name || 'Field';

      const badge = document.createElement('span');
      const badgeStatus = mapping.status === 'auto' ? 'auto' : mapping.status === 'review' ? 'review' : 'ignored';
      badge.className = `fm-overlay-badge fm-overlay-badge--${badgeStatus}`;
      badge.textContent =
        badgeStatus === 'auto' ? 'Auto' : badgeStatus === 'review' ? 'Review' : 'Ignored';

      meta.appendChild(label);
      meta.appendChild(badge);

      const value = document.createElement('div');
      value.className = 'fm-overlay-item__value';
      value.textContent = pair.value;

      const score = document.createElement('div');
      score.className = 'fm-overlay-item__meta';
      score.textContent = `Match score: ${Math.round(mapping.score * 100)}%`;

      item.appendChild(meta);
      item.appendChild(value);
      item.appendChild(score);

      const targetElement = field.element;
      item.addEventListener('mouseenter', () => {
        if (!targetElement) return;
        targetElement.classList.add('fm-target');
        applyOutline(targetElement, mapping.status === 'auto' ? '2px solid #2A96FF' : '2px solid #F59E0B');
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });

      item.addEventListener('mouseleave', () => {
        if (!targetElement) return;
        targetElement.classList.remove('fm-target');
        clearOutline(targetElement);
      });

      list.appendChild(item);
    }
  }

  panel.appendChild(list);

  const actions = document.createElement('div');
  actions.className = 'fm-overlay-panel__actions';

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'fm-btn fm-btn--secondary';
  close.textContent = 'Close preview';
  close.addEventListener('click', hideOverlay);

  actions.appendChild(close);
  panel.appendChild(actions);

  root.appendChild(panel);

  return root;
}

/**
 * Highlight fields that will be filled
 */
function highlightFields(mappings: FillMapping[], fields: FieldDescriptor[]): void {
  const fieldMap = new Map(fields.map((f) => [f.id, f]));

  for (const mapping of mappings) {
    const field = fieldMap.get(mapping.fieldId);
    const element = field?.element;
    if (!field || !element) continue;

    element.classList.add('fm-target');

    const color = mapping.status === 'auto'
      ? '#2A96FF'
      : mapping.status === 'review'
        ? '#F59E0B'
        : '#9AAAC0';
    applyOutline(element, `2px solid ${color}`);
  }

  // Remove highlights after 3 seconds
  setTimeout(() => {
    for (const mapping of mappings) {
      const field = fieldMap.get(mapping.fieldId);
      if (field?.element) {
        field.element.classList.remove('fm-target');
        clearOutline(field.element);
      }
    }
  }, 3000);
}

/**
 * Hide overlay
 */
function hideOverlay(): void {
  if (overlayRoot) {
    overlayRoot.remove();
    overlayRoot = null;
  }
}

function serializeFields(fields: FieldDescriptor[]): SerializableFieldDescriptor[] {
  return fields.map((field) => {
    let selector = field.selector;

    if ((!selector || selector.length === 0) && field.element) {
      selector = getRobustSelector(field.element);
      field.selector = selector;
    }

    if (selector && field.element) {
      selectorElementMap.set(selector, field.element);
    }

    const { element, ...rest } = field;
    return { ...rest, selector };
  });
}

function getElementForSelector(selector: string): HTMLElement | null {
  if (!selector) return null;

  const cached = selectorElementMap.get(selector);
  if (cached && document.contains(cached)) {
    return cached;
  }

  const found = resolveElementBySelector(selector);
  if (found instanceof HTMLElement) {
    selectorElementMap.set(selector, found);
    return found;
  }

  return null;
}

function applyOutline(element: HTMLElement, color: string): void {
  if (!element.dataset.fmPrevOutline) {
    element.dataset.fmPrevOutline = element.style.outline || '';
  }
  if (!element.dataset.fmPrevOutlineOffset) {
    element.dataset.fmPrevOutlineOffset = element.style.outlineOffset || '';
  }

  element.style.outline = color;
  element.style.outlineOffset = '2px';
}

function clearOutline(element: HTMLElement): void {
  if (element.dataset.fmPrevOutline !== undefined) {
    element.style.outline = element.dataset.fmPrevOutline;
    delete element.dataset.fmPrevOutline;
  } else {
    element.style.outline = '';
  }

  if (element.dataset.fmPrevOutlineOffset !== undefined) {
    element.style.outlineOffset = element.dataset.fmPrevOutlineOffset;
    delete element.dataset.fmPrevOutlineOffset;
  } else {
    element.style.outlineOffset = '';
  }

  element.classList.remove('fm-target', 'fm-picker-hover');
}

function highlightFieldBySelector(selector: string, durationMs = 1500): void {
  const element = getElementForSelector(selector);
  if (!element) return;

  element.classList.add('fm-target');
  applyOutline(element, '2px solid #2A96FF');

  window.setTimeout(() => {
    clearOutline(element);
  }, durationMs);
}

function scrollFieldIntoView(selector: string, block: ScrollLogicalPosition = 'center'): void {
  const element = getElementForSelector(selector);
  if (!element) return;

  element.scrollIntoView({ behavior: 'smooth', block });
}

function findPickableElement(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;

  if (isPickableField(target)) {
    return target;
  }

  return target.closest(
    'input:not([type="hidden"]):not([type="file"]):not([type="password"]):not([type="button"]):not([type="submit"]):not([type="reset"]), select, textarea, [contenteditable="true"][role="textbox"]'
  ) as HTMLElement | null;
}

function isPickableField(element: HTMLElement): boolean {
  if (element instanceof HTMLInputElement) {
    return !['hidden', 'file', 'password', 'button', 'submit', 'reset', 'image'].includes(element.type);
  }

  if (element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
    return true;
  }

  return Boolean(element.isContentEditable && element.getAttribute('role') === 'textbox');
}

function setPickerHoverElement(element: HTMLElement | null): void {
  if (pickerState.hoverElement === element) return;

  if (pickerState.hoverElement) {
    clearOutline(pickerState.hoverElement);
  }

  pickerState.hoverElement = element;

  if (element) {
    element.classList.add('fm-picker-hover');
    applyOutline(element, '2px solid #2A96FF');
  }
}

function startElementPicker(regionId: string): void {
  stopElementPicker(false);

  pickerState.active = true;
  pickerState.regionId = regionId;

  const overlay = document.createElement('div');
  overlay.id = 'fm-picker-overlay';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = '2147483646';
  overlay.style.background = 'rgba(42, 150, 255, 0.05)';
  overlay.style.transition = 'opacity 0.2s ease';
  overlay.style.opacity = '1';
  document.body.appendChild(overlay);
  pickerState.overlay = overlay;

  document.addEventListener('mousemove', handlePickerMove, true);
  document.addEventListener('click', handlePickerClick, true);
  document.addEventListener('keydown', handlePickerKeydown, true);
}

function stopElementPicker(notifyPopup: boolean): void {
  if (!pickerState.active) return;

  document.removeEventListener('mousemove', handlePickerMove, true);
  document.removeEventListener('click', handlePickerClick, true);
  document.removeEventListener('keydown', handlePickerKeydown, true);

  if (pickerState.hoverElement) {
    clearOutline(pickerState.hoverElement);
  }

  if (pickerState.overlay) {
    pickerState.overlay.remove();
  }

  const regionId = pickerState.regionId;

  pickerState.active = false;
  pickerState.regionId = undefined;
  pickerState.hoverElement = null;
  pickerState.overlay = undefined;

  if (notifyPopup && regionId) {
    chrome.runtime.sendMessage({
      type: 'STOP_ELEMENT_PICKER',
      payload: { regionId },
    }).catch(() => {
      // Ignore errors when popup is not ready
    });
  }
}

function handlePickerMove(event: MouseEvent): void {
  if (!pickerState.active) return;
  const element = findPickableElement(event.target);
  setPickerHoverElement(element);
}

function handlePickerClick(event: MouseEvent): void {
  if (!pickerState.active) return;

  const element = findPickableElement(event.target);
  if (!element) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const selector = getRobustSelector(element);
  selectorElementMap.set(selector, element);

  const label =
    element.getAttribute('aria-label') ||
    element.getAttribute('placeholder') ||
    element.getAttribute('name') ||
    element.id ||
    element.tagName.toLowerCase();

  const inputType = element instanceof HTMLInputElement
    ? element.type || 'text'
    : element instanceof HTMLSelectElement
      ? 'select'
      : element instanceof HTMLTextAreaElement
        ? 'textarea'
        : element.getAttribute('role') || 'text';

  const attrName = element.getAttribute('name') || element.id || undefined;

  const regionId = pickerState.regionId;
  stopElementPicker(false);

  if (regionId) {
    chrome.runtime.sendMessage({
      type: 'ELEMENT_PICKED',
      payload: {
        regionId,
        selector,
        labelText: label || undefined,
        inputType,
        attrName,
      },
    }).catch(() => {
      // Ignore send errors when popup unavailable
    });
  }
}

function handlePickerKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    const regionId = pickerState.regionId;
    stopElementPicker(false);
    if (regionId) {
      chrome.runtime.sendMessage({
        type: 'STOP_ELEMENT_PICKER',
        payload: { regionId },
      }).catch(() => {
        // Ignore send errors when popup unavailable
      });
    }
    event.preventDefault();
    event.stopPropagation();
  }
}

/**
 * Show success notification
 */
function showSuccessNotification(count: number): void {
  showNotification(`✓ Filled ${count} fields`, 'success');
}

/**
 * Show notification toast
 */
function showNotification(message: string, type: 'success' | 'error' = 'success'): void {
  const notification = document.createElement('div');
  notification.className = `fm-notification ${type}`;
  notification.textContent = message;

  Object.assign(notification.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 20px',
    background: type === 'success' ? '#1E7ADF' : '#B00020',
    color: 'white',
    borderRadius: '14px',
    boxShadow: '0 12px 28px rgba(12,37,82,0.14)',
    zIndex: '999999',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontSize: '14px',
    fontWeight: '600',
  });

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

/**
 * Inject global styles into the page
 */
function injectGlobalStyles(): void {
  if (document.getElementById('fm-global-styles')) return;

  const style = document.createElement('style');
  style.id = 'fm-global-styles';
  style.textContent = `
    .fm-target {
      animation: fm-highlight-pulse 1.5s ease-in-out;
    }

    @keyframes fm-highlight-pulse {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(42, 150, 255, 0.25);
      }
      50% {
        box-shadow: 0 0 0 10px rgba(42, 150, 255, 0);
      }
    }

    .fm-dry-run {
      outline: 2px dashed #2A96FF !important;
      outline-offset: 2px !important;
    }

    .fm-target,
    .fm-dry-run {
      box-sizing: border-box;
    }
  `;

  document.head.appendChild(style);
}

/**
 * Get overlay styles
 */
function getOverlayStyles(): string {
  return `
    :host {
      all: initial;
    }

    .fm-overlay-panel__list {
      max-height: min(70vh, 520px);
      overflow-y: auto;
    }

    .fm-overlay-item__value {
      word-break: break-word;
    }

    .fm-overlay-item--auto {
      border-left: 4px solid var(--fm-blue-500);
    }

    .fm-overlay-item--review {
      border-left: 4px solid var(--fm-blue-300);
    }

    .fm-overlay-item--ignored {
      border-left: 4px solid var(--fm-gray-300);
      opacity: 0.75;
    }

    .fm-overlay-panel__actions {
      justify-content: flex-end;
    }

    @media (max-width: 640px) {
      .fm-overlay-panel {
        right: 12px;
        left: 12px;
        width: auto;
      }
    }
  `;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

