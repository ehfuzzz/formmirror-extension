# FormMirror Macro Bug - Code Snippets for Debugging

## Problematic Code Areas in `src/popup/Popup.tsx`

### 1. Event Handlers That May Route Incorrectly

```typescript
// These handlers need to check macroMode and route correctly
const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  const file = e.dataTransfer?.files[0];
  if (file) {
    // BUG: This might not be checking macroMode correctly
    if (macroMode === 'macro') {
      handleMacroTrainingImage(file);
    } else {
      handleFileSelect(file);
    }
  }
};

const handlePaste = async (event: ClipboardEvent) => {
  event.preventDefault();
  const items = event.clipboardData?.items;
  
  if (!items) return;
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.indexOf('image') !== -1) {
      const file = item.getAsFile();
      if (file) {
        // BUG: This logic might be flawed
        if (stage === 'macro-create') {
          await handleMacroTrainingImage(file);
        } else {
          await handleFileSelect(file);
        }
      }
      break;
    }
  }
};

// File input onChange handler
<input
  ref={fileInputRef}
  type="file"
  accept="image/*"
  style={{ display: 'none' }}
  onChange={(e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      // BUG: This might not be checking macroMode correctly
      if (macroMode === 'macro') {
        handleMacroTrainingImage(file);
      } else {
        handleFileSelect(file);
      }
    }
  }}
/>
```

### 2. The processImage Function That Shouldn't Be Called

```typescript
const processImage = async (imageData: string) => {
  // Safety check: Don't process if we're in macro creation mode
  if (stage === 'macro-create') {
    console.log('[Popup] Skipping OCR processing - in macro creation mode');
    return; // This should prevent OCR, but might not be working
  }
  
  setStage('processing'); // BUG: This might be called anyway
  setError('');
  setProgress(0);
  setStatusText('Initializing OCR...');

  try {
    const ocr = getCloudOcrEngine();
    await ocr.initialize();
    // ... OCR processing continues
  } catch (err: any) {
    // Error handling that might reset stage
    setError(`Failed to process image: ${displayError}`);
    if (!stage.toString().includes('macro')) {
      setStage('upload'); // This might interfere with macro flow
    }
  }
};
```

### 3. Macro Training Image Handler

```typescript
const handleMacroTrainingImage = async (file: File) => {
  console.log('[Macro] Processing training image:', file.name, file.type);
  
  if (!file.type.startsWith('image/')) {
    setError('Please select an image file');
    return;
  }

  // Clear any previous state and FORCE macro mode
  setError('');
  setMacroMode('macro'); // Set this FIRST
  setStage('macro-create'); // Then set stage
  
  console.log('[Macro] Forced macroMode to macro, stage to macro-create');
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const imageData = e.target?.result as string;
    console.log('[Macro] Image loaded, switching to regions stage');
    setMacroTrainingImage(imageData);
    setMacroCreationStage('regions'); // This should show region selector
  };
  reader.readAsDataURL(file);
};
```

### 4. UI Rendering Logic That Shows "Processing..."

```typescript
// This is likely where the "Processing..." UI is shown
{stage === 'processing' && (
  <div class="processing-section">
    <div class="spinner"></div>
    <h2>Processing...</h2>
    <p>{statusText}</p>
    <div class="progress-bar-container">
      <div class="progress-bar" style={{ width: `${progress * 100}%` }}></div>
    </div>
  </div>
)}

// Macro creation UI
{stage === 'macro-create' && (
  <div class="macro-creation">
    {macroCreationStage === 'upload' && (
      // Upload interface
    )}
    {macroCreationStage === 'regions' && macroTrainingImage && (
      // Region selector should show here
      <RegionSelector
        imageSrc={macroTrainingImage}
        onRegionSelect={handleRegionSelect}
        onComplete={handleRegionComplete}
      />
    )}
  </div>
)}
```

## Key Questions for Debugging:

1. **Is `processImage` being called?** - Add console.log at the start of `processImage`
2. **Is `setStage('processing')` being called?** - Search for all calls to `setStage('processing')`
3. **Are the event handlers routing correctly?** - Add logs to `handleDrop`, `handlePaste`, `onChange`
4. **Is there a race condition?** - Check if state updates are happening in the wrong order
5. **Is the UI rendering the wrong component?** - Check if `stage === 'processing'` is somehow true

## Potential Root Causes:

1. **Event Handler Routing**: The file upload handlers might not be checking `macroMode` correctly
2. **State Race Condition**: Multiple `setState` calls might be interfering with each other
3. **Hidden processImage Call**: Something might be calling `processImage` despite the safety check
4. **UI State Logic**: The rendering logic might be showing the wrong UI state
5. **Async State Updates**: The `FileReader.onload` callback might be running after other state changes

## Debugging Strategy:

1. Add comprehensive logging to trace execution path
2. Check if `processImage` is being called during macro creation
3. Verify that `handleMacroTrainingImage` is being called instead of `handleFileSelect`
4. Check if there are any `setStage('processing')` calls in the macro flow
5. Verify the UI rendering logic for the processing state
