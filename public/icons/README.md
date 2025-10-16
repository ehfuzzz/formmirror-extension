# Extension Icons

Place your extension icons here:

- `icon16.png` - 16x16px (toolbar, small)
- `icon48.png` - 48x48px (extension management)
- `icon128.png` - 128x128px (Chrome Web Store, installation)

## Design Guidelines

- Use a simple, recognizable symbol (e.g., 📋 clipboard, 📝 form)
- Maintain good contrast for visibility on light/dark backgrounds
- Follow Chrome's extension icon guidelines
- Export as PNG with transparency

## Tools

- [Figma](https://figma.com) - Free design tool
- [GIMP](https://gimp.org) - Free image editor
- [ImageMagick](https://imagemagick.org) - Command-line batch conversion

## Generate from SVG

If you have an SVG icon:

```bash
# Using ImageMagick
convert icon.svg -resize 16x16 icon16.png
convert icon.svg -resize 48x48 icon48.png
convert icon.svg -resize 128x128 icon128.png
```

## Temporary Placeholder

For development, you can use emoji-based icons or simple solid colors until final designs are ready.

