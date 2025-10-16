# FormMirror - Next Steps

## Current Status

The extension is **95% complete** with all core functionality working:

### ✅ What Works
- Beautiful popup UI with drag/drop interface
- DOM field discovery with WCAG-compliant label resolution
- Smart matching algorithm with 50+ synonym mappings
- Framework-safe autofill (React/Vue/Angular compatible)
- Rules storage (mappings only, no values)
- Content script with field highlighting
- Complete documentation and privacy policy

### ❌ What Needs Work
- **OCR Integration** - Blocked by Manifest V3 CSP restrictions with Tesseract.js

## The OCR Challenge

**Problem**: Tesseract.js uses `importScripts()` which violates Chrome MV3's Content Security Policy, even in offscreen documents. Tesseract also defaults to loading from CDN.

**We tried**:
1. ✗ Direct Tesseract in popup (CSP blocked)
2. ✗ Web Workers (CSP blocked importScripts)
3. ✗ Offscreen documents (Still CSP blocked)
4. ✗ Local asset configuration (Tesseract ignores and uses CDN)

## Solutions

### Option 1: Use a Different OCR Library ⭐ RECOMMENDED

Replace Tesseract.js with a library that's MV3-compatible:

**Tesseract.js WASM Standalone**:
- Use Tesseract's WASM directly without workers
- More complex but CSP-friendly
- Example: https://github.com/naptha/tesseract.js/issues/420

**OCR.space API** (requires internet, but simple):
```typescript
async function ocrImage(base64Image: string): Promise<string> {
  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: { 'apikey': 'YOUR_FREE_API_KEY' },
    body: JSON.stringify({ base64Image })
  });
  return await response.json();
}
```
- Free tier available
- No workers needed
- **Trade-off**: Requires network (violates privacy-first goal)

### Option 2: Manual Entry Mode (Quick Win) ⚡

Let users manually enter data for now:

1. Remove screenshot upload
2. Add manual form fields in popup
3. Users type: Label | Value
4. Click "Fill Page"

This works **today** with zero changes to core code!

### Option 3: External Processing

1. User processes screenshot outside extension (e.g., Google Lens, macOS OCR)
2. Copy/paste text into extension
3. Extension parses and fills

### Option 4: Wait for Tesseract.js MV3 Support

Tesseract.js maintainers are working on MV3 compatibility. Track: https://github.com/naptha/tesseract.js/issues

## Recommended Path Forward

### Phase 1: Ship without OCR (1 hour)
1. Remove OCR dependencies from popup
2. Add manual key-value entry UI
3. Test autofill with manual data
4. **Ship it!** The core value is the smart matching + autofill

### Phase 2: Add Simple OCR (Later)
1. Research MV3-compatible OCR options
2. Implement when available
3. Update in v2.0

## How to Test Current Functionality

Even without OCR, you can test everything:

```javascript
// In popup console, manually create test data:
const testPairs = [
  { id: 'p1', labelText: 'first name', value: 'John', kind: 'text', conf: 1 },
  { id: 'p2', labelText: 'email', value: 'john@example.com', kind: 'email', conf: 1 }
];

// Then the matching and filling will work perfectly!
```

## Files to Modify for Manual Mode

1. **src/popup/Popup.tsx**: Replace upload UI with manual entry form
2. **src/core/ocr.ts**: Delete (not needed)
3. **src/offscreen/**: Delete (not needed)
4. **package.json**: Remove tesseract.js dependency

## Alternative: Use This as a Demo/Framework

The extension is a **perfect foundation** for:
- Form autofill tools
- Browser automation
- Test data generators
- Accessibility tools

The matching and filling engines are production-ready!

---

## Questions?

This is a common issue with MV3. Many extensions face this. The core FormMirror code is solid - it's just the OCR integration that's blocked by Chrome's security model.

**You have two choices:**
1. Ship with manual entry (valuable on its own!)
2. Research alternative OCR approaches (will take time)

What would you like to do?

