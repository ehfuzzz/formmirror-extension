import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadActiveMode, persistActiveMode, MODE_STORAGE_KEY } from '../../src/popup/mode-storage';

const mockChrome = chrome as unknown as {
  storage: { local: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> } };
};

describe('popup mode storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists active mode to chrome.storage.local', async () => {
    await persistActiveMode('macro');
    expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ [MODE_STORAGE_KEY]: 'macro' });
  });

  it('loads stored active mode when available', async () => {
    mockChrome.storage.local.get.mockResolvedValueOnce({ [MODE_STORAGE_KEY]: 'studio' });
    const mode = await loadActiveMode();
    expect(mode).toBe('studio');
  });

  it('falls back to normal mode when storage missing or invalid', async () => {
    mockChrome.storage.local.get.mockResolvedValueOnce({ [MODE_STORAGE_KEY]: 'unknown' });
    const invalid = await loadActiveMode();
    expect(invalid).toBe('normal');

    mockChrome.storage.local.get.mockResolvedValueOnce({});
    const missing = await loadActiveMode();
    expect(missing).toBe('normal');
  });
});
