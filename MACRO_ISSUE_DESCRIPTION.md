# FormMirror Extension - Macro Training Issue

## Extension Overview

FormMirror is a Chrome MV3 extension that autofills web forms from screenshots using OCR. It has two main modes:

1. **Normal Mode**: Takes a screenshot → OCR → extracts key-value pairs → matches to form fields → autofills
2. **Macro Mode**: Allows users to create reusable extraction patterns for specific data types

## Macro System Architecture

The macro system allows users to:
- Create training screenshots with annotated regions
- Define extraction rules (color, position, patterns)
- Save macros for reuse
- Apply macros to new screenshots

### Key Components:
- `src/popup/Popup.tsx` - Main UI with mode selection
- `src/components/RegionSelector.tsx` - Rectangle selection tool
- `src/components/ColorSelector.tsx` - Color picker for text/background
- `src/components/SmartExtraction.tsx` - Advanced extraction options
- `src/core/macro-storage.ts` - Macro persistence
- `src/core/macro-executor.ts` - Macro execution logic

## The Bug: Macro Training Stuck in "Processing..."

### Problem Description

When users click "Create New Macro" and upload/paste a training screenshot, the extension gets stuck in the "Processing..." stage instead of proceeding to the region selection interface.

### Expected Flow:
1. User clicks "Create New Macro" 
2. User uploads/pastes training screenshot
3. Image loads → switches to region selection stage
4. User draws rectangles around data regions
5. User configures colors and extraction options
6. User maps regions to form fields
7. Macro is saved

### Actual Flow (Broken):
1. User clicks "Create New Macro" ✅
2. User uploads/pastes training screenshot ✅
3. **BUG**: Extension shows "Processing..." forever ❌
4. Never reaches region selection stage ❌

### Root Cause Analysis

The issue appears to be in the state management and event handling in `src/popup/Popup.tsx`. The macro creation flow is incorrectly triggering the normal OCR processing pipeline instead of directly loading the image for region selection.

### Key State Variables:
```typescript
const [stage, setStage] = useState<'upload' | 'processing' | 'review' | 'filling' | 'done' | 'macro-create' | 'macro-select'>('upload');
const [macroMode, setMacroMode] = useState<'normal' | 'macro'>('normal');
const [macroCreationStage, setMacroCreationStage] = useState<'upload' | 'regions' | 'colors' | 'smart' | 'fields'>('upload');
```

### Problematic Code Areas:

1. **File Upload Handlers**: `handleDrop`, `handlePaste`, and `fileInputRef.onChange` may be routing to `handleFileSelect` instead of `handleMacroTrainingImage`

2. **Image Processing**: `processImage` function may be called even in macro creation mode

3. **State Transitions**: The state machine may not properly distinguish between normal OCR flow and macro training flow

### Debugging Evidence:

From console logs, we see:
- `[Macro] Processing training image: ...` - Image is being processed
- `[Macro] Forced macroMode to macro, stage to macro-create` - State is set correctly
- But then the extension shows "Processing..." instead of region selection

### Attempted Fixes (That Didn't Work):

1. **Safety Check in processImage**: Added early return if `stage === 'macro-create'`
2. **Explicit State Setting**: Force `macroMode` and `stage` in `handleMacroTrainingImage`
3. **Event Handler Routing**: Modified `handleDrop`, `handlePaste` to check `macroMode`
4. **Error Handling**: Prevent stage reset in macro creation mode

### Current Code Structure:

```typescript
// In Popup.tsx
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
    setMacroCreationStage('regions');
  };
  reader.readAsDataURL(file);
};

const processImage = async (imageData: string) => {
  // Safety check: Don't process if we're in macro creation mode
  if (stage === 'macro-create') {
    console.log('[Popup] Skipping OCR processing - in macro creation mode');
    return;
  }
  
  // ... OCR processing logic
};
```

### The Issue:

Despite the safety checks, the macro creation flow is still somehow triggering the OCR processing pipeline. The "Processing..." UI is likely being shown because:

1. `setStage('processing')` is being called somewhere in the macro flow
2. The `processImage` function is being invoked despite the safety check
3. There's a race condition in state updates
4. The event handlers are not properly routing to the macro-specific handlers

### Files to Examine:

1. **`src/popup/Popup.tsx`** - Main UI component with state management
2. **`src/popup/popup.css`** - UI styling (check for processing state display)
3. **Event handlers**: `handleDrop`, `handlePaste`, `fileInputRef.onChange`
4. **State transitions**: Look for any `setStage('processing')` calls

### Debugging Steps Needed:

1. Add more console logs to trace the exact execution path
2. Check if `processImage` is being called despite safety checks
3. Verify that `handleMacroTrainingImage` is being called instead of `handleFileSelect`
4. Check if there are any `setStage('processing')` calls in the macro flow
5. Verify the UI rendering logic for the processing state

### Expected Fix:

The issue is likely in the event handler routing or state management. The fix should ensure that:
1. When in macro mode, all image uploads go to `handleMacroTrainingImage`
2. `processImage` is never called during macro creation
3. The UI correctly shows the region selection interface after image upload
4. State transitions are atomic and don't have race conditions

This is a critical bug that prevents users from creating macros, which is a core feature of the extension.
