# FormMirror - Quick Start Guide

Get FormMirror running in 5 minutes! ⚡

---

## Prerequisites

- Node.js 18+ ([download](https://nodejs.org/))
- Chrome browser

---

## Installation

```bash
cd "browser extension"

# 1. Install dependencies
npm install

# 2. Download OCR assets (~33 MB, one-time)
./scripts/download-assets.sh

# 3. Build the extension
npm run build
```

---

## Load in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Toggle **"Developer mode"** (top-right)
3. Click **"Load unpacked"**
4. Navigate to the `browser extension/dist/` folder
5. Click **"Select"**

✅ FormMirror is now installed!

---

## Quick Test

### 1. Create a Test Screenshot

Open [this sample form](https://docs.google.com/forms) or create a simple HTML form:

```html
<form>
  <label>First Name: <input type="text"></label><br>
  <label>Email: <input type="email"></label><br>
  <label>Phone: <input type="tel"></label><br>
</form>
```

Fill it out, then take a screenshot (Cmd/Ctrl + Shift + S on most OSes).

### 2. Use FormMirror

1. Open the same form (or a similar one) in a new tab
2. Click the **FormMirror icon** in your toolbar
3. **Drag & drop** your screenshot or **paste** (Cmd/Ctrl + V)
4. Wait for OCR to process (~5 seconds)
5. **Review** the detected fields
6. Click **"Fill Page"**

🎉 Watch the form fill automatically!

---

## Troubleshooting

### "Module not found" or build errors

```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Extension won't load

- Make sure you're selecting the `dist/` folder, not the root
- Check Chrome console (F12) for errors
- Try rebuilding: `npm run build`

### OCR not working

- Verify assets are in `dist/assets/tesseract/`
- Re-run: `./scripts/download-assets.sh`
- Rebuild: `npm run build`

### No icons showing

Icons are placeholders. Create `icon16.png`, `icon48.png`, `icon128.png` in `public/icons/` and rebuild.

---

## Development Mode

```bash
npm run dev
```

- File changes auto-rebuild
- Reload extension in chrome://extensions/ to see updates
- Check console for errors

---

## Testing

```bash
npm test              # Run unit tests
npm run type-check    # TypeScript validation
npm run lint          # ESLint
```

---

## Next Steps

- Read [README.md](./README.md) for full documentation
- Check [CONTRIBUTING.md](./CONTRIBUTING.md) to add synonyms or features
- Review [privacy/POLICY.md](./privacy/POLICY.md) for privacy details

---

## Common Issues

| Issue | Solution |
|-------|----------|
| "fetch failed" | Assets not downloaded. Run `./scripts/download-assets.sh` |
| "Cannot read property..." | Rebuild with `npm run build` |
| Form didn't fill | Check console for errors; try "Review" first |
| Wrong values | Edit in popup before clicking "Fill" |

---

## Need Help?

- **Docs**: See [README.md](./README.md)
- **Issues**: GitHub Issues (after repo setup)
- **Questions**: GitHub Discussions

---

**Happy form filling! 🎉**

*Remember: All processing happens locally. Your data never leaves your device.* 🔒

