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
  OcrPair,
  FillMapping,
  MatchResult,
} from '../core/types';

// Session state
let currentFields: FieldDescriptor[] = [];
let currentPairs: OcrPair[] = [];
let originalValues = new Map<string, string>();

// Overlay state
let overlayRoot: HTMLDivElement | null = null;

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

      item.addEventListener('mouseenter', () => {
        field.element.classList.add('fm-target');
        field.element.style.outline = mapping.status === 'auto' ? '2px solid #2A96FF' : '2px solid #F59E0B';
        field.element.style.outlineOffset = '2px';
        field.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });

      item.addEventListener('mouseleave', () => {
        field.element.classList.remove('fm-target');
        field.element.style.outline = '';
        field.element.style.outlineOffset = '';
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
    if (!field) continue;

    field.element.classList.add('fm-target');

    const color = mapping.status === 'auto'
      ? '#2A96FF'
      : mapping.status === 'review'
        ? '#F59E0B'
        : '#9AAAC0';
    field.element.style.outline = `2px solid ${color}`;
    field.element.style.outlineOffset = '2px';
  }

  // Remove highlights after 3 seconds
  setTimeout(() => {
    for (const mapping of mappings) {
      const field = fieldMap.get(mapping.fieldId);
      if (field) {
        field.element.classList.remove('fm-target');
        field.element.style.outline = '';
        field.element.style.outlineOffset = '';
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

