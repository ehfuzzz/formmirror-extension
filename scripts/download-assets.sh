#!/bin/bash
# Download Tesseract.js assets for local bundling
# Run this before building the extension

set -e

echo "📦 Downloading Tesseract.js assets..."

# Create directories
mkdir -p public/assets/tesseract/lang-data

# Download worker and core
echo "⬇️  Downloading worker.min.js..."
curl -L https://cdn.jsdelivr.net/npm/tesseract.js@5.0.4/dist/worker.min.js \
  -o public/assets/tesseract/worker.min.js

echo "⬇️  Downloading tesseract-core.wasm.js..."
curl -L https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0/tesseract-core.wasm.js \
  -o public/assets/tesseract/tesseract-core.wasm.js

echo "⬇️  Downloading tesseract-core.wasm (binary)..."
curl -L https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0/tesseract-core.wasm \
  -o public/assets/tesseract/tesseract-core.wasm

# Download English language data
echo "⬇️  Downloading English language data (eng.traineddata)..."
curl -L https://github.com/naptha/tessdata/raw/main/4.0.0/eng.traineddata \
  -o public/assets/tesseract/lang-data/eng.traineddata

echo "✅ All assets downloaded successfully!"
echo ""
echo "Assets location: public/assets/tesseract/"
echo "Total size: ~33 MB"
echo ""
echo "To add more languages, download from:"
echo "https://github.com/naptha/tessdata/tree/main/4.0.0"

