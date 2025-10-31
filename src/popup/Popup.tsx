/**
 * Popup UI - Main interface for FormMirror
 */

import { render } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type {
  OcrPair,
  FieldDescriptor,
  FillMapping,
  Macro,
  ExtractionRegion,
  MacroFieldMapping,
} from '../core/types';
import { getCloudOcrEngine } from '../core/ocr-cloud';
import { extractKeyValuePairs } from '../core/kv-extract';
import {
  loadMacros,
  saveMacro,
  generateMacroId,
  updateMacroUsage,
} from '../core/macro-storage';
import { RegionSelector } from '../components/RegionSelector';
import { ColorSelector } from '../components/ColorSelector';
import { SmartExtraction } from '../components/SmartExtraction';
import { FieldMapper } from '../components/FieldMapper';
import '../ui/styles/fm-tokens.css';
import '../ui/styles/fm-fonts.css';
import '../ui/styles/fm-base.css';
import '../ui/styles/fm-components.css';
import './popup.css';
import type { MacroStage, NormalStage, PopupMode, StudioStage } from './types';
import { loadActiveMode, persistActiveMode } from './mode-storage';

const MODE_TABS: Array<{ id: PopupMode; label: string; emoji: string }> = [
  { id: 'normal', label: 'Normal Mode', emoji: '📋' },
  { id: 'macro', label: 'Macro Mode', emoji: '⚡' },
  { id: 'studio', label: 'Macro Studio', emoji: '🛠️' },
];

interface MacroRunSummary {
  macroId: string;
  totalSelectors: number;
  resolvedSelectors: number;
  unresolvedSelectors: string[];
}

function Popup() {
  const [activeMode, setActiveMode] = useState<PopupMode>('normal');
  const [normalStage, setNormalStage] = useState<NormalStage>('upload');
  const [macroStage, setMacroStage] = useState<MacroStage>('list');
  const [studioStage, setStudioStage] = useState<StudioStage>('upload');

  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [pairs, setPairs] = useState<OcrPair[]>([]);
  const [fields, setFields] = useState<FieldDescriptor[]>([]);
  const [mappings, setMappings] = useState<FillMapping[]>([]);
  const [error, setError] = useState<string>('');

  const [macros, setMacros] = useState<Macro[]>([]);
  const [selectedMacro, setSelectedMacro] = useState<Macro | null>(null);
  const [macroRunSummary, setMacroRunSummary] = useState<MacroRunSummary | null>(null);
  const [macroPreviewResolved, setMacroPreviewResolved] = useState<Record<string, boolean> | null>(null);
  const [macroPreviewLoading, setMacroPreviewLoading] = useState(false);

  const [macroTrainingImage, setMacroTrainingImage] = useState<string>('');
  const [macroRegions, setMacroRegions] = useState<Array<{ rect: any; name: string; id: string }>>([]);
  const [macroExtractionRegions, setMacroExtractionRegions] = useState<ExtractionRegion[]>([]);

  const [isNormalDragActive, setIsNormalDragActive] = useState(false);
  const [isStudioDragActive, setIsStudioDragActive] = useState(false);

  const normalFileInputRef = useRef<HTMLInputElement>(null);
  const studioFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadActiveMode().then(setActiveMode);
  }, []);

  useEffect(() => {
    persistActiveMode(activeMode);
  }, [activeMode]);

  useEffect(() => {
    const listener = (message: any) => {
      if (message.type === 'OCR_PROGRESS') {
        setProgress(message.payload.progress);
        setStatusText(message.payload.status);
      } else if (message.type === 'FIELDS_DISCOVERED') {
        setFields(message.payload.fields);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, []);

  useEffect(() => {
    loadMacros().then(setMacros);
  }, []);

  useEffect(() => {
    if (normalStage === 'review' && pairs.length > 0 && fields.length > 0) {
      import('../core/match').then(({ matchPairsToFields, explainMatch }) => {
        const result = matchPairsToFields(pairs, fields);
        result.mappings.forEach((mapping, idx) => {
          const field = fields.find((f) => f.id === mapping.fieldId);
          const pair = pairs.find((p) => p.id === mapping.ocrPairId);
          if (field && pair) {
            const reasons = explainMatch(pair, field);
            console.log(`[Popup] Mapping ${idx + 1}:`, {
              ocrLabel: pair.rawLabel,
              ocrValue: pair.value,
              fieldLabel: field.labelText,
              score: mapping.score.toFixed(3),
              status: mapping.status,
              reasons: reasons.join(', '),
            });
          }
        });
        setMappings(result.mappings);
      });
    }
  }, [normalStage, pairs, fields]);

  useEffect(() => {
    if (activeMode === 'macro') {
      setMacroStage('list');
      setMacroRunSummary(null);
      setSelectedMacro(null);
      setMacroPreviewResolved(null);
      setMacroPreviewLoading(false);
    }
  }, [activeMode]);

  useEffect(() => {
    if (activeMode === 'normal' && normalStage === 'upload') {
      const handle = (event: ClipboardEvent) => {
        void handleNormalPaste(event);
      };
      document.addEventListener('paste', handle);
      return () => document.removeEventListener('paste', handle);
    }
  }, [activeMode, normalStage]);

  useEffect(() => {
    if (activeMode === 'studio' && studioStage === 'upload') {
      const handle = (event: ClipboardEvent) => {
        void handleStudioPaste(event);
      };
      document.addEventListener('paste', handle);
      return () => document.removeEventListener('paste', handle);
    }
  }, [activeMode, studioStage]);

  const handleNormalFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageData = e.target?.result as string;
      await processImage(imageData);
    };
    reader.readAsDataURL(file);
  };

  const handleNormalDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsNormalDragActive(false);
    if (activeMode !== 'normal' || normalStage !== 'upload') return;
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      void handleNormalFile(file);
    }
  };

  const handleNormalDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (activeMode !== 'normal' || normalStage !== 'upload') return;
    if (!isNormalDragActive) {
      setIsNormalDragActive(true);
    }
  };

  const handleNormalDragLeave = () => {
    setIsNormalDragActive(false);
  };

  const handleNormalPaste = async (event: ClipboardEvent) => {
    if (activeMode !== 'normal' || normalStage !== 'upload') return false;
    const items = event.clipboardData?.items;
    if (!items) return false;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          event.preventDefault();
          await handleNormalFile(file);
          return true;
        }
      }
    }
    return false;
  };

  const handleStudioFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      setMacroTrainingImage(imageData);
      setStudioStage('regions');
    };
    reader.readAsDataURL(file);
  };

  const handleStudioDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsStudioDragActive(false);
    if (activeMode !== 'studio' || studioStage !== 'upload') return;
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      void handleStudioFile(file);
    }
  };

  const handleStudioDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (activeMode !== 'studio' || studioStage !== 'upload') return;
    if (!isStudioDragActive) {
      setIsStudioDragActive(true);
    }
  };

  const handleStudioDragLeave = () => {
    setIsStudioDragActive(false);
  };

  const handleStudioPaste = async (event: ClipboardEvent) => {
    if (activeMode !== 'studio' || studioStage !== 'upload') return false;
    const items = event.clipboardData?.items;
    if (!items) return false;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          event.preventDefault();
          await handleStudioFile(file);
          return true;
        }
      }
    }
    return false;
  };

  const processImage = async (imageData: string) => {
    setNormalStage('processing');
    setError('');
    setProgress(0);
    setStatusText('Initializing OCR...');

    try {
      const ocr = getCloudOcrEngine();
      await ocr.initialize();

      setStatusText('Processing image...');
      setProgress(0.3);

      const ocrResult = await ocr.recognize(imageData);

      setStatusText('Extracting fields...');
      setProgress(0.7);

      const extractedPairs = extractKeyValuePairs(ocrResult);
      setPairs(extractedPairs);

      if (extractedPairs.length === 0) {
        throw new Error('No text found in image. Please use a clearer screenshot.');
      }

      setStatusText('Discovering page fields...');
      setProgress(0.9);

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) throw new Error('No active tab');

      let response;
      try {
        response = await chrome.tabs.sendMessage(tab.id, { type: 'DISCOVER_FIELDS' });
      } catch (err: any) {
        throw new Error('Content script not loaded. Please refresh the page and try again.');
      }

      if (response && response.payload) {
        setFields(response.payload.fields);
      }

      setProgress(1);
      setNormalStage('review');
    } catch (err: any) {
      console.error('[Popup] Processing error:', err);
      const errorMsg = err?.message || err?.toString() || 'Unknown error';
      let displayError = errorMsg;
      if (errorMsg.includes('Could not establish connection')) {
        displayError = 'Could not connect to the page. Please refresh the page and try again.';
      } else if (errorMsg.includes('fetch')) {
        displayError = 'Network error. Please check your internet connection.';
      }
      setError(`Failed to process image: ${displayError}`);
      setNormalStage('upload');
    }
  };

  const handleFillPage = async (dryRun = false) => {
    setNormalStage('filling');
    setError('');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) throw new Error('No active tab');

      if (mappings.length === 0) {
        throw new Error('No fields matched. Try adjusting your screenshot.');
      }

      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'FILL_FIELDS',
        payload: {
          mappings,
          fields,
          pairs,
          dryRun,
        },
      });

      console.log('[Popup] Fill response:', response);
      setNormalStage('done');
    } catch (err: any) {
      console.error('[Popup] Fill error:', err);
      setError(`Failed to fill fields: ${err?.message || err}`);
      setNormalStage('review');
    }
  };

  const handleEditValue = (pairId: string, newValue: string) => {
    setPairs((prev) => prev.map((p) => (p.id === pairId ? { ...p, value: newValue } : p)));
    setMappings((prev) => prev.map((m) => (m.ocrPairId === pairId ? { ...m, value: newValue } : m)));
  };

  const handleSaveRules = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) throw new Error('No active tab');

      const url = new URL(tab.url || '');
      await chrome.tabs.sendMessage(tab.id, {
        type: 'SAVE_RULES',
        payload: {
          domain: url.hostname,
          mappings,
          fields,
        },
      });

      alert('Rules saved for this domain!');
    } catch (err) {
      setError(`Failed to save rules: ${err}`);
    }
  };

  const handleMacroRun = async (macro: Macro) => {
    setSelectedMacro(macro);
    if (!macro.fieldMappings || macro.fieldMappings.length === 0) {
      setMacroRunSummary({
        macroId: macro.id,
        totalSelectors: 0,
        resolvedSelectors: 0,
        unresolvedSelectors: [],
      });
      setMacroStage('result');
      return;
    }

    setMacroStage('running');
    setMacroRunSummary(null);
    setError('');

    const selectors = macro.fieldMappings.map((mapping) => mapping.selector).filter(Boolean);

    if (selectors.length === 0) {
      setMacroRunSummary({
        macroId: macro.id,
        totalSelectors: 0,
        resolvedSelectors: 0,
        unresolvedSelectors: [],
      });
      setMacroStage('result');
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) throw new Error('No active tab');
      const tabId = tab.id;

      const response = await chrome.tabs.sendMessage(tabId, {
        type: 'RESOLVE_SELECTORS',
        payload: { selectors },
      });

      const resolvedMap: Record<string, boolean> = response?.payload?.resolved || {};
      const unresolvedSelectors = selectors.filter((selector) => !resolvedMap[selector]);
      const resolvedSelectors = selectors.length - unresolvedSelectors.length;

      setMacroRunSummary({
        macroId: macro.id,
        totalSelectors: selectors.length,
        resolvedSelectors,
        unresolvedSelectors,
      });
      setMacroStage('result');
      void updateMacroUsage(macro.id);
    } catch (err: any) {
      console.error('[Popup] Macro run failed:', err);
      setError(`Failed to run macro: ${err?.message || err}`);
      setMacroStage('list');
    }
  };

  const handleMacroPreview = async (macro: Macro) => {
    setSelectedMacro(macro);
    setMacroStage('preview');
    setMacroPreviewResolved(null);

    if (!macro.fieldMappings || macro.fieldMappings.length === 0) {
      return;
    }

    const selectors = macro.fieldMappings.map((mapping) => mapping.selector).filter(Boolean);
    if (selectors.length === 0) {
      return;
    }

    try {
      setMacroPreviewLoading(true);
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) throw new Error('No active tab');
      const tabId = tab.id;

      const response = await chrome.tabs.sendMessage(tabId, {
        type: 'RESOLVE_SELECTORS',
        payload: { selectors },
      });

      const resolvedMap: Record<string, boolean> = response?.payload?.resolved || {};
      setMacroPreviewResolved(resolvedMap);

      const highlightPromises = selectors
        .filter((selector) => resolvedMap[selector])
        .map(async (selector) => {
          await chrome.tabs.sendMessage(tabId, { type: 'SCROLL_TO_FIELD', payload: { selector, block: 'center' } });
          await chrome.tabs.sendMessage(tabId, { type: 'HIGHLIGHT_FIELD', payload: { selector, durationMs: 1500 } });
        });
      await Promise.all(highlightPromises);
    } catch (err: any) {
      console.error('[Popup] Macro preview failed:', err);
      setError(`Failed to preview macro: ${err?.message || err}`);
    } finally {
      setMacroPreviewLoading(false);
    }
  };

  const handleUndoFill = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) throw new Error('No active tab');
      await chrome.tabs.sendMessage(tab.id, { type: 'UNDO_FILL' });
      setMacroStage('list');
      setMacroRunSummary(null);
      setSelectedMacro(null);
    } catch (err: any) {
      setError(`Failed to undo: ${err?.message || err}`);
    }
  };

  const handleMacroRegionSelect = (region: any, name: string) => {
    setMacroRegions((prev) => [...prev, { rect: region, name, id: `region_${Date.now()}` }]);
  };

  const handleRegionComplete = () => {
    setStudioStage('colors');
  };

  const handleColorSelect = (_textColor: string, _backgroundColor: string) => {
    setStudioStage('smart');
  };

  const handleSmartExtractionConfigure = (regions: ExtractionRegion[]) => {
    setMacroExtractionRegions(regions);
    setStudioStage('fields');
  };

  const handleMacroComplete = async (fieldMappings: MacroFieldMapping[]) => {
    try {
      const macro: Macro = {
        id: generateMacroId(),
        name: `Macro ${macros.length + 1}`,
        description: `Extracts ${macroRegions.length} regions`,
        createdAt: Date.now(),
        useCount: 0,
        trainingScreenshot: macroTrainingImage,
        extractionRegions: macroExtractionRegions,
        targetFields: [],
        fieldMappings,
      };

      await saveMacro(macro);
      setMacros((prev) => [...prev, macro]);

      setStudioStage('upload');
      setMacroTrainingImage('');
      setMacroRegions([]);
      setMacroExtractionRegions([]);
      setActiveMode('macro');
    } catch (err: any) {
      setError(`Failed to save macro: ${err}`);
    }
  };

  const macroPreviewStats = useMemo(() => {
    if (!selectedMacro || !selectedMacro.fieldMappings || !macroPreviewResolved) {
      return null;
    }
    const selectors = selectedMacro.fieldMappings.map((mapping) => mapping.selector).filter(Boolean);
    if (selectors.length === 0) return null;
    const unresolved = selectors.filter((selector) => !macroPreviewResolved[selector]);
    return {
      total: selectors.length,
      resolved: selectors.length - unresolved.length,
      unresolved,
    };
  }, [selectedMacro, macroPreviewResolved]);

  const renderNormalMode = () => {
    if (normalStage === 'upload') {
      return (
        <div class="fm-card fm-popup__panel">
          <div class="fm-popup__panel-header">
            <h2 class="fm-h3">Import a screenshot</h2>
            <p class="fm-text-muted">We’ll extract labels and values in seconds.</p>
          </div>

          <div
            class={`fm-dropzone fm-popup__dropzone ${isNormalDragActive ? 'fm-dropzone--active' : ''}`}
            onDrop={handleNormalDrop}
            onDragOver={handleNormalDragOver}
            onDragLeave={handleNormalDragLeave}
            onClick={() => normalFileInputRef.current?.click()}
            tabIndex={0}
          >
            <div class="fm-popup__dropzone-icon" aria-hidden="true">📸</div>
            <h3 class="fm-h3">Drop or paste a screenshot</h3>
            <p class="fm-text-muted">Or click to select a file from your device.</p>
            <p class="fm-popup__hint">Supports JPG, PNG, WebP</p>
          </div>

          <input
            ref={normalFileInputRef}
            type="file"
            accept="image/*"
            class="fm-popup__hidden-input"
            onChange={(e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) {
                void handleNormalFile(file);
              }
            }}
          />
        </div>
      );
    }

    if (normalStage === 'processing') {
      return (
        <div class="fm-card fm-popup__panel fm-popup__panel--center">
          <div class="fm-spinner" role="status" aria-live="polite"></div>
          <h2 class="fm-h3">Processing screenshot…</h2>
          <p class="fm-text-muted">{statusText}</p>
          <div class="fm-progress">
            <div class="fm-progress__fill" style={{ width: `${progress * 100}%` }}></div>
          </div>
        </div>
      );
    }

    if (normalStage === 'review') {
      return (
        <div class="fm-card fm-popup__panel">
          <div class="fm-popup__panel-header">
            <h2 class="fm-h3">Review extracted data</h2>
            <p class="fm-text-muted">Found {pairs.length} potential matches. Adjust before filling.</p>
          </div>

          <div class="fm-popup__pairs">
            {pairs.map((pair) => {
              const mapping = mappings.find((m) => m.ocrPairId === pair.id);
              const status = mapping ? mapping.status : 'ignored';

              return (
                <div key={pair.id} class={`fm-card fm-popup__pair fm-popup__pair--${status}`}>
                  <div class="fm-popup__pair-header">
                    <strong>{pair.rawLabel}</strong>
                    <span class={`fm-popup__badge fm-popup__badge--${status}`}>{status}</span>
                  </div>
                  <input
                    type="text"
                    class="fm-input fm-popup__pair-input"
                    value={pair.value}
                    onInput={(e) => handleEditValue(pair.id, (e.target as HTMLInputElement).value)}
                  />
                  <div class="fm-popup__pair-meta">
                    <span>{pair.kind}</span>
                    <span>{Math.round(pair.conf * 100)}% confidence</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div class="fm-popup__actions">
            <button type="button" class="fm-btn fm-btn--secondary" onClick={() => handleFillPage(true)}>
              Preview
            </button>
            <button type="button" class="fm-btn fm-btn--primary" onClick={() => handleFillPage(false)}>
              Fill page
            </button>
          </div>
          <div class="fm-popup__secondary-actions">
            <button type="button" class="fm-btn fm-btn--link" onClick={handleSaveRules}>
              Save mapping rules
            </button>
            <button type="button" class="fm-btn fm-btn--link" onClick={() => setNormalStage('upload')}>
              Start over
            </button>
          </div>
        </div>
      );
    }

    if (normalStage === 'filling') {
      return (
        <div class="fm-card fm-popup__panel fm-popup__panel--center">
          <div class="fm-spinner" role="status" aria-live="polite"></div>
          <h2 class="fm-h3">Filling fields…</h2>
          <p class="fm-text-muted">Applying matches to the current page.</p>
        </div>
      );
    }

    return (
      <div class="fm-card fm-popup__panel fm-popup__panel--center">
        <div class="fm-popup__success-icon" aria-hidden="true">✓</div>
        <h2 class="fm-h3">Form filled successfully</h2>
        <p class="fm-text-muted">Review the page to confirm everything looks right.</p>
        <button type="button" class="fm-btn fm-btn--primary" onClick={() => setNormalStage('upload')}>
          Fill another form
        </button>
      </div>
    );
  };

  const renderMacroMode = () => {
    if (macroStage === 'list') {
      return (
        <MacroListPanel
          macros={macros}
          onPreview={(macro) => void handleMacroPreview(macro)}
          onRun={(macro) => void handleMacroRun(macro)}
          onCreateNew={() => setActiveMode('studio')}
        />
      );
    }

    if (macroStage === 'preview' && selectedMacro) {
      const mappingsCount = selectedMacro.fieldMappings?.length || 0;
      return (
        <div class="fm-card fm-popup__panel">
          <div class="fm-popup__panel-header">
            <button
              type="button"
              class="fm-btn fm-btn--link fm-popup__back"
              onClick={() => {
                setMacroStage('list');
                setSelectedMacro(null);
              }}
            >
              ← Back to macros
            </button>
            <h2 class="fm-h3">{selectedMacro.name}</h2>
            <p class="fm-text-muted">{selectedMacro.description || 'Saved automation'}</p>
          </div>

          <div class="fm-popup__macro-preview">
            <img
              src={selectedMacro.trainingScreenshot}
              alt="Macro training screenshot"
              class="fm-popup__macro-thumbnail"
            />
            <dl class="fm-popup__macro-stats">
              <div>
                <dt>Selectors</dt>
                <dd>{mappingsCount}</dd>
              </div>
              <div>
                <dt>Regions</dt>
                <dd>{selectedMacro.extractionRegions.length}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{new Date(selectedMacro.createdAt).toLocaleDateString()}</dd>
              </div>
            </dl>

            {(!selectedMacro.fieldMappings || selectedMacro.fieldMappings.length === 0) && (
              <p class="fm-popup__hint">No field mappings yet. Create in Macro Studio.</p>
            )}

            {macroPreviewStats && (
              <div class="fm-popup__macro-preview-status">
                <p>
                  Resolved {macroPreviewStats.resolved}/{macroPreviewStats.total} selectors.
                  {macroPreviewStats.unresolved.length > 0 && (
                    <span> {macroPreviewStats.unresolved.length} unresolved.</span>
                  )}
                </p>
                {macroPreviewStats.unresolved.length > 0 && (
                  <ul>
                    {macroPreviewStats.unresolved.map((selector) => (
                      <li key={selector} class="fm-text-muted">{selector}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div class="fm-popup__actions">
            <button
              type="button"
              class="fm-btn fm-btn--secondary"
              disabled={!selectedMacro.fieldMappings || macroPreviewLoading}
              onClick={() => selectedMacro && handleMacroPreview(selectedMacro)}
            >
              {macroPreviewLoading ? 'Checking…' : 'Dry-run preview'}
            </button>
            <button
              type="button"
              class="fm-btn fm-btn--primary"
              disabled={!selectedMacro.fieldMappings || selectedMacro.fieldMappings.length === 0}
              onClick={() => selectedMacro && handleMacroRun(selectedMacro)}
            >
              Run now
            </button>
          </div>
        </div>
      );
    }

    if (macroStage === 'running') {
      return (
        <div class="fm-card fm-popup__panel fm-popup__panel--center">
          <div class="fm-spinner" role="status" aria-live="polite"></div>
          <h2 class="fm-h3">Running macro…</h2>
          <p class="fm-text-muted">Checking saved selectors on the page.</p>
        </div>
      );
    }

    if (macroStage === 'result' && macroRunSummary && selectedMacro) {
      return (
        <div class="fm-card fm-popup__panel">
          <div class="fm-popup__panel-header">
            <button
              type="button"
              class="fm-btn fm-btn--link fm-popup__back"
              onClick={() => {
                setMacroStage('list');
                setMacroRunSummary(null);
                setSelectedMacro(null);
              }}
            >
              ← Back to macros
            </button>
            <h2 class="fm-h3">{selectedMacro.name}</h2>
            <p class="fm-text-muted">Run summary</p>
          </div>

          <div class="fm-popup__macro-result">
            <div class="fm-popup__macro-result-stat">
              <span class="fm-popup__macro-result-value">{macroRunSummary.resolvedSelectors}</span>
              <span class="fm-text-muted">selectors resolved</span>
            </div>
            <div class="fm-popup__macro-result-stat">
              <span class="fm-popup__macro-result-value">{macroRunSummary.totalSelectors}</span>
              <span class="fm-text-muted">total selectors</span>
            </div>
          </div>

          {macroRunSummary.unresolvedSelectors.length > 0 && (
            <div class="fm-popup__macro-unresolved">
              <h3 class="fm-h4">Unresolved selectors</h3>
              <ul>
                {macroRunSummary.unresolvedSelectors.map((selector) => (
                  <li key={selector}>{selector}</li>
                ))}
              </ul>
            </div>
          )}

          <div class="fm-popup__actions">
            <button type="button" class="fm-btn fm-btn--secondary" onClick={handleUndoFill}>
              Undo
            </button>
            <button type="button" class="fm-btn fm-btn--primary" onClick={() => setMacroStage('list')}>
              Done
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderStudioMode = () => {
    return (
      <div class="fm-card fm-popup__panel">
        <div class="fm-popup__panel-header">
          {studioStage !== 'upload' && (
            <button
              type="button"
              class="fm-btn fm-btn--link fm-popup__back"
              onClick={() => {
                setStudioStage('upload');
                setMacroTrainingImage('');
                setMacroRegions([]);
                setMacroExtractionRegions([]);
              }}
            >
              ← Start over
            </button>
          )}
          <h2 class="fm-h3">Macro Studio</h2>
          <p class="fm-text-muted">Teach FormMirror reusable automations.</p>
        </div>

        {studioStage === 'upload' && (
          <div
            class={`fm-dropzone fm-popup__dropzone ${isStudioDragActive ? 'fm-dropzone--active' : ''}`}
            onDrop={handleStudioDrop}
            onDragOver={handleStudioDragOver}
            onDragLeave={handleStudioDragLeave}
            onClick={() => studioFileInputRef.current?.click()}
            tabIndex={0}
          >
            <div class="fm-popup__dropzone-icon" aria-hidden="true">🧪</div>
            <h3 class="fm-h3">Drop or paste a training screenshot</h3>
            <p class="fm-text-muted">We’ll use this to locate fields automatically.</p>
          </div>
        )}

        {studioStage === 'regions' && (
          <RegionSelector
            image={macroTrainingImage}
            onSelect={handleMacroRegionSelect}
            onComplete={handleRegionComplete}
          />
        )}

        {studioStage === 'colors' && (
          <ColorSelector
            regions={macroRegions}
            onConfirm={handleColorSelect}
            onBack={() => setStudioStage('regions')}
          />
        )}

        {studioStage === 'smart' && (
          <SmartExtraction
            regions={macroRegions}
            onConfigured={handleSmartExtractionConfigure}
            onBack={() => setStudioStage('colors')}
          />
        )}

        {studioStage === 'fields' && (
          <FieldMapper
            regions={macroExtractionRegions}
            onComplete={handleMacroComplete}
            onBack={() => setStudioStage('smart')}
          />
        )}

        <input
          ref={studioFileInputRef}
          type="file"
          accept="image/*"
          class="fm-popup__hidden-input"
          onChange={(e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
              void handleStudioFile(file);
            }
          }}
        />
      </div>
    );
  };

  return (
    <div class="fm-root fm-popup">
      <header class="fm-card fm-popup__hero">
        <div class="fm-popup__hero-brand">
          <div class="fm-popup__hero-icon" aria-hidden="true">📋</div>
          <div>
            <h1 class="fm-h2 fm-popup__title">FormMirror</h1>
            <p class="fm-popup__subtitle fm-text-muted">Screenshot → Autofill. Instantly.</p>
          </div>
        </div>
        <div class="fm-popup__hero-actions">
          <span class="fm-pill">Local-first</span>
          <button
            type="button"
            class="fm-btn fm-btn--link fm-popup__hero-link"
            onClick={() => chrome.tabs.create({ url: 'https://github.com/formmirror/formmirror' })}
          >
            Help
          </button>
        </div>
      </header>

      {error && (
        <div class="fm-card fm-popup__error" role="alert">
          <span class="fm-popup__error-text">⚠️ {error}</span>
          <button type="button" class="fm-btn fm-btn--link fm-popup__dismiss" onClick={() => setError('')}>
            Dismiss
          </button>
        </div>
      )}

      <div class="fm-popup__mode-switch" role="tablist" aria-label="Popup mode">
        {MODE_TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={activeMode === tab.id}
            class={`fm-popup__mode-tab ${activeMode === tab.id ? 'is-active' : ''}`}
            onClick={() => setActiveMode(tab.id)}
          >
            <span aria-hidden="true" class="fm-popup__mode-emoji">
              {tab.emoji}
            </span>
            {tab.label}
          </button>
        ))}
      </div>

      <main class="fm-popup__main">
        {activeMode === 'normal' && renderNormalMode()}
        {activeMode === 'macro' && renderMacroMode()}
        {activeMode === 'studio' && renderStudioMode()}
      </main>

      <footer class="fm-popup__footer">
        <button type="button" class="fm-btn fm-btn--link" onClick={() => chrome.runtime.openOptionsPage()}>
          Settings
        </button>
        <span aria-hidden="true">•</span>
        <a
          class="fm-popup__footer-link"
          href="https://github.com/formmirror/formmirror"
          target="_blank"
          rel="noopener noreferrer"
        >
          Help
        </a>
        <span aria-hidden="true">•</span>
        <span class="fm-popup__footer-pill" title="All processing happens locally">🔒 Private</span>
      </footer>
    </div>
  );
}

interface MacroListPanelProps {
  macros: Macro[];
  onPreview: (macro: Macro) => void;
  onRun: (macro: Macro) => void;
  onCreateNew: () => void;
}

export function MacroListPanel({ macros, onPreview, onRun, onCreateNew }: MacroListPanelProps) {
  return (
    <div class="fm-card fm-popup__panel">
      <div class="fm-popup__panel-header">
        <h2 class="fm-h3">Macro Mode</h2>
        <p class="fm-text-muted">Run saved automations on this page.</p>
      </div>

      <div class="fm-popup__macro-actions">
        <button type="button" class="fm-btn fm-btn--primary" onClick={onCreateNew}>
          ➕ Create new macro
        </button>
      </div>

      {macros.length === 0 ? (
        <div class="fm-popup__empty-state">
          <p class="fm-text-muted">No macros yet. Create one in Macro Studio.</p>
        </div>
      ) : (
        <ul class="fm-popup__macro-list">
          {macros.map((macro) => (
            <li key={macro.id} class="fm-card fm-popup__macro-list-item">
              <div class="fm-popup__macro-list-details">
                <h3 class="fm-h4">{macro.name}</h3>
                <p class="fm-text-muted">{macro.description || 'No description provided.'}</p>
                <div class="fm-popup__macro-meta">
                  <span>Created {new Date(macro.createdAt).toLocaleDateString()}</span>
                  <span>Used {macro.useCount}×</span>
                </div>
              </div>
              <div class="fm-popup__macro-list-actions">
                <button type="button" class="fm-btn fm-btn--secondary" onClick={() => onPreview(macro)}>
                  Preview
                </button>
                <button type="button" class="fm-btn fm-btn--primary" onClick={() => onRun(macro)}>
                  Run
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  render(<Popup />, rootElement);
}
