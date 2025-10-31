/**
 * Color Selector Component
 * Advanced color picker for text and background colors
 */

import { useState } from 'preact/hooks';

interface ColorSelectorProps {
  onColorSelect: (textColor: string, backgroundColor: string) => void;
  onSkip: () => void;
}

export function ColorSelector({ onColorSelect, onSkip }: ColorSelectorProps) {
  const [textColor, setTextColor] = useState('#000000');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [useTextColor, setUseTextColor] = useState(false);
  const [useBackgroundColor, setUseBackgroundColor] = useState(false);

  const predefinedColors = [
    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
    '#ffff00', '#ff00ff', '#00ffff', '#808080', '#ffa500',
    '#800080', '#008000', '#000080', '#800000', '#ffc0cb'
  ];

  const handleSubmit = () => {
    onColorSelect(
      useTextColor ? textColor : '',
      useBackgroundColor ? backgroundColor : ''
    );
  };

  return (
    <div class="fm-popup__color">
      <div class="fm-popup__panel-section">
        <h3 class="fm-h3">Color preferences (optional)</h3>
        <p class="fm-text-muted">Specify colors to help identify the text you want to extract.</p>
      </div>

      <div class="fm-popup__color-options">
        <div class="fm-popup__color-option">
          <label class="fm-popup__color-toggle">
            <input
              type="checkbox"
              checked={useTextColor}
              onChange={(e) => setUseTextColor((e.target as HTMLInputElement).checked)}
            />
            <span>Text color</span>
          </label>

          {useTextColor && (
            <div class="fm-popup__color-inputs">
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor((e.target as HTMLInputElement).value)}
                class="fm-popup__color-picker"
                aria-label="Text color"
              />
              <input
                type="text"
                value={textColor}
                onChange={(e) => setTextColor((e.target as HTMLInputElement).value)}
                class="fm-input fm-popup__color-value"
                placeholder="#000000"
              />

              <div class="fm-popup__color-swatches">
                {predefinedColors.map(color => (
                  <button
                    key={color}
                    type="button"
                    class="fm-popup__color-swatch"
                    style={{ backgroundColor: color }}
                    onClick={() => setTextColor(color)}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div class="fm-popup__color-option">
          <label class="fm-popup__color-toggle">
            <input
              type="checkbox"
              checked={useBackgroundColor}
              onChange={(e) => setUseBackgroundColor((e.target as HTMLInputElement).checked)}
            />
            <span>Background color</span>
          </label>

          {useBackgroundColor && (
            <div class="fm-popup__color-inputs">
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor((e.target as HTMLInputElement).value)}
                class="fm-popup__color-picker"
                aria-label="Background color"
              />
              <input
                type="text"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor((e.target as HTMLInputElement).value)}
                class="fm-input fm-popup__color-value"
                placeholder="#ffffff"
              />

              <div class="fm-popup__color-swatches">
                {predefinedColors.map(color => (
                  <button
                    key={color}
                    type="button"
                    class="fm-popup__color-swatch"
                    style={{ backgroundColor: color }}
                    onClick={() => setBackgroundColor(color)}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div class="fm-popup__color-preview">
        <h4 class="fm-h3">Preview</h4>
        <div
          class="fm-popup__color-sample"
          style={{
            color: useTextColor ? textColor : '#000000',
            backgroundColor: useBackgroundColor ? backgroundColor : 'transparent'
          }}
        >
          Sample text with selected colors
        </div>
      </div>

      <div class="fm-popup__color-actions">
        <button class="fm-btn fm-btn--secondary" type="button" onClick={onSkip}>
          Skip colors
        </button>
        <button class="fm-btn fm-btn--primary" type="button" onClick={handleSubmit}>
          Use these colors
        </button>
      </div>
    </div>
  );
}
