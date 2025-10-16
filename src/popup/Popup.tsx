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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const macroFlowActiveRef = useRef(false);

  const isMacroFlowActive = () => {
    if (macroFlowActiveRef.current) {
      return true;
    }

    if (stage === 'macro-create' || stage === 'macro-select') {
      return true;
    }

    if (macroMode === 'macro' && macroCreationStage !== 'upload') {
      return true;
    }

    return false;
  };

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
    <div class="container">
      <header class="header">
        <h1>📋 FormMirror</h1>
        <p class="subtitle">Privacy-first form autofill from screenshots</p>
      </header>

      {error && (
        <div class="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {stage === 'macro-create' && (
        <div class="macro-creation">
          {macroCreationStage === 'upload' && (
            <div class="macro-upload">
              <h3>Create New Macro</h3>
              <p>Upload a training screenshot to teach the macro what data to extract</p>
              
              <div
                class="drop-zone"
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer?.files[0];
                  if (file) handleMacroTrainingImage(file);
                }}
                onDragOver={(e) => e.preventDefault()}
                onPaste={(e) => {
                  e.preventDefault();
                  const items = e.clipboardData?.items;
                  if (!items) return;
                  
                  for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    if (item.type.indexOf('image') !== -1) {
                      const file = item.getAsFile();
                      if (file) {
                        handleMacroTrainingImage(file);
                      }
                      break;
                    }
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                tabIndex={0}
              >
                <div class="drop-zone-content">
                  <div class="icon">📸</div>
                  <h2>Upload Training Screenshot</h2>
                  <p>Drop, paste, or click to select</p>
                  <p class="hint">This will be used to teach the macro what to look for</p>
                </div>
              </div>
            </div>
          )}

          {macroCreationStage === 'regions' && macroTrainingImage && (
            <div>
              <div class="macro-progress">
                <h3>✅ Image Loaded Successfully!</h3>
                <p>Now select the regions containing data you want to extract</p>
              </div>
              <RegionSelector
                imageSrc={macroTrainingImage}
                onRegionSelect={handleRegionSelect}
                onComplete={handleRegionComplete}
              />
            </div>
          )}

          {macroCreationStage === 'colors' && (
            <ColorSelector
              onColorSelect={handleColorSelect}
              onSkip={() => setMacroCreationStage('smart')}
            />
          )}

          {macroCreationStage === 'smart' && (
            <SmartExtraction
              regions={macroRegions}
              onConfigure={handleSmartExtractionConfigure}
              onBack={() => setMacroCreationStage('colors')}
            />
          )}

          {macroCreationStage === 'fields' && (
            <div class="field-mapping">
              <h3>Map to Form Fields</h3>
              <p>Connect your extraction regions to form fields</p>
              <p class="info">This feature is coming soon! For now, the macro will extract data and you can manually map it.</p>
              <button class="btn-primary" onClick={handleMacroComplete}>
                Create Macro
              </button>
            </div>
          )}
        </div>
      )}

      {stage === 'upload' && (
        <div class="upload-section">
          <div class="mode-selector">
            <button 
              class={`mode-btn ${macroMode === 'normal' ? 'active' : ''}`}
              onClick={() => setMacroMode('normal')}
            >
              📋 Normal Mode
            </button>
            <button 
              class={`mode-btn ${macroMode === 'macro' ? 'active' : ''}`}
              onClick={() => setMacroMode('macro')}
            >
              ⚡ Macro Mode
            </button>
          </div>

          {macroMode === 'normal' ? (
            <div
              class="drop-zone"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onPaste={handlePaste}
              onClick={() => fileInputRef.current?.click()}
              tabIndex={0}
            >
              <div class="drop-zone-content">
                <div class="icon">📸</div>
                <h2>Drop or paste a screenshot</h2>
                <p>Or click to select a file</p>
                <p class="hint">Supports JPG, PNG, WebP</p>
              </div>
            </div>
          ) : (
            <div class="macro-section">
              <div class="macro-buttons">
                <button
                  class="macro-btn primary"
                  onClick={() => {
                    console.log('[Macro] Starting macro creation');
                    macroFlowActiveRef.current = true;
                    setMacroMode('macro');
                    setStage('macro-create');
                    setMacroCreationStage('upload');
                    console.log('[Macro] Set macroMode to macro, stage to macro-create');
                  }}
                >
                  ➕ Create New Macro
                </button>
                <button 
                  class="macro-btn secondary"
                  onClick={() => setStage('macro-select')}
                  disabled={macros.length === 0}
                >
                  📁 Use Saved Macro ({macros.length})
                </button>
              </div>
              
              {macros.length > 0 && (
                <div class="recent-macros">
                  <h3>Recent Macros</h3>
                  {macros.slice(0, 3).map(macro => (
                    <div 
                      key={macro.id}
                      class="macro-item"
                      onClick={() => {
                        // setSelectedMacro(macro);
                        setStage('upload');
                      }}
                    >
                      <div class="macro-name">{macro.name}</div>
                      <div class="macro-meta">
                        Used {macro.useCount} times • {new Date(macro.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) {
                // Always use macro training image handler when in macro mode
                if (macroMode === 'macro' || isMacroFlowActive()) {
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
        <div class="processing-section">
          <div class="spinner"></div>
          <h2>Processing...</h2>
          <p>{statusText}</p>
          <div class="progress-bar">
            <div class="progress-fill" style={{ width: `${progress * 100}%` }}></div>
          </div>
        </div>
      )}

      {stage === 'review' && (
        <div class="review-section">
          <h2>Review Extracted Data</h2>
          <p class="info">Found {pairs.length} fields. Edit values before filling.</p>
          
          <div class="pairs-list">
            {pairs.map((pair) => {
              const mapping = mappings.find(m => m.ocrPairId === pair.id);
              const confidence = mapping ? mapping.status : 'ignored';
              
              return (
                <div key={pair.id} class={`pair-item ${confidence}`}>
                  <div class="pair-label">
                    <strong>{pair.rawLabel}</strong>
                    <span class={`badge ${confidence}`}>{confidence}</span>
                  </div>
                  <input
                    type="text"
                    class="pair-value"
                    value={pair.value}
                    onInput={(e) => handleEditValue(pair.id, (e.target as HTMLInputElement).value)}
                  />
                  <div class="pair-meta">
                    Type: {pair.kind} | Confidence: {Math.round(pair.conf * 100)}%
                  </div>
                </div>
              );
            })}
          </div>

          <div class="actions">
            <button class="btn btn-secondary" onClick={() => handleFillPage(true)}>
              Preview
            </button>
            <button class="btn btn-primary" onClick={() => handleFillPage(false)}>
              Fill Page
            </button>
          </div>
          <div class="secondary-actions">
            <button class="btn btn-link" onClick={handleSaveRules}>
              Save mapping rules
            </button>
            <button class="btn btn-link" onClick={() => setStage('upload')}>
              Start over
            </button>
          </div>
        </div>
      )}

      {stage === 'filling' && (
        <div class="processing-section">
          <div class="spinner"></div>
          <h2>Filling fields...</h2>
        </div>
      )}

      {stage === 'done' && (
        <div class="done-section">
          <div class="success-icon">✓</div>
          <h2>Form filled successfully!</h2>
          <p>Check the page for filled fields</p>
          <div class="actions">
            <button class="btn btn-primary" onClick={() => setStage('upload')}>
              Fill Another Form
            </button>
          </div>
        </div>
      )}

      <footer class="footer">
        <a href="#" onClick={() => chrome.runtime.openOptionsPage()}>Settings</a>
        <span>•</span>
        <a href="https://github.com/formmirror/formmirror" target="_blank">Help</a>
        <span>•</span>
        <span class="privacy-badge" title="All processing happens locally">🔒 Private</span>
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

