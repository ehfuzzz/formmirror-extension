# Assets Directory

This directory contains locally bundled assets for offline operation.

## Tesseract.js Assets

To enable OCR functionality, you need to download Tesseract.js assets:

### Required Files

```
assets/
└── tesseract/
    ├── worker.min.js           # Tesseract worker
    ├── tesseract-core.wasm.js  # Core WASM
    └── lang-data/
        └── eng.traineddata     # English language data
```

### Download Instructions

1. **Worker & Core**:
   - Download from [tesseract.js releases](https://github.com/naptha/tesseract.js/releases)
   - Get `worker.min.js` and `tesseract-core.wasm.js`
   - Place in `assets/tesseract/`

2. **Language Data**:
   - Download from [tessdata](https://github.com/naptha/tessdata/tree/main/4.0.0)
   - Get `eng.traineddata` (or other languages)
   - Place in `assets/tesseract/lang-data/`

### Automated Download

Run this script (requires `curl`):

```bash
#!/bin/bash
mkdir -p public/assets/tesseract/lang-data

# Download worker and core
curl -L https://unpkg.com/tesseract.js@5.0.4/dist/worker.min.js \
  -o public/assets/tesseract/worker.min.js

curl -L https://unpkg.com/tesseract.js-core@5.0.0/tesseract-core.wasm.js \
  -o public/assets/tesseract/tesseract-core.wasm.js

# Download English language data
curl -L https://github.com/naptha/tessdata/raw/main/4.0.0/eng.traineddata \
  -o public/assets/tesseract/lang-data/eng.traineddata

echo "✓ Tesseract assets downloaded"
```

Save as `scripts/download-assets.sh` and run:

```bash
chmod +x scripts/download-assets.sh
./scripts/download-assets.sh
```

### Adding More Languages

Download additional `.traineddata` files from [tessdata](https://github.com/naptha/tessdata/tree/main/4.0.0):

- `spa.traineddata` - Spanish
- `fra.traineddata` - French
- `deu.traineddata` - German
- `chi_sim.traineddata` - Chinese Simplified
- And 100+ more...

Place in `lang-data/` and update settings UI to allow selection.

## Size Considerations

- English traineddata: ~30 MB
- Worker + Core: ~2-3 MB
- **Total**: ~33 MB for base installation

This is acceptable for an extension since all assets are cached locally after first install.

## Privacy Note

All assets are bundled locally. The extension **never downloads** models or data at runtime, ensuring zero network calls.

