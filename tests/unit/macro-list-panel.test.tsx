import { describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { MacroListPanel } from '../../src/popup/Popup';
import type { Macro } from '../../src/core/types';

describe('MacroListPanel', () => {
  const noop = vi.fn();

  it('renders empty state when no macros', () => {
    const container = document.createElement('div');
    render(<MacroListPanel macros={[]} onPreview={noop} onRun={noop} onCreateNew={noop} />, container);
    expect(container.textContent).toContain('No macros yet');
    render(null, container);
  });

  it('renders macros when provided', () => {
    const container = document.createElement('div');
    const macros: Macro[] = [
      {
        id: 'macro-1',
        name: 'Invoice Autofill',
        description: 'Fill out invoice forms',
        createdAt: 1710000000000,
        useCount: 2,
        trainingScreenshot: 'data:image/png;base64,stub',
        extractionRegions: [],
        targetFields: [],
        fieldMappings: [],
      },
    ];

    render(<MacroListPanel macros={macros} onPreview={noop} onRun={noop} onCreateNew={noop} />, container);

    expect(container.textContent).toContain('Invoice Autofill');
    expect(container.textContent).toContain('Fill out invoice forms');
    render(null, container);
  });
});
