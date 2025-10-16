# Build Instructions

Complete guide to building FormMirror from source.

---

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+ (comes with Node.js)
- **Git**
- **Chrome** (latest stable)

---

## Quick Start

```bash
# Clone repository
git clone https://github.com/formmirror/formmirror.git
cd formmirror

# Install dependencies
npm install

# Download Tesseract assets
chmod +x scripts/download-assets.sh
./scripts/download-assets.sh

# Build extension
npm run build

# Load in Chrome:
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the `dist/` directory
```

---

## Development Mode

```bash
# Start Vite in watch mode
npm run dev

# The extension will rebuild on file changes
# Reload the extension in chrome://extensions/ to see changes
```

### Hot Reload Tips

- Changes to **popup UI** - Close and reopen popup
- Changes to **content script** - Reload the page
- Changes to **background worker** - Reload extension in chrome://extensions/

---

## Build Steps Explained

### 1. Install Dependencies

```bash
npm install
```

This installs:
- **Tesseract.js** - OCR engine
- **Preact** - Lightweight React alternative
- **Vite** - Build tool
- **TypeScript** - Type checking
- **Vitest** - Testing framework

### 2. Download Assets

```bash
./scripts/download-assets.sh
```

Downloads ~33 MB of Tesseract.js assets:
- Worker scripts
- WASM binaries
- English language data

**Why locally?** Privacy guarantee - no runtime downloads.

### 3. Build Extension

```bash
npm run build
```

Vite compiles:
- TypeScript → JavaScript
- Preact → Optimized bundles
- Copies assets to `dist/`
- Generates manifest.json

Output: `dist/` directory ready to load in Chrome.

---

## Build Variants

### Production Build

```bash
npm run build
```

- Minified code
- Tree-shaking (removes unused code)
- Source maps disabled
- Optimized for size

### Development Build

```bash
npm run dev
```

- Unminified code
- Fast rebuilds
- Source maps enabled
- Debug logging enabled

### Watch Mode

```bash
npm run dev
```

Watches for file changes and rebuilds automatically.

---

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:ui

# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format
```

---

## Packaging for Distribution

### Create ZIP for Chrome Web Store

```bash
# Build first
npm run build

# Create ZIP
cd dist
zip -r ../formmirror-v1.0.0.zip .
cd ..
```

Upload `formmirror-v1.0.0.zip` to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

### Create CRX (Advanced)

```bash
# Generate private key (first time only)
openssl genrsa 2048 | openssl pkcs8 -topk8 -nocrypt -out key.pem

# Pack extension
chrome --pack-extension=./dist --pack-extension-key=./key.pem

# Output: dist.crx
```

**Note**: Self-hosted CRX files are hard to distribute due to Chrome's security policies. Use Chrome Web Store for public distribution.

---

## Reproducible Builds

To verify a build is authentic:

1. Clone the exact commit: `git clone --branch v1.0.0 https://github.com/formmirror/formmirror.git`
2. Follow build steps exactly
3. Compare checksums:

```bash
# After building
cd dist
find . -type f -exec sha256sum {} \; | sort > ../checksums.txt
```

Published releases include checksums for verification.

---

## Troubleshooting

### "Module not found" errors

```bash
rm -rf node_modules package-lock.json
npm install
```

### Vite build fails

Check Node.js version:
```bash
node --version  # Should be 18+
```

### Extension doesn't load in Chrome

- Ensure `dist/` directory exists
- Check for errors in console (F12 → Console)
- Try `npm run build` again

### Tesseract assets missing

```bash
./scripts/download-assets.sh
```

If script fails, manually download from [Tesseract.js releases](https://github.com/naptha/tesseract.js/releases).

### Tests fail

```bash
npm run test -- --reporter=verbose
```

Check for:
- Missing dependencies
- Browser API mocks (tests/setup.ts)
- DOM environment issues

---

## CI/CD

### GitHub Actions (Example)

```yaml
name: Build and Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run lint
      - run: npm run type-check
      - run: npm test
      - run: npm run build
```

---

## Build Output

After building, `dist/` contains:

```
dist/
├── manifest.json
├── assets/
│   └── tesseract/           # 33 MB of OCR assets
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── src/
│   ├── popup/
│   │   ├── popup.html
│   │   └── popup.js         # Compiled from Popup.tsx
│   ├── content/
│   │   ├── content.js       # Compiled from content.ts
│   │   └── overlay.css
│   └── background/
│       └── sw.js            # Compiled from sw.ts
└── chunks/                  # Code-split bundles
```

Total size: ~35-40 MB (mostly Tesseract assets).

---

## Advanced

### Custom Tesseract Language

1. Download `.traineddata` from [tessdata](https://github.com/naptha/tessdata/tree/main/4.0.0)
2. Place in `public/assets/tesseract/lang-data/`
3. Update settings UI to expose language option
4. Rebuild: `npm run build`

### Optimize Bundle Size

```bash
# Analyze bundle
npm run build -- --analyze

# Opens interactive bundle visualizer
```

Look for:
- Duplicate dependencies
- Unused code
- Large libraries

---

## Questions?

- **Discussions**: [GitHub Discussions](https://github.com/formmirror/formmirror/discussions)
- **Issues**: [Report a build problem](https://github.com/formmirror/formmirror/issues/new)

---

**Happy building!** 🛠️

