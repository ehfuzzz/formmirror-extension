/**
 * Popup UI - Main interface for FormMirror
 */

import { render } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import type { OcrPair, FieldDescriptor, FillMapping, Macro, ExtractionRegion } from '../core/types';
import { getCloudOcrEngine } from '../core/ocr-cloud';
import { extractKeyValuePairs } from '../core/kv-extract';
import { loadMacros, saveMacro, generateMacroId } from '../core/macro-storage';
import { RegionSelector } from '../components/RegionSelector';
import { ColorSelector } from '../components/ColorSelector';
import { SmartExtraction } from '../components/SmartExtraction';
import '../ui/styles/fm-tokens.css';
import '../ui/styles/fm-fonts.css';
import '../ui/styles/fm-base.css';
import '../ui/styles/fm-components.css';
import './popup.css';

function Popup() {
  const [stage, setStage] = useState<'upload' | 'processing' | 'review' | 'filling' | 'done' | 'macro-create' | 'macro-select'>('upload');
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [pairs, setPairs] = useState<OcrPair[]>([]);
  const [fields, setFields] = useState<FieldDescriptor[]>([]);
  const [mappings, setMappings] = useState<FillMapping[]>([]);
  const [error, setError] = useState<string>('');
  const [macros, setMacros] = useState<Macro[]>([]);
  // const [selectedMacro, setSelectedMacro] = useState<Macro | null>(null);
  const [macroMode, setMacroMode] = useState<'normal' | 'macro'>('normal');
  const [macroCreationStage, setMacroCreationStage] = useState<'upload' | 'regions' | 'colors' | 'smart' | 'fields'>('upload');
  const [macroTrainingImage, setMacroTrainingImage] = useState<string>('');
  const [macroRegions, setMacroRegions] = useState<Array<{ rect: any; name: string; id: string }>>([]);
  // const [macroColors, setMacroColors] = useState<{ textColor: string; backgroundColor: string }>({ textColor: '', backgroundColor: '' });
  const [macroExtractionRegions, setMacroExtractionRegions] = useState<ExtractionRegion[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isMacroDragActive, setIsMacroDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const macroFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Listen for messages from background
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'OCR_PROGRESS') {
        setProgress(message.payload.progress);
        setStatusText(message.payload.status);
      } else if (message.type === 'FIELDS_DISCOVERED') {
        setFields(message.payload.fields);
      }
    });
  }, []);

  useEffect(() => {
    if (stage !== 'macro-create' && macroFlowActiveRef.current) {
      console.log('[Macro] Stage changed away from macro-create - resetting macro flow flag');
      macroFlowActiveRef.current = false;
    }
  }, [stage]);

  const handleFileSelect = async (file: File) => {
    console.log('[FileSelect] File selected:', file.name, file.type);
    console.log('[FileSelect] Current macroMode:', macroMode);
    console.log('[FileSelect] Current stage:', stage);

    // If the user is in the macro creation flow, route the file to the macro handler instead
    if (isMacroFlowActive() || macroMode === 'macro') {
      console.log('[FileSelect] Detected macro creation context - forwarding to macro handler');
      await handleMacroTrainingImage(file);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageData = e.target?.result as string;
      console.log('[FileSelect] About to process image with OCR');
      await processImage(imageData);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    const file = e.dataTransfer?.files[0];
    if (file) {
      // Always use macro training image handler when in macro mode
      if (macroMode === 'macro' || isMacroFlowActive()) {
        handleMacroTrainingImage(file);
      } else {
        handleFileSelect(file);
      }
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (!isDragActive) {
      setIsDragActive(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleMacroDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsMacroDragActive(false);
    const file = e.dataTransfer?.files[0];
    if (file) {
      handleMacroTrainingImage(file);
    }
  };

  const handleMacroDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (!isMacroDragActive) {
      setIsMacroDragActive(true);
    }
  };

  const handleMacroDragLeave = () => {
    setIsMacroDragActive(false);
  };

  const handlePaste = async (event: ClipboardEvent) => {
    console.log('[Paste] Paste event triggered');
    console.log('[Paste] Current macroMode:', macroMode);
    console.log('[Paste] Current stage:', stage);
    console.log('[Paste] Current macroCreationStage:', macroCreationStage);
    
    event.preventDefault();
    const items = event.clipboardData?.items;
    
    if (!items) {
      console.log('[Paste] No clipboard items found');
      return;
    }
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          console.log('[Paste] Image file found:', file.name, file.type);
          
          // Check if we're in macro creation mode (more reliable than macroMode)
          if (isMacroFlowActive() || macroMode === 'macro') {
            console.log('[Paste] In macro creation mode - using training image handler');
            await handleMacroTrainingImage(file);
          } else {
            console.log('[Paste] In normal mode - using file select handler');
            await handleFileSelect(file);
          }
        }
        break;
      }
    }
  };

  const handleMacroTrainingImage = async (file: File) => {
    console.log('[Macro] Processing training image:', file.name, file.type);
    console.log('[Macro] Current macroMode:', macroMode);
    console.log('[Macro] Current stage:', stage);

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Clear any previous state and FORCE macro mode
    setError('');
    macroFlowActiveRef.current = true;
    setMacroMode('macro'); // Set this FIRST
    setStage('macro-create'); // Then set stage

    console.log('[Macro] Forced macroMode to macro, stage to macro-create');
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      console.log('[Macro] Image loaded, switching to regions stage');
      setMacroTrainingImage(imageData);
      setMacroCreationStage('regions');
    };
    reader.readAsDataURL(file);
  };

  // Removed unused function

  const handleRegionSelect = (region: any, name: string) => {
    setMacroRegions(prev => [...prev, { rect: region, name, id: `region_${Date.now()}` }]);
  };

  const handleRegionComplete = () => {
    setMacroCreationStage('colors');
  };

  const handleColorSelect = (_textColor: string, _backgroundColor: string) => {
    // setMacroColors({ textColor, backgroundColor });
    setMacroCreationStage('smart');
  };

  const handleSmartExtractionConfigure = (regions: ExtractionRegion[]) => {
    setMacroExtractionRegions(regions);
    setMacroCreationStage('fields');
  };

  const handleMacroComplete = async () => {
    try {
      const macro: Macro = {
        id: generateMacroId(),
        name: `Macro ${macros.length + 1}`,
        description: `Extracts ${macroRegions.length} regions`,
        createdAt: Date.now(),
        useCount: 0,
        trainingScreenshot: macroTrainingImage,
        extractionRegions: macroExtractionRegions,
        targetFields: [] // TODO: Implement field mapping
      };

      await saveMacro(macro);
      setMacros(prev => [...prev, macro]);
      
      // Reset macro creation
      setMacroCreationStage('upload');
      setMacroTrainingImage('');
      setMacroRegions([]);
      // setMacroColors({ textColor: '', backgroundColor: '' });
      setMacroExtractionRegions([]);
      setStage('upload');
      macroFlowActiveRef.current = false;

    } catch (error) {
      setError(`Failed to save macro: ${error}`);
    }
  };


  const processImage = async (imageData: string) => {
    // Safety check: Don't process if we're in macro creation mode
    if (isMacroFlowActive() || macroMode === 'macro') {
      console.log('[Popup] Skipping OCR processing - in macro creation mode');
      return;
    }
    
    setStage('processing');
    setError('');
    setProgress(0);
    setStatusText('Initializing OCR...');

    try {
      // Initialize Cloud OCR engine
      const ocr = getCloudOcrEngine();
      console.log('[Popup] Initializing Cloud OCR...');
      await ocr.initialize();

      setStatusText('Processing image...');
      setProgress(0.3);

      // Run OCR
      console.log('[Popup] Running OCR...');
      const ocrResult = await ocr.recognize(imageData);
      console.log('[Popup] OCR complete, extracted lines:', ocrResult.lines.length);
      
      setStatusText('Extracting fields...');
      setProgress(0.7);

      // Extract key-value pairs
      const extractedPairs = extractKeyValuePairs(ocrResult);
      console.log('[Popup] Extracted pairs:', extractedPairs.length);
      setPairs(extractedPairs);

      if (extractedPairs.length === 0) {
        throw new Error('No text found in image. Please use a clearer screenshot.');
      }

      setStatusText('Discovering page fields...');
      setProgress(0.9);

      // Request field discovery from content script
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) throw new Error('No active tab');

      // Discover fields on current page
      let response;
      try {
        response = await chrome.tabs.sendMessage(tab.id, { type: 'DISCOVER_FIELDS' });
      } catch (err: any) {
        // Content script not loaded - user needs to refresh the page
        throw new Error('Content script not loaded. Please refresh the page and try again.');
      }

      console.log('[Popup] Fields discovered:', response);
      if (response && response.payload) {
        setFields(response.payload.fields);
        console.log('[Popup] Set fields:', response.payload.fields.length);
      }

      setProgress(1);
      setStage('review');
    } catch (err: any) {
      console.error('[Popup] Processing error:', err);
      const errorMsg = err?.message || err?.toString() || 'Unknown error';
      
      // More user-friendly error messages
      let displayError = errorMsg;
      if (errorMsg.includes('Could not establish connection')) {
        displayError = 'Could not connect to the page. Please refresh the page and try again.';
      } else if (errorMsg.includes('fetch')) {
        displayError = 'Network error. Please check your internet connection.';
      }
      
      setError(`Failed to process image: ${displayError}`);
      // Only reset to upload if we're not in macro creation mode
      if (!stage.toString().includes('macro')) {
        setStage('upload');
      }
    }
  };

  const handleFillPage = async (dryRun = false) => {
    setStage('filling');
    setError('');

    console.log('[Popup] Filling page...', { 
      mappings: mappings.length, 
      pairs: pairs.length,
      fields: fields.length,
      dryRun 
    });

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) throw new Error('No active tab');

      if (mappings.length === 0) {
        throw new Error('No fields matched. Try adjusting your screenshot.');
      }

      // Send fill command with all necessary data
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'FILL_FIELDS',
        payload: { 
          mappings, 
          fields,
          pairs,
          dryRun 
        },
      });

      console.log('[Popup] Fill response:', response);
      setStage('done');
    } catch (err: any) {
      console.error('[Popup] Fill error:', err);
      setError(`Failed to fill fields: ${err?.message || err}`);
      setStage('review');
    }
  };

  const handleEditValue = (pairId: string, newValue: string) => {
    setPairs(pairs.map(p => p.id === pairId ? { ...p, value: newValue } : p));
    // Update mappings
    setMappings(mappings.map(m => m.ocrPairId === pairId ? { ...m, value: newValue } : m));
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

  useEffect(() => {
    if (stage === 'review' && pairs.length > 0 && fields.length > 0) {
      // Auto-match fields
      console.log('[Popup] Auto-matching fields...', { pairs: pairs.length, fields: fields.length });
      
      // Import and use match directly (no need for messaging)
      import('../core/match').then(({ matchPairsToFields, explainMatch }) => {
        const result = matchPairsToFields(pairs, fields);
        console.log('[Popup] Match result:', { 
          mappings: result.mappings.length,
          unmatchedFields: result.unmatchedFields.length,
          unmatchedPairs: result.unmatchedPairs.length 
        });
        
        // Debug: Log each mapping with explanation
        result.mappings.forEach((mapping, idx) => {
          const field = fields.find(f => f.id === mapping.fieldId);
          const pair = pairs.find(p => p.id === mapping.ocrPairId);
          if (field && pair) {
            const reasons = explainMatch(pair, field);
            console.log(`[Popup] Mapping ${idx + 1}:`, {
              ocrLabel: pair.rawLabel,
              ocrValue: pair.value,
              fieldLabel: field.labelText,
              score: mapping.score.toFixed(3),
              status: mapping.status,
              reasons: reasons.join(', ')
            });
          }
        });
        
        // Debug: Log unmatched pairs
        result.unmatchedPairs.forEach(pair => {
          console.log('[Popup] ⚠️ Unmatched OCR pair:', {
            label: pair.rawLabel,
            value: pair.value,
            kind: pair.kind
          });
        });
        
        setMappings(result.mappings);
      });
    }
  }, [stage, pairs, fields]);

  // Add paste event listener
  useEffect(() => {
    const handlePasteEvent = (event: ClipboardEvent) => handlePaste(event);
    document.addEventListener('paste', handlePasteEvent);
    return () => document.removeEventListener('paste', handlePasteEvent);
  }, []);

  // Load macros on component mount
  useEffect(() => {
    loadMacros().then(setMacros);
  }, []);

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
            <button
              type="button"
              class="fm-btn fm-btn--link fm-popup__dismiss"
              onClick={() => setError('')}
            >
              Dismiss
            </button>
          </div>
        )}

        <main class="fm-popup__main">
          {stage === 'macro-create' && (
            <div class="fm-card fm-popup__panel">
              <div class="fm-popup__panel-header">
                <button
                  type="button"
                  class="fm-btn fm-btn--link fm-popup__back"
                  onClick={() => {
                    setStage('upload');
                    setMacroMode('macro');
                    setMacroCreationStage('upload');
                  }}
                >
                  ← Back to Macro Mode
                </button>
                <h2 class="fm-h3">Macro Studio</h2>
                <p class="fm-text-muted">Teach FormMirror reusable automations.</p>
              </div>

              <div class="fm-popup__panel-body">
                {macroCreationStage === 'upload' && (
                  <div class="fm-popup__panel-section">
                    <div
                      class={`fm-dropzone fm-popup__dropzone ${isMacroDragActive ? 'fm-dropzone--active' : ''}`}
                      onDrop={handleMacroDrop}
                      onDragOver={handleMacroDragOver}
                      onDragLeave={handleMacroDragLeave}
                      onPaste={(e) => {
                        e.preventDefault();
                        const items = e.clipboardData?.items;
                        if (!items) return;
                        for (const item of Array.from(items)) {
                          if (item.type.startsWith('image/')) {
                            const file = item.getAsFile();
                            if (file) handleMacroTrainingImage(file);
                          }
                        }
                      }}
                      onClick={() => macroFileInputRef.current?.click()}
                      tabIndex={0}
                    >
                      <div class="fm-popup__dropzone-icon" aria-hidden="true">⚡</div>
                      <h3 class="fm-h3">Upload training screenshot</h3>
                      <p class="fm-text-muted">Drag & drop, paste, or click to choose a file.</p>
                      <p class="fm-popup__hint">Teaches the macro how to find your data.</p>
                    </div>

                    <input
                      ref={macroFileInputRef}
                      type="file"
                      accept="image/*"
                      class="fm-popup__hidden-input"
                      onChange={(e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) handleMacroTrainingImage(file);
                      }}
                    />
                  </div>
                )}

                {macroCreationStage === 'regions' && (
                  <div class="fm-popup__panel-section">
                    <h3 class="fm-h3">Select data regions</h3>
                    <p class="fm-text-muted">Draw boxes around the data you want to capture.</p>
                    <div class="fm-popup__panel-card">
                      <RegionSelector
                        imageSrc={macroTrainingImage}
                        onRegionSelect={handleRegionSelect}
                        onComplete={handleRegionComplete}
                      />
                    </div>
                  </div>
                )}

                {macroCreationStage === 'colors' && (
                  <div class="fm-popup__panel-section">
                    <ColorSelector
                      onColorSelect={handleColorSelect}
                      onSkip={() => setMacroCreationStage('smart')}
                    />
                  </div>
                )}

                {macroCreationStage === 'smart' && (
                  <div class="fm-popup__panel-section">
                    <SmartExtraction
                      regions={macroRegions}
                      onConfigure={handleSmartExtractionConfigure}
                      onBack={() => setMacroCreationStage('colors')}
                    />
                  </div>
                )}

                {macroCreationStage === 'fields' && (
                  <div class="fm-popup__panel-section fm-popup__panel-section--center">
                    <h3 class="fm-h3">Map to form fields</h3>
                    <p class="fm-text-muted">
                      Connect extracted regions to on-page inputs. Mapping automation is coming soon—manual mapping remains available.
                    </p>
                    <button class="fm-btn fm-btn--primary" type="button" onClick={handleMacroComplete}>
                      Create Macro
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {stage === 'macro-select' && (
            <div class="fm-card fm-popup__panel">
              <div class="fm-popup__panel-header">
                <button
                  type="button"
                  class="fm-btn fm-btn--link fm-popup__back"
                  onClick={() => setStage('upload')}
                >
                  ← Back
                </button>
                <h2 class="fm-h3">Choose a saved macro</h2>
                <p class="fm-text-muted">Launch a previously trained workflow.</p>
              </div>

              <div class="fm-popup__macro-grid">
                {macros.length === 0 ? (
                  <div class="fm-overlay-empty">No macros available yet.</div>
                ) : (
                  macros.map((macro) => (
                    <button
                      type="button"
                      key={macro.id}
                      class="fm-card fm-popup__macro-item"
                      onClick={() => {
                        setStage('upload');
                        setMacroMode('normal');
                      }}
                    >
                      <span class="fm-popup__macro-name">{macro.name}</span>
                      <span class="fm-popup__macro-meta">Used {macro.useCount}× • {new Date(macro.createdAt).toLocaleDateString()}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {stage === 'upload' && (
            <div class="fm-card fm-popup__panel">
              <div class="fm-popup__panel-header">
                <h2 class="fm-h3">Import a screenshot</h2>
                <p class="fm-text-muted">We’ll extract labels and values in seconds.</p>
              </div>

              <div class="fm-popup__mode-toggle" role="tablist">
                <button
                  type="button"
                  class={`fm-popup__mode-btn ${macroMode === 'normal' ? 'is-active' : ''}`}
                  onClick={() => setMacroMode('normal')}
                >
                  <span class="fm-popup__mode-emoji" aria-hidden="true">📋</span> Normal Mode
                </button>
                <button
                  type="button"
                  class={`fm-popup__mode-btn ${macroMode === 'macro' ? 'is-active' : ''}`}
                  onClick={() => setMacroMode('macro')}
                >
                  <span class="fm-popup__mode-emoji" aria-hidden="true">⚡</span> Macro Studio
                </button>
              </div>

              {macroMode === 'normal' ? (
                <div
                  class={`fm-dropzone fm-popup__dropzone ${isDragActive ? 'fm-dropzone--active' : ''}`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onPaste={handlePaste}
                  onClick={() => fileInputRef.current?.click()}
                  tabIndex={0}
                >
                  <div class="fm-popup__dropzone-icon" aria-hidden="true">📸</div>
                  <h3 class="fm-h3">Drop or paste a screenshot</h3>
                  <p class="fm-text-muted">Or click to select a file from your device.</p>
                  <p class="fm-popup__hint">Supports JPG, PNG, WebP</p>
                </div>
              ) : (
                <div class="fm-popup__macro-mode">
                  <div class="fm-popup__macro-actions">
                    <button
                      type="button"
                      class="fm-btn fm-btn--primary"
                      onClick={() => {
                        setMacroMode('macro');
                        setStage('macro-create');
                        setMacroCreationStage('upload');
                      }}
                    >
                      ➕ Create new macro
                    </button>
                    <button
                      type="button"
                      class="fm-btn fm-btn--secondary"
                      onClick={() => setStage('macro-select')}
                      disabled={macros.length === 0}
                    >
                      📁 Use saved macro ({macros.length})
                    </button>
                  </div>

                  {macros.length > 0 && (
                    <div class="fm-popup__macro-recents">
                      <h3 class="fm-h3">Recent macros</h3>
                      <div class="fm-popup__macro-recents-list">
                        {macros.slice(0, 3).map((macro) => (
                          <button
                            type="button"
                            key={macro.id}
                            class="fm-card fm-popup__macro-preview"
                            onClick={() => setStage('upload')}
                          >
                            <span class="fm-popup__macro-name">{macro.name}</span>
                            <span class="fm-popup__macro-meta">Used {macro.useCount}× • {new Date(macro.createdAt).toLocaleDateString()}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                class="fm-popup__hidden-input"
                onChange={(e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    if (macroMode === 'macro') {
                      handleMacroTrainingImage(file);
                    } else {
                      handleFileSelect(file);
                    }
                  }
                }}
              />
            </div>
          )}

          {stage === 'processing' && (
            <div class="fm-card fm-popup__panel fm-popup__panel--center">
              <div class="fm-spinner" role="status" aria-live="polite"></div>
              <h2 class="fm-h3">Processing screenshot…</h2>
              <p class="fm-text-muted">{statusText}</p>
              <div class="fm-progress">
                <div class="fm-progress__fill" style={{ width: `${progress * 100}%` }}></div>
              </div>
            </div>
          )}

          {stage === 'review' && (
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
                <button type="button" class="fm-btn fm-btn--link" onClick={() => setStage('upload')}>
                  Start over
                </button>
              </div>
            </div>
          )}

          {stage === 'filling' && (
            <div class="fm-card fm-popup__panel fm-popup__panel--center">
              <div class="fm-spinner" role="status" aria-live="polite"></div>
              <h2 class="fm-h3">Filling fields…</h2>
              <p class="fm-text-muted">Applying matches to the current page.</p>
            </div>
          )}

          {stage === 'done' && (
            <div class="fm-card fm-popup__panel fm-popup__panel--center">
              <div class="fm-popup__success-icon" aria-hidden="true">✓</div>
              <h2 class="fm-h3">Form filled successfully</h2>
              <p class="fm-text-muted">Review the page to confirm everything looks right.</p>
              <button type="button" class="fm-btn fm-btn--primary" onClick={() => setStage('upload')}>
                Fill another form
              </button>
            </div>
          )}
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

// Listen for paste events globally
window.addEventListener('paste', async (e: ClipboardEvent) => {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (const item of Array.from(items)) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      // Trigger the popup's paste handler
      window.dispatchEvent(new CustomEvent('formmirror-paste', { detail: item }));
      break;
    }
  }
});

render(<Popup />, document.getElementById('root')!);

