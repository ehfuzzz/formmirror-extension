/**
 * Macro Storage and Management
 * Handles saving, loading, and managing user-created macros
 */

import type { Macro, MacroExecution } from './types';

const MACRO_STORAGE_KEY = 'formmirror_macros';
const MACRO_EXECUTION_STORAGE_KEY = 'formmirror_macro_executions';

/**
 * Save a macro to storage
 */
export async function saveMacro(macro: Macro): Promise<void> {
  try {
    const existingMacros = await loadMacros();
    const updatedMacros = existingMacros.filter(m => m.id !== macro.id);
    updatedMacros.push(macro);
    
    await chrome.storage.local.set({
      [MACRO_STORAGE_KEY]: updatedMacros
    });
    
    console.log('[Macro Storage] Saved macro:', macro.name);
  } catch (error) {
    console.error('[Macro Storage] Failed to save macro:', error);
    throw new Error('Failed to save macro');
  }
}

/**
 * Load all macros from storage
 */
export async function loadMacros(): Promise<Macro[]> {
  try {
    const result = await chrome.storage.local.get(MACRO_STORAGE_KEY);
    return result[MACRO_STORAGE_KEY] || [];
  } catch (error) {
    console.error('[Macro Storage] Failed to load macros:', error);
    return [];
  }
}

/**
 * Delete a macro
 */
export async function deleteMacro(macroId: string): Promise<void> {
  try {
    const existingMacros = await loadMacros();
    const updatedMacros = existingMacros.filter(m => m.id !== macroId);
    
    await chrome.storage.local.set({
      [MACRO_STORAGE_KEY]: updatedMacros
    });
    
    console.log('[Macro Storage] Deleted macro:', macroId);
  } catch (error) {
    console.error('[Macro Storage] Failed to delete macro:', error);
    throw new Error('Failed to delete macro');
  }
}

/**
 * Get a specific macro by ID
 */
export async function getMacro(macroId: string): Promise<Macro | null> {
  try {
    const macros = await loadMacros();
    return macros.find(m => m.id === macroId) || null;
  } catch (error) {
    console.error('[Macro Storage] Failed to get macro:', error);
    return null;
  }
}

/**
 * Update macro usage statistics
 */
export async function updateMacroUsage(macroId: string): Promise<void> {
  try {
    const macro = await getMacro(macroId);
    if (!macro) return;
    
    macro.lastUsed = Date.now();
    macro.useCount += 1;
    
    await saveMacro(macro);
  } catch (error) {
    console.error('[Macro Storage] Failed to update macro usage:', error);
  }
}

/**
 * Save macro execution history
 */
export async function saveMacroExecution(execution: MacroExecution): Promise<void> {
  try {
    const existingExecutions = await loadMacroExecutions();
    existingExecutions.push(execution);
    
    // Keep only last 100 executions to prevent storage bloat
    const recentExecutions = existingExecutions.slice(-100);
    
    await chrome.storage.local.set({
      [MACRO_EXECUTION_STORAGE_KEY]: recentExecutions
    });
    
    console.log('[Macro Storage] Saved macro execution:', execution.macroId);
  } catch (error) {
    console.error('[Macro Storage] Failed to save macro execution:', error);
  }
}

/**
 * Load macro execution history
 */
export async function loadMacroExecutions(): Promise<MacroExecution[]> {
  try {
    const result = await chrome.storage.local.get(MACRO_EXECUTION_STORAGE_KEY);
    return result[MACRO_EXECUTION_STORAGE_KEY] || [];
  } catch (error) {
    console.error('[Macro Storage] Failed to load macro executions:', error);
    return [];
  }
}

/**
 * Generate a unique macro ID
 */
export function generateMacroId(): string {
  return `macro_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
