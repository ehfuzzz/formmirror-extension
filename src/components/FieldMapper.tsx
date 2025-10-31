import { useEffect, useMemo, useState } from 'preact/hooks';
import type {
  CandidateFieldsPayload,
  ElementPickedPayload,
  ExtractionRegion,
  MacroFieldMapping,
  SerializableFieldDescriptor,
} from '../core/types';
import type { FieldKind, OcrPair, FieldDescriptor } from '../core/types';
import { rankFieldsForPair } from '../core/match';

interface FieldMapperProps {
  regions: ExtractionRegion[];
  onBack: () => void;
  onSave: (mappings: MacroFieldMapping[]) => void;
}

interface CandidateEntry {
  field: SerializableFieldDescriptor;
  score: number;
}

interface RegionMappingState {
  candidates: CandidateEntry[];
  selectedFieldId?: string;
  selectedSelector?: string;
  selectedHints?: MacroFieldMapping['fieldHints'];
  status: 'unmapped' | 'suggested' | 'mapped';
}

function buildSyntheticPair(region: ExtractionRegion): OcrPair {
  return {
    id: region.id,
    labelText: region.name.toLowerCase(),
    rawLabel: region.name,
    value: region.name,
    bboxLabel: region.bbox,
    bboxValue: region.bbox,
    kind: 'text',
    conf: 0.5,
  };
}

function normalizeFieldKind(inputType: string | undefined): FieldKind {
  switch ((inputType || '').toLowerCase()) {
    case 'email':
      return 'email';
    case 'tel':
    case 'phone':
      return 'tel';
    case 'date':
      return 'date';
    case 'number':
      return 'number';
    case 'url':
      return 'url';
    case 'zip':
      return 'zip';
    case 'select':
      return 'select';
    case 'textarea':
      return 'textarea';
    default:
      return 'text';
  }
}

function mapToFieldDescriptor(field: SerializableFieldDescriptor): FieldDescriptor {
  return {
    ...field,
    element: undefined,
    inputType: field.inputType ?? normalizeFieldKind(field.type),
  } as FieldDescriptor;
}

function toHints(field: SerializableFieldDescriptor): MacroFieldMapping['fieldHints'] {
  return {
    label: field.labelText || field.rawLabels?.[0],
    inputType: field.type,
    attrName: field.name,
  };
}

export function FieldMapper({ regions, onBack, onSave }: FieldMapperProps) {
  const [fields, setFields] = useState<SerializableFieldDescriptor[]>([]);
  const [regionStates, setRegionStates] = useState<Record<string, RegionMappingState>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePickerRegion, setActivePickerRegion] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchFields() {
      setLoading(true);
      setError(null);
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) {
          throw new Error('No active tab detected.');
        }

        const response = await chrome.tabs.sendMessage(tab.id, { type: 'LIST_CANDIDATE_FIELDS' });
        const payload = response?.payload as CandidateFieldsPayload | undefined;
        if (!payload) {
          throw new Error('Content script returned no fields.');
        }

        if (!mounted) return;
        setFields(payload.fields);
      } catch (err: any) {
        if (!mounted) return;
        console.error('[FieldMapper] Failed to fetch fields:', err);
        setError(err?.message || 'Failed to list fields. Refresh the page and try again.');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchFields();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (fields.length === 0) {
      setRegionStates({});
      return;
    }

    setRegionStates((prev) => {
      const next: Record<string, RegionMappingState> = {};
      const descriptorFields = fields.map(mapToFieldDescriptor);

      for (const region of regions) {
        const existing = prev[region.id];
        const pair = buildSyntheticPair(region);
        const ranked = rankFieldsForPair(pair, descriptorFields);
        const candidates: CandidateEntry[] = ranked.slice(0, 3).map(({ field, score }) => ({
          field: field as SerializableFieldDescriptor,
          score,
        }));

        let selectedFieldId = existing?.selectedFieldId;
        let selectedSelector = existing?.selectedSelector;
        let selectedHints = existing?.selectedHints;
        let status: RegionMappingState['status'] = 'unmapped';

        if (selectedFieldId && !candidates.some((c) => c.field.id === selectedFieldId)) {
          selectedFieldId = undefined;
          selectedSelector = undefined;
          selectedHints = undefined;
        }

        if (!selectedFieldId && candidates.length > 0) {
          selectedFieldId = candidates[0].field.id;
          selectedSelector = candidates[0].field.selector;
          selectedHints = toHints(candidates[0].field);
          status = 'suggested';
        }

        if (selectedSelector) {
          status = existing?.status === 'mapped' ? 'mapped' : status === 'suggested' ? 'suggested' : 'mapped';
        }

        next[region.id] = {
          candidates,
          selectedFieldId,
          selectedSelector,
          selectedHints,
          status,
        };
      }

      return next;
    });
  }, [fields, regions]);

  useEffect(() => {
    function handleMessage(message: any) {
      if (message?.type === 'ELEMENT_PICKED') {
        const payload = message.payload as ElementPickedPayload;
        if (!payload?.regionId) return;
        setActivePickerRegion(null);
        setRegionStates((prev) => {
          const next = { ...prev };
          const regionState = next[payload.regionId] || { candidates: [], status: 'unmapped' };
          const candidate: CandidateEntry = {
            field: {
              id: `picker-${payload.selector}`,
              labelText: payload.labelText || 'Selected field',
              rawLabels: payload.labelText ? [payload.labelText] : [],
              type: payload.inputType || 'text',
              inputType: normalizeFieldKind(payload.inputType),
              attrs: {},
              bbox: { x: 0, y: 0, width: 0, height: 0 },
              autocomplete: undefined,
              placeholder: undefined,
              name: payload.attrName,
              required: false,
              selector: payload.selector,
            },
            score: 1,
          };

          regionState.candidates = [candidate, ...regionState.candidates.filter((c) => c.field.id !== candidate.field.id)];
          regionState.selectedFieldId = candidate.field.id;
          regionState.selectedSelector = payload.selector;
          regionState.selectedHints = {
            label: payload.labelText,
            inputType: payload.inputType,
            attrName: payload.attrName,
          };
          regionState.status = 'mapped';
          next[payload.regionId] = { ...regionState };
          return next;
        });
      } else if (message?.type === 'STOP_ELEMENT_PICKER') {
        const regionId = message.payload?.regionId as string | undefined;
        if (regionId && activePickerRegion === regionId) {
          setActivePickerRegion(null);
        }
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [activePickerRegion]);

  const mappedCount = useMemo(() => {
    return Object.values(regionStates).filter((state) => Boolean(state?.selectedSelector)).length;
  }, [regionStates]);

  const handleSelectCandidate = (regionId: string, candidate: CandidateEntry) => {
    if (!candidate.field.selector) {
      setError('Selected field has no selector. Try choosing another candidate.');
      return;
    }

    setRegionStates((prev) => ({
      ...prev,
      [regionId]: {
        ...(prev[regionId] || { candidates: [] }),
        candidates: prev[regionId]?.candidates || [],
        selectedFieldId: candidate.field.id,
        selectedSelector: candidate.field.selector,
        selectedHints: toHints(candidate.field),
        status: 'mapped',
      },
    }));
  };

  const handleSkipRegion = (regionId: string) => {
    setRegionStates((prev) => ({
      ...prev,
      [regionId]: {
        ...(prev[regionId] || { candidates: [] }),
        selectedFieldId: undefined,
        selectedSelector: undefined,
        selectedHints: undefined,
        status: 'unmapped',
        candidates: prev[regionId]?.candidates || [],
      },
    }));
  };

  const handlePreview = async (selector?: string) => {
    if (!selector) return;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('No active tab.');
      await chrome.tabs.sendMessage(tab.id, { type: 'SCROLL_TO_FIELD', payload: { selector, block: 'center' } });
      await chrome.tabs.sendMessage(tab.id, { type: 'HIGHLIGHT_FIELD', payload: { selector } });
    } catch (err: any) {
      console.error('[FieldMapper] Failed to preview field:', err);
      setError('Unable to highlight the selected field. Make sure the page is still open.');
    }
  };

  const handleStartPicker = async (regionId: string) => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('No active tab.');
      await chrome.tabs.sendMessage(tab.id, { type: 'START_ELEMENT_PICKER', payload: { regionId } });
      setActivePickerRegion(regionId);
      setError(null);
    } catch (err: any) {
      console.error('[FieldMapper] Failed to start picker:', err);
      setError('Unable to start picker. Refresh the page and try again.');
    }
  };

  const handleSave = () => {
    const mappings: MacroFieldMapping[] = [];

    for (const region of regions) {
      const state = regionStates[region.id];
      if (!state?.selectedSelector) continue;

      mappings.push({
        regionId: region.id,
        selector: state.selectedSelector,
        fieldHints: state.selectedHints,
      });
    }

    onSave(mappings);
  };

  return (
    <div class="fm-popup__field-mapper">
      <div class="fm-popup__panel-header">
        <button type="button" class="fm-btn fm-btn--link fm-popup__back" onClick={onBack}>
          ← Back
        </button>
        <div>
          <h3 class="fm-h3">Map to form fields</h3>
          <p class="fm-text-muted">
            Review suggested inputs for each extracted region. You can accept a suggestion, pick another field, or select
            directly on the page.
          </p>
        </div>
      </div>

      {loading && <div class="fm-popup__hint">Scanning current page for fillable inputs…</div>}
      {error && <div class="fm-popup__error">{error}</div>}

      {!loading && fields.length === 0 && (
        <div class="fm-card fm-popup__empty">No inputs detected on this page. Refresh and try again.</div>
      )}

      <div class="fm-popup__field-mapper-list">
        {regions.map((region) => {
          const state = regionStates[region.id];
          const badgeLabel = state?.status === 'mapped' ? 'Mapped' : state?.status === 'suggested' ? 'Suggested' : 'Unmapped';
          const badgeClass = state?.status === 'mapped'
            ? 'fm-badge fm-badge--success'
            : state?.status === 'suggested'
              ? 'fm-badge fm-badge--info'
              : 'fm-badge fm-badge--muted';

          return (
            <div key={region.id} class="fm-card fm-popup__field-mapper-item">
              <div class="fm-popup__field-mapper-item-header">
                <div>
                  <h4 class="fm-h4">{region.name}</h4>
                  <p class="fm-text-muted">Region ID: {region.id}</p>
                </div>
                <span class={badgeClass}>{badgeLabel}</span>
              </div>

              <div class="fm-popup__field-mapper-candidates">
                {state?.candidates?.length ? (
                  state.candidates.map((candidate) => {
                    const isSelected = state.selectedFieldId === candidate.field.id;
                    const selectorAvailable = Boolean(candidate.field.selector);
                    return (
                      <div key={candidate.field.id} class={`fm-popup__field-candidate${isSelected ? ' is-selected' : ''}`}>
                        <div class="fm-popup__field-candidate-main">
                          <div>
                            <div class="fm-popup__field-candidate-label">{candidate.field.labelText || candidate.field.name || 'Unnamed field'}</div>
                            <div class="fm-popup__field-candidate-meta">
                              <span>{candidate.field.type}</span>
                              {candidate.field.placeholder && <span>Placeholder: {candidate.field.placeholder}</span>}
                              {candidate.field.selector && <span class="fm-text-muted">{candidate.field.selector}</span>}
                            </div>
                          </div>
                          <div class="fm-popup__field-candidate-score">{Math.round(candidate.score * 100)}%</div>
                        </div>
                        <div class="fm-popup__field-candidate-actions">
                          <button
                            type="button"
                            class="fm-btn fm-btn--secondary"
                            onClick={() => handlePreview(candidate.field.selector)}
                            disabled={!selectorAvailable}
                          >
                            Preview
                          </button>
                          <button
                            type="button"
                            class="fm-btn fm-btn--primary"
                            onClick={() => handleSelectCandidate(region.id, candidate)}
                            disabled={!selectorAvailable}
                          >
                            {isSelected ? 'Selected' : 'Select'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div class="fm-popup__hint">No suggestions found. Try selecting on the page.</div>
                )}
              </div>

              <div class="fm-popup__field-mapper-footer">
                <button
                  type="button"
                  class="fm-btn fm-btn--secondary"
                  onClick={() => handleStartPicker(region.id)}
                  disabled={activePickerRegion === region.id}
                >
                  {activePickerRegion === region.id ? 'Selecting…' : 'Select on page'}
                </button>
                <button
                  type="button"
                  class="fm-btn fm-btn--link"
                  onClick={() => handleSkipRegion(region.id)}
                >
                  Skip
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div class="fm-popup__field-mapper-actions">
        <button type="button" class="fm-btn fm-btn--primary" onClick={handleSave} disabled={mappedCount === 0}>
          Save mapping ({mappedCount})
        </button>
      </div>
    </div>
  );
}
