# FormMirror 📋

**Screenshot-to-Autofill Chrome Extension** — Privacy-first form filling from images

FormMirror lets you fill web forms by simply dropping a screenshot of a previously completed form. All OCR and processing happens **100% locally** in your browser using WebAssembly. Zero network calls, zero data collection, zero compromise.

---

## ✨ Features

- 🖼️ **Drag & Drop** screenshots or paste from clipboard
- 🔍 **Local OCR** powered by Tesseract.js (WASM)
- 🎯 **Smart Matching** using AI-like similarity scoring and synonyms
- ⚛️ **Framework-Safe** filling works with React, Vue, Angular
- 🔒 **Privacy-First** — all processing happens on-device
- 💾 **Optional Rules** — save field mappings (never values) per domain
- 🎨 **Beautiful UI** with live preview and confidence scores
- ♿ **Accessible** — follows WCAG label resolution

---

## 🚀 Quick Start

### Installation

1. **Download the extension** from the Chrome Web Store (coming soon) or build from source
2. **Pin the extension** to your toolbar for easy access
3. **Open a web form** you want to fill
4. **Click the FormMirror icon** and drop/paste a screenshot
5. **Review and fill** — that's it!

### Building from Source

```bash
# Clone the repository
git clone https://github.com/formmirror/formmirror.git
cd formmirror

# Install dependencies
npm install

# Build the extension
npm run build

# The built extension will be in the `dist/` directory
# Load it in Chrome via chrome://extensions/ (enable Developer mode)
```

### Development Mode

```bash
npm run dev
```

This starts Vite in watch mode. Load the `dist/` directory as an unpacked extension in Chrome and it will auto-reload on changes.

---

## 📖 How It Works

### 1. OCR Processing

- Uses **Tesseract.js** (WebAssembly) for text recognition
- Optional **preprocessing** for image enhancement (grayscale, threshold, denoise)
- Extracts **word-level bounding boxes** for spatial analysis

### 2. Key-Value Extraction

Intelligent heuristics identify label-value pairs:

- **Colon separators**: `"First Name: John"` → `label="First Name"`, `value="John"`
- **Horizontal layout**: Label on left, value on right with gap
- **Vertical layout**: Label above value
- **Pattern matching**: Email, phone, dates, ZIP codes

### 3. DOM Field Discovery

Follows **WCAG accessible name algorithm**:

1. `<label for="id">`
2. `aria-labelledby`
3. `aria-label`
4. `placeholder`
5. Nearby text nodes
6. `name` / `id` attributes (humanized)

### 4. Smart Matching

**Multi-factor similarity scoring**:

- **Token similarity** (Jaccard + Levenshtein)
- **Abbreviations** (zip ↔ postal, dob ↔ date of birth)
- **Type matching** (email field ↔ email value)
- **Synonym dictionary** (first name ↔ given name)
- **Proximity boost** (explicit labels score higher)

Auto-fills at **78%+ confidence**, suggests review at **55-78%**, ignores below.

### 5. Framework-Safe Filling

- Uses **native property setters** to bypass virtual DOM
- Dispatches **`input` and `change` events** for React/Vue/Angular
- Special handling for **date, select, contenteditable**
- Never fills **password or file inputs**

---

## 🔒 Privacy Guarantees

### What We DON'T Do

❌ **No network requests** — Everything runs locally  
❌ **No analytics or tracking**  
❌ **No cloud processing**  
❌ **No value storage** — We only save mapping rules (label → field selector), never your data  
❌ **No third-party services**

### What We DO

✅ All OCR happens in **WebAssembly** (Tesseract.js)  
✅ All models and libraries are **bundled locally**  
✅ Optional per-domain **mapping rules** stored locally (no values)  
✅ **Content Security Policy** blocks external code  
✅ **Open source** — audit the code yourself

### Threat Model

- **Screenshots may contain PII** — Users should only process images they trust
- **Malicious websites** — We can't prevent a site from stealing filled data after filling
- **Browser vulnerabilities** — We rely on Chrome's sandbox for isolation

### Privacy Test

In development mode, we assert that `fetch()` is never called to external origins. See `src/background/sw.ts`.

---

## 🛠️ Configuration

### Settings (Future Release)

Access via the extension icon → Settings:

- **OCR Language**: Default `eng`, add more from Tesseract
- **Preprocessing**: Enable/disable image enhancement
- **Thresholds**: Auto-fill and review confidence levels
- **Custom Synonyms**: Add domain-specific term mappings
- **Debug Mode**: Show detailed logs and bounding boxes

### Saved Rules

When you click **"Save mapping rules"** after filling a form:

- We store **label → CSS selector mappings** for that domain
- **No user values** are saved
- Rules improve accuracy on repeat visits
- Stored in `chrome.storage.local` (never synced)

Clear rules anytime via Settings → Clear All Data.

---

## 🧪 Testing

### Run Tests

```bash
# Unit tests
npm test

# With UI
npm run test:ui

# E2E tests (Puppeteer)
npm run test:e2e
```

### Test Coverage

- **Unit tests** for matching, OCR parsing, DOM scanning
- **Integration tests** for full OCR → match → fill pipeline
- **E2E tests** with sample forms (React, plain HTML)

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Adding Synonyms

Edit `src/core/synonyms.json`:

```json
{
  "your term": ["synonym1", "synonym2", "synonym3"]
}
```

### Adding Languages

1. Download Tesseract traineddata from [tessdata](https://github.com/tesseract-ocr/tessdata)
2. Place in `public/assets/tesseract/lang-data/`
3. Update manifest to include new language option

---

## 📜 License

**Apache-2.0** — See [LICENSE](./LICENSE)

Permissive open-source license. You can use, modify, and distribute this software, even for commercial purposes, as long as you include the license and copyright notice.

---

## 🙏 Acknowledgments

- **Tesseract.js** — Amazing OCR in the browser
- **Chrome Extension API** — Solid extension platform
- **Open-source community** — For making privacy-first software possible

---

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/formmirror/formmirror/issues)
- **Discussions**: [GitHub Discussions](https://github.com/formmirror/formmirror/discussions)
- **Security**: See [SECURITY.md](./SECURITY.md) for reporting vulnerabilities

---

## 🗺️ Roadmap

- [ ] Chrome Web Store release
- [ ] Firefox support (MV3)
- [ ] Multi-page form support
- [ ] Interactive field mapper (Ctrl-click to bind)
- [ ] Date/phone normalization per locale
- [ ] OpenCV.js advanced preprocessing
- [ ] Safari support

---

**Made with ❤️ for privacy-conscious users**

*No tracking. No cloud. No compromise.*

