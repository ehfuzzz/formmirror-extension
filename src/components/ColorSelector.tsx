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
    <div class="color-selector">
      <div class="color-header">
        <h3>Color Preferences (Optional)</h3>
        <p>Specify colors to help identify the text you want to extract</p>
      </div>

      <div class="color-options">
        <div class="color-option">
          <label class="color-checkbox">
            <input
              type="checkbox"
              checked={useTextColor}
              onChange={(e) => setUseTextColor((e.target as HTMLInputElement).checked)}
            />
            <span>Text Color</span>
          </label>
          
          {useTextColor && (
            <div class="color-inputs">
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor((e.target as HTMLInputElement).value)}
                class="color-picker"
              />
              <input
                type="text"
                value={textColor}
                onChange={(e) => setTextColor((e.target as HTMLInputElement).value)}
                class="color-text"
                placeholder="#000000"
              />
              
              <div class="predefined-colors">
                {predefinedColors.map(color => (
                  <button
                    key={color}
                    class="color-swatch"
                    style={{ backgroundColor: color }}
                    onClick={() => setTextColor(color)}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div class="color-option">
          <label class="color-checkbox">
            <input
              type="checkbox"
              checked={useBackgroundColor}
              onChange={(e) => setUseBackgroundColor((e.target as HTMLInputElement).checked)}
            />
            <span>Background Color</span>
          </label>
          
          {useBackgroundColor && (
            <div class="color-inputs">
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor((e.target as HTMLInputElement).value)}
                class="color-picker"
              />
              <input
                type="text"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor((e.target as HTMLInputElement).value)}
                class="color-text"
                placeholder="#ffffff"
              />
              
              <div class="predefined-colors">
                {predefinedColors.map(color => (
                  <button
                    key={color}
                    class="color-swatch"
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

      <div class="color-preview">
        <h4>Preview</h4>
        <div 
          class="preview-text"
          style={{
            color: useTextColor ? textColor : '#000000',
            backgroundColor: useBackgroundColor ? backgroundColor : 'transparent',
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        >
          Sample text with selected colors
        </div>
      </div>

      <div class="color-actions">
        <button class="btn-secondary" onClick={onSkip}>
          Skip Colors
        </button>
        <button class="btn-primary" onClick={handleSubmit}>
          Use These Colors
        </button>
      </div>
    </div>
  );
}
