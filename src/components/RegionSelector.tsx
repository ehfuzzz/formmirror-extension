/**
 * Region Selector Component
 * Interactive rectangle selector for macro creation
 */

import { useState, useRef, useEffect } from 'preact/hooks';
import type { Rect } from '../core/types';

interface RegionSelectorProps {
  imageSrc: string;
  onRegionSelect: (region: Rect, name: string) => void;
  onComplete: () => void;
}

interface SelectionState {
  isSelecting: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export function RegionSelector({ imageSrc, onRegionSelect, onComplete }: RegionSelectorProps) {
  const [selections, setSelections] = useState<Array<{ rect: Rect; name: string; id: string }>>([]);
  const [currentSelection, setCurrentSelection] = useState<SelectionState>({
    isSelecting: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0
  });
  const [regionName, setRegionName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match image
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    // Draw image
    ctx.drawImage(image, 0, 0);

    // Draw existing selections
    selections.forEach((selection, index) => {
      const { rect } = selection;
      ctx.strokeStyle = `hsl(${index * 60}, 70%, 50%)`;
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
      
      // Draw label
      ctx.fillStyle = `hsl(${index * 60}, 70%, 50%)`;
      ctx.font = '14px Arial';
      ctx.fillText(selection.name, rect.x, rect.y - 5);
    });

    // Draw current selection
    if (currentSelection.isSelecting) {
      const { startX, startY, currentX, currentY } = currentSelection;
      const x = Math.min(startX, currentX);
      const y = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);

      ctx.strokeStyle = '#007bff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x, y, width, height);
      ctx.setLineDash([]);
    }
  }, [selections, currentSelection, imageSrc]);

  const handleMouseDown = (e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setCurrentSelection({
      isSelecting: true,
      startX: x,
      startY: y,
      currentX: x,
      currentY: y
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!currentSelection.isSelecting) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setCurrentSelection(prev => ({
      ...prev,
      currentX: x,
      currentY: y
    }));
  };

  const handleMouseUp = () => {
    if (!currentSelection.isSelecting) return;

    const { startX, startY, currentX, currentY } = currentSelection;
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    if (width > 10 && height > 10) {
      setShowNameInput(true);
    }

    setCurrentSelection({
      isSelecting: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0
    });
  };

  const handleRegionNameSubmit = () => {
    if (!regionName.trim()) return;

    const { startX, startY, currentX, currentY } = currentSelection;
    const rect: Rect = {
      x: Math.min(startX, currentX),
      y: Math.min(startY, currentY),
      width: Math.abs(currentX - startX),
      height: Math.abs(currentY - startY)
    };

    const newSelection = {
      rect,
      name: regionName.trim(),
      id: `region_${Date.now()}`
    };

    setSelections(prev => [...prev, newSelection]);
    onRegionSelect(rect, regionName.trim());
    setRegionName('');
    setShowNameInput(false);
  };

  const removeSelection = (id: string) => {
    setSelections(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div class="region-selector">
      <div class="selector-header">
        <h3>Select Data Regions</h3>
        <p>Click and drag to select areas containing the data you want to extract</p>
      </div>

      <div class="image-container">
        <img
          ref={imageRef}
          src={imageSrc}
          style={{ display: 'none' }}
          onLoad={() => {
            // Trigger redraw when image loads
            setCurrentSelection(prev => ({ ...prev }));
          }}
        />
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{ 
            border: '1px solid #ccc',
            cursor: 'crosshair',
            maxWidth: '100%',
            height: 'auto'
          }}
        />
      </div>

      {showNameInput && (
        <div class="name-input-overlay">
          <div class="name-input-modal">
            <h4>Name this region</h4>
            <input
              type="text"
              value={regionName}
              onInput={(e) => setRegionName((e.target as HTMLInputElement).value)}
              placeholder="e.g., Price, Volume, Date"
              autoFocus
            />
            <div class="name-input-buttons">
              <button onClick={() => setShowNameInput(false)}>Cancel</button>
              <button onClick={handleRegionNameSubmit} disabled={!regionName.trim()}>
                Add Region
              </button>
            </div>
          </div>
        </div>
      )}

      {selections.length > 0 && (
        <div class="selections-list">
          <h4>Selected Regions ({selections.length})</h4>
          {selections.map((selection) => (
            <div key={selection.id} class="selection-item">
              <span class="selection-name">{selection.name}</span>
              <span class="selection-coords">
                {Math.round(selection.rect.x)}, {Math.round(selection.rect.y)} - 
                {Math.round(selection.rect.width)}×{Math.round(selection.rect.height)}
              </span>
              <button 
                class="remove-btn"
                onClick={() => removeSelection(selection.id)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div class="selector-actions">
        <button 
          class="btn-secondary"
          onClick={() => setSelections([])}
          disabled={selections.length === 0}
        >
          Clear All
        </button>
        <button 
          class="btn-primary"
          onClick={onComplete}
          disabled={selections.length === 0}
        >
          Continue ({selections.length} regions)
        </button>
      </div>
    </div>
  );
}
