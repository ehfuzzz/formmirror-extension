import type { PopupMode } from './types';

const MODE_STORAGE_KEY = 'formmirror_popup_active_mode';

export async function loadActiveMode(): Promise<PopupMode> {
  try {
    const result = await chrome.storage.local.get(MODE_STORAGE_KEY);
    const stored = result[MODE_STORAGE_KEY];
    if (stored === 'macro' || stored === 'studio' || stored === 'normal') {
      return stored;
    }
  } catch (error) {
    console.warn('[Popup] Failed to load active mode from storage:', error);
  }
  return 'normal';
}

export async function persistActiveMode(mode: PopupMode): Promise<void> {
  try {
    await chrome.storage.local.set({ [MODE_STORAGE_KEY]: mode });
  } catch (error) {
    console.warn('[Popup] Failed to persist active mode:', error);
  }
}

export { MODE_STORAGE_KEY };
