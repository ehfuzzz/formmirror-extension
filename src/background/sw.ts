/**
 * Background Service Worker (MV3)
 * Lightweight orchestrator for extension functionality
 */

import type { Message } from '../core/types';

console.log('[FormMirror] Background service worker initialized');

/**
 * Handle extension installation
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[FormMirror] Extension installed');
    
    // Open welcome page
    chrome.tabs.create({
      url: chrome.runtime.getURL('welcome.html'),
    });
  } else if (details.reason === 'update') {
    console.log('[FormMirror] Extension updated');
  }
});

/**
 * Handle messages from popup/content scripts
 */
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((error) => {
      console.error('[Background] Message handler error:', error);
      sendResponse({ error: error.message });
    });

  // Return true for async response
  return true;
});

/**
 * Handle incoming messages
 */
async function handleMessage(message: Message, sender: chrome.runtime.MessageSender): Promise<any> {
  console.log('[Background] Received message:', message.type);

  switch (message.type) {
    case 'OCR_PROCESS': {
      // Forward to offscreen document for OCR processing
      try {
        // Ensure offscreen document exists
        const existingContexts = await chrome.runtime.getContexts({});
        const offscreenDocument = existingContexts.find(
          (context) => context.contextType === 'OFFSCREEN_DOCUMENT'
        );

        if (!offscreenDocument) {
          await chrome.offscreen.createDocument({
            url: chrome.runtime.getURL('src/offscreen/offscreen.html'),
            reasons: ['WORKERS' as chrome.offscreen.Reason],
            justification: 'OCR processing with Tesseract.js requires Web Workers',
          });
        }

        // Send message to offscreen document
        const response = await chrome.runtime.sendMessage(message);
        return response;
      } catch (error: any) {
        console.error('[Background] OCR processing error:', error);
        return { success: false, error: error.message };
      }
    }

    case 'MATCH_FIELDS': {
      // Forward to content script for processing
      // This could be handled here too, but content script has the DOM context
      if (sender.tab?.id) {
        const response = await chrome.tabs.sendMessage(sender.tab.id, message);
        return response;
      }
      return { error: 'No active tab' };
    }

    case 'OCR_COMPLETE': {
      // Could store session data here if needed
      // For now, just acknowledge
      return { success: true };
    }

    case 'GET_TAB_INFO': {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        return {
          url: tabs[0].url,
          title: tabs[0].title,
          id: tabs[0].id,
        };
      }
      return { error: 'No active tab' };
    }

    default:
      console.warn('[Background] Unknown message type:', message.type);
      return { error: 'Unknown message type' };
  }
}

/**
 * Handle toolbar icon click
 */
chrome.action.onClicked.addListener(async (tab) => {
  console.log('[Background] Extension icon clicked', tab.id);
  
  // The popup will open automatically due to manifest configuration
  // This handler is here for future custom behavior if needed
});

/**
 * Monitor storage changes (for debugging)
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    console.log('[Background] Storage changed:', Object.keys(changes));
  }
});

/**
 * Privacy test: Assert no network requests are made
 * This runs in development mode only
 */
if (process.env.NODE_ENV === 'development') {
  // Monitor all network requests from the extension
  chrome.webRequest?.onBeforeRequest.addListener(
    (details) => {
      // Allow only chrome-extension:// URLs
      if (!details.url.startsWith('chrome-extension://')) {
        console.error('[Privacy Violation] Extension attempted network request:', details.url);
        // In production, this should never happen
      }
    },
    { urls: ['<all_urls>'] }
  );
}

/**
 * Keep service worker alive for critical operations
 * MV3 service workers can be terminated after 30 seconds of inactivity
 */
let keepAliveInterval: number | undefined;

function startKeepAlive() {
  if (keepAliveInterval) return;
  
  keepAliveInterval = setInterval(() => {
    // Ping to keep alive
    console.log('[Background] Keep-alive ping');
  }, 20000) as unknown as number; // 20 seconds
}

function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = undefined;
  }
}

// Start keep-alive when processing begins
chrome.runtime.onMessage.addListener((message: Message) => {
  if (message.type === 'OCR_START') {
    startKeepAlive();
  } else if (message.type === 'OCR_COMPLETE' || message.type === 'OCR_ERROR') {
    stopKeepAlive();
  }
});

export {};

