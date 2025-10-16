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
  overlayRoot.id = 'formmirror-overlay';
  overlayRoot.className = 'formmirror-overlay';

  // Use Shadow DOM to isolate styles
  const shadow = overlayRoot.attachShadow({ mode: 'open' });

  // Add styles
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
  const container = document.createElement('div');
  container.className = 'overlay-container';

  const header = document.createElement('div');
  header.className = 'overlay-header';
  header.innerHTML = `
    <h3>FormMirror Preview</h3>
    <p>${mappings.length} fields will be filled</p>
  `;

  const list = document.createElement('div');
  list.className = 'overlay-list';

  const fieldMap = new Map(fields.map((f) => [f.id, f]));
  const pairMap = new Map(pairs.map((p) => [p.id, p]));

  for (const mapping of mappings) {
    const field = fieldMap.get(mapping.fieldId);
    const pair = pairMap.get(mapping.ocrPairId);
    if (!field || !pair) continue;

    const item = document.createElement('div');
    item.className = `overlay-item ${mapping.status}`;
    item.innerHTML = `
      <div class="item-label">${field.labelText}</div>
      <div class="item-value">${pair.value}</div>
      <div class="item-score">${Math.round(mapping.score * 100)}%</div>
    `;

    // Hover to highlight field
    item.addEventListener('mouseenter', () => {
      field.element.style.outline = '3px solid #4CAF50';
      field.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    item.addEventListener('mouseleave', () => {
      field.element.style.outline = '';
    });

    list.appendChild(item);
  }

  const actions = document.createElement('div');
  actions.className = 'overlay-actions';
  actions.innerHTML = `
    <button class="btn-close">Close Preview</button>
  `;

  actions.querySelector('.btn-close')?.addEventListener('click', hideOverlay);

  container.appendChild(header);
  container.appendChild(list);
  container.appendChild(actions);

  return container;
}

/**
 * Highlight fields that will be filled
 */
function highlightFields(mappings: FillMapping[], fields: FieldDescriptor[]): void {
  const fieldMap = new Map(fields.map((f) => [f.id, f]));

  for (const mapping of mappings) {
    const field = fieldMap.get(mapping.fieldId);
    if (!field) continue;

    field.element.classList.add('formmirror-target');
    
    const color = mapping.status === 'auto' ? '#4CAF50' : '#FF9800';
    field.element.style.outline = `2px solid ${color}`;
    field.element.style.outlineOffset = '2px';
  }

  // Remove highlights after 3 seconds
  setTimeout(() => {
    for (const mapping of mappings) {
      const field = fieldMap.get(mapping.fieldId);
      if (field) {
        field.element.classList.remove('formmirror-target');
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
  notification.className = `formmirror-notification ${type}`;
  notification.textContent = message;
  
  Object.assign(notification.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 20px',
    background: type === 'success' ? '#4CAF50' : '#f44336',
    color: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: '999999',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '14px',
    fontWeight: '500',
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
  if (document.getElementById('formmirror-global-styles')) return;

  const style = document.createElement('style');
  style.id = 'formmirror-global-styles';
  style.textContent = `
    .formmirror-target {
      animation: formmirror-pulse 1.5s ease-in-out;
    }

    @keyframes formmirror-pulse {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4);
      }
      50% {
        box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
      }
    }

    .formmirror-dry-run {
      outline: 2px dashed #4CAF50 !important;
      outline-offset: 2px !important;
    }

    .formmirror-target,
    .formmirror-dry-run {
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
    .overlay-container {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 350px;
      max-height: 600px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      z-index: 999999;
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      flex-direction: column;
    }

    .overlay-header {
      padding: 16px;
      border-bottom: 1px solid #eee;
    }

    .overlay-header h3 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }

    .overlay-header p {
      margin: 0;
      font-size: 13px;
      color: #666;
    }

    .overlay-list {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      max-height: 400px;
    }

    .overlay-item {
      padding: 10px;
      margin-bottom: 8px;
      background: #f9f9f9;
      border-radius: 6px;
      border-left: 3px solid #ccc;
      cursor: pointer;
      transition: all 0.2s;
    }

    .overlay-item:hover {
      background: #f0f0f0;
      transform: translateX(2px);
    }

    .overlay-item.auto {
      border-left-color: #4CAF50;
    }

    .overlay-item.review {
      border-left-color: #FF9800;
    }

    .item-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 4px;
    }

    .item-value {
      font-size: 14px;
      color: #333;
      font-weight: 500;
      margin-bottom: 4px;
    }

    .item-score {
      font-size: 11px;
      color: #999;
    }

    .overlay-actions {
      padding: 12px;
      border-top: 1px solid #eee;
    }

    .btn-close {
      width: 100%;
      padding: 10px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-close:hover {
      background: #764ba2;
    }
  `;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

