# Privacy Policy

**FormMirror** - Screenshot-to-Autofill Chrome Extension

**Last Updated**: October 12, 2025

---

## Our Commitment

FormMirror is designed with **privacy as the foundation**, not an afterthought. We believe your data belongs to you, and we've architected this extension to process everything locally without ever sending your information anywhere.

---

## What Data We Process (Locally)

### 1. Screenshots You Provide

- **How**: You drag, drop, or paste an image into the extension
- **Processing**: OCR (text recognition) runs entirely in your browser using WebAssembly
- **Storage**: Images are **never stored**. They're processed in memory and discarded immediately
- **Network**: Images **never leave your device**

### 2. Form Field Data

- **How**: We scan the active webpage to find fillable form fields
- **Processing**: Field labels and attributes are analyzed locally
- **Storage**: **No user-entered values** are ever stored
- **Network**: Field data **never leaves your device**

### 3. Optional Mapping Rules

- **How**: When you click "Save mapping rules," we store label → field selector mappings
- **What We Store**: CSS selectors and field attributes (e.g., `"email" → input[name="email"]`)
- **What We DON'T Store**: Your actual values (email addresses, names, etc.)
- **Storage Location**: `chrome.storage.local` (on your device only, never synced)
- **Purpose**: Improve autofill accuracy on repeat visits to the same site

### 4. Extension Settings

- **What**: OCR language, threshold preferences, custom synonyms
- **Storage**: `chrome.storage.local` (on your device)
- **Sync**: We **never use** `chrome.storage.sync` - your data stays on this device

---

## What We DON'T Do

### ❌ No Network Requests

- FormMirror makes **zero network requests** after installation
- All OCR models and libraries are bundled in the extension
- We enforce a strict Content Security Policy (CSP) that blocks external code

### ❌ No Analytics or Tracking

- No Google Analytics, no telemetry, no usage stats
- We don't know how many times you use the extension
- We don't know what websites you visit
- We don't know what forms you fill

### ❌ No Cloud Processing

- Everything happens in your browser (client-side)
- We don't have servers to send your data to (because we don't want it!)

### ❌ No Third-Party Services

- All dependencies are open-source libraries bundled locally
- No CDNs, no remote scripts, no tracking pixels

### ❌ No Data Sales or Sharing

- We have no business model that involves your data
- We don't share data because we don't collect data
- We can't be compelled to hand over data we never had

---

## Technical Guarantees

### Architecture

1. **WebAssembly OCR**: Tesseract.js runs entirely in WASM, sandboxed from the network
2. **Local Storage Only**: `chrome.storage.local` - never synced, never uploaded
3. **Content Security Policy**: Blocks all external scripts and resources
4. **Manifest V3**: Modern Chrome extension standard with strict permissions

### Permissions Explained

| Permission | Why We Need It |
|------------|----------------|
| `activeTab` | To scan form fields on the current page when you click "Fill" |
| `scripting` | To inject our content script for form filling |
| `storage` | To save optional mapping rules (no values) locally |

**We do NOT request**:
- Host permissions (no access to all websites)
- Network permissions (no ability to make HTTP requests)
- Clipboard access (paste is user-initiated)

### Code Transparency

- **Open Source**: [View our code on GitHub](https://github.com/formmirror/formmirror)
- **Auditable**: Every line of code is public for security researchers
- **Build Verification**: Reproducible builds (instructions in README)

### Privacy Tests

In development mode, we actively monitor for any network requests:

```typescript
// src/background/sw.ts
chrome.webRequest?.onBeforeRequest.addListener((details) => {
  if (!details.url.startsWith('chrome-extension://')) {
    console.error('[Privacy Violation] Network request detected:', details.url);
  }
}, { urls: ['<all_urls>'] });
```

---

## Your Rights

### Data You Control

- **Mapping Rules**: Delete anytime via Settings → Clear All Data
- **Extension Data**: Uninstall the extension to remove all local data
- **Browser Data**: Chrome's `chrome://extensions/` → Remove

### Data Portability

Since we don't store user values, there's nothing to export. Mapping rules are stored in JSON format in `chrome.storage.local` and can be inspected via Chrome DevTools.

---

## Threat Model & Limitations

### What We Protect Against

✅ **Network eavesdropping**: No data leaves your device  
✅ **Server breaches**: We have no servers  
✅ **Third-party tracking**: No external dependencies  
✅ **Extension updates that change behavior**: Open-source + community review

### What We Can't Protect Against

⚠️ **Malicious websites**: Once we fill a form, the website can access that data (as with any autofill)  
⚠️ **Screen recording malware**: If your device is compromised, all bets are off  
⚠️ **Browser vulnerabilities**: We rely on Chrome's security sandbox  
⚠️ **User error**: Pasting screenshots with sensitive data (e.g., SSNs) into untrusted sites

### Best Practices

- Only use FormMirror on websites you trust
- Avoid screenshots containing passwords or highly sensitive data (we skip password fields, but still)
- Review the filled data before submitting forms

---

## Updates to This Policy

We may update this policy to reflect changes in the extension. Material changes will be announced via:

- GitHub release notes
- Chrome Web Store description
- In-extension notification (no analytics, just a one-time notice)

**You can always check the latest policy**: [https://github.com/formmirror/formmirror/blob/main/privacy/POLICY.md](https://github.com/formmirror/formmirror/blob/main/privacy/POLICY.md)

---

## Contact

For privacy questions, security reports, or concerns:

- **GitHub Issues**: [Report a privacy concern](https://github.com/formmirror/formmirror/issues/new?labels=privacy)
- **Security**: See [SECURITY.md](../SECURITY.md) for vulnerability reporting

---

## Legal

**Jurisdiction**: This extension is provided as-is under the Apache-2.0 license. See [LICENSE](../LICENSE) for full terms.

**GDPR Compliance**: We don't process personal data in a way that requires GDPR compliance (everything is local), but we respect the spirit of data minimization and user control.

**CCPA Compliance**: We don't sell data because we don't collect data.

---

**FormMirror Privacy Pledge**:

*"We will never process your data on our servers because we believe the best way to protect privacy is to never have access to your data in the first place."*

🔒 **Built with privacy. Not bolted on.**
