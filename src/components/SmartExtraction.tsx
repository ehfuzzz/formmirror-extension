/**
 * Smart Extraction Options
 * Advanced extraction methods for robust data detection
 */

import { useState } from 'preact/hooks';
import type { ExtractionRegion } from '../core/types';

interface SmartExtractionProps {
  regions: Array<{ rect: any; name: string; id: string }>;
  onConfigure: (regions: ExtractionRegion[]) => void;
  onBack: () => void;
}

export function SmartExtraction({ regions, onConfigure, onBack }: SmartExtractionProps) {
  const [configuredRegions, setConfiguredRegions] = useState<ExtractionRegion[]>([]);

  const handleRegionConfigure = (regionId: string, config: Partial<ExtractionRegion>) => {
    setConfiguredRegions(prev => {
      const existing = prev.find(r => r.id === regionId);
      if (existing) {
        return prev.map(r => r.id === regionId ? { ...r, ...config } : r);
      } else {
        const baseRegion = regions.find(r => r.id === regionId);
        if (!baseRegion) return prev;
        
        return [...prev, {
          id: regionId,
          name: baseRegion.name,
          bbox: baseRegion.rect,
          ...config
        }];
      }
    });
  };

  const getRegionConfig = (regionId: string): ExtractionRegion => {
    return configuredRegions.find(r => r.id === regionId) || {
      id: regionId,
      name: regions.find(r => r.id === regionId)?.name || '',
      bbox: regions.find(r => r.id === regionId)?.rect || { x: 0, y: 0, width: 0, height: 0 },
      textPattern: undefined,
      color: undefined,
      position: undefined,
      tolerance: undefined
    };
  };

  return (
    <div class="fm-popup__smart">
      <div class="fm-popup__panel-section">
        <h3 class="fm-h3">Smart extraction options</h3>
        <p class="fm-text-muted">Configure advanced extraction methods for each region.</p>
      </div>

      <div class="fm-popup__smart-list">
        {regions.map(region => {
          const config = getRegionConfig(region.id);

          return (
            <div key={region.id} class="fm-card fm-popup__smart-region">
              <div class="fm-popup__smart-region-header">
                <h4 class="fm-h3">{region.name}</h4>
                <p class="fm-text-muted">Fine-tune detection for this area.</p>
              </div>

              <div class="fm-popup__smart-controls">
                <div class="fm-popup__smart-group">
                  <label class="fm-popup__color-toggle">
                    <input
                      type="checkbox"
                      checked={!!config.textPattern}
                      onChange={(e) => {
                        const pattern = (e.target as HTMLInputElement).checked ? '.*' : undefined;
                        handleRegionConfigure(region.id, { textPattern: pattern });
                      }}
                    />
                    Pattern matching
                  </label>
                  {config.textPattern && (
                    <input
                      type="text"
                      value={config.textPattern}
                      onChange={(e) => {
                        handleRegionConfigure(region.id, {
                          textPattern: (e.target as HTMLInputElement).value
                        });
                      }}
                      placeholder="Regex pattern (e.g., \\$\\d+\\.\\d{2})"
                      class="fm-input"
                    />
                  )}
                </div>

                <div class="fm-popup__smart-group">
                  <label class="fm-popup__color-toggle">
                    <input
                      type="checkbox"
                      checked={!!config.color}
                      onChange={(e) => {
                        const color = (e.target as HTMLInputElement).checked ? '#00ff00' : undefined;
                        handleRegionConfigure(region.id, { color });
                      }}
                    />
                    Color filtering
                  </label>
                  {config.color && (
                    <div class="fm-popup__smart-color">
                      <input
                        type="color"
                        value={config.color}
                        onChange={(e) => {
                          handleRegionConfigure(region.id, {
                            color: (e.target as HTMLInputElement).value
                          });
                        }}
                        class="fm-popup__color-picker"
                        aria-label="Target color"
                      />
                      <span class="fm-text-muted">Target color</span>
                    </div>
                  )}
                </div>

                <div class="fm-popup__smart-group">
                  <label class="fm-label" for={`fm-position-${region.id}`}>Position preference</label>
                  <select
                    id={`fm-position-${region.id}`}
                    class="fm-select"
                    value={config.position || 'any'}
                    onChange={(e) => {
                      const position = (e.target as HTMLSelectElement).value;
                      handleRegionConfigure(region.id, {
                        position: position === 'any' ? undefined : position as any
                      });
                    }}
                  >
                    <option value="any">Any position</option>
                    <option value="top-left">Top-left area</option>
                    <option value="top-right">Top-right area</option>
                    <option value="bottom-left">Bottom-left area</option>
                    <option value="bottom-right">Bottom-right area</option>
                    <option value="center">Center area</option>
                  </select>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div class="fm-popup__smart-tips">
        <h4 class="fm-h3">💡 Smart extraction tips</h4>
        <ul>
          <li><strong>Pattern matching:</strong> Use regex to find specific formats (prices, dates, etc.).</li>
          <li><strong>Color filtering:</strong> Target text with specific colors (green for profits, red for losses).</li>
          <li><strong>Position hints:</strong> Help locate data when it moves around.</li>
          <li><strong>Combine methods:</strong> Pair filters for the most reliable results.</li>
        </ul>
      </div>

      <div class="fm-popup__smart-actions">
        <button class="fm-btn fm-btn--secondary" type="button" onClick={onBack}>
          Back to colors
        </button>
        <button
          class="fm-btn fm-btn--primary"
          type="button"
          onClick={() => onConfigure(configuredRegions)}
        >
          Configure fields ({configuredRegions.length}/{regions.length})
        </button>
      </div>
    </div>
  );
}
