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
    <div class="smart-extraction">
      <div class="extraction-header">
        <h3>Smart Extraction Options</h3>
        <p>Configure advanced extraction methods for each region</p>
      </div>

      {regions.map(region => {
        const config = getRegionConfig(region.id);
        
        return (
          <div key={region.id} class="region-config">
            <h4>{region.name}</h4>
            
            <div class="config-options">
              {/* Position-based extraction */}
              <div class="config-group">
                <label>
                  <input
                    type="checkbox"
                    checked={!!config.textPattern}
                    onChange={(e) => {
                      const pattern = (e.target as HTMLInputElement).checked ? '.*' : undefined;
                      handleRegionConfigure(region.id, { textPattern: pattern });
                    }}
                  />
                  Use Pattern Matching
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
                    class="pattern-input"
                  />
                )}
              </div>

              {/* Color-based extraction */}
              <div class="config-group">
                <label>
                  <input
                    type="checkbox"
                    checked={!!config.color}
                    onChange={(e) => {
                      const color = (e.target as HTMLInputElement).checked ? '#00ff00' : undefined;
                      handleRegionConfigure(region.id, { color });
                    }}
                  />
                  Use Color Filtering
                </label>
                {config.color && (
                  <div class="color-config">
                    <input
                      type="color"
                      value={config.color}
                      onChange={(e) => {
                        handleRegionConfigure(region.id, { 
                          color: (e.target as HTMLInputElement).value 
                        });
                      }}
                      class="color-picker"
                    />
                    <span class="color-label">Target color</span>
                  </div>
                )}
              </div>

              {/* Position hints */}
              <div class="config-group">
                <label>Position Preference</label>
                <select
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

      <div class="extraction-suggestions">
        <h4>💡 Smart Extraction Tips</h4>
        <ul>
          <li><strong>Pattern Matching:</strong> Use regex to find specific formats (prices, dates, etc.)</li>
          <li><strong>Color Filtering:</strong> Target text with specific colors (green for profits, red for losses)</li>
          <li><strong>Position Hints:</strong> Help locate data when it moves around</li>
          <li><strong>Combination:</strong> Use multiple methods together for best results</li>
        </ul>
      </div>

      <div class="extraction-actions">
        <button class="btn-secondary" onClick={onBack}>
          Back to Colors
        </button>
        <button 
          class="btn-primary"
          onClick={() => onConfigure(configuredRegions)}
        >
          Configure Fields ({configuredRegions.length}/{regions.length})
        </button>
      </div>
    </div>
  );
}
