import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createEmptyAdvancedMapDatasetDraft,
  type AdvancedMapDatasetReferenceRow,
} from '@/features/advanced-map-datasets/types';
import {
  consumeDatasetCloneHandoff,
  createDatasetCloneHandoff,
} from './dataset-clone-handoff';

const referenceRows: AdvancedMapDatasetReferenceRow[] = [
  {
    uatId: 'uat-1',
    cui: '123',
    sirutaCode: '1001',
    name: 'Alpha',
    countyName: 'CJ',
    countyCode: 'CJ',
    isCounty: false,
  },
];

describe('dataset-clone-handoff', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-04-09T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it('creates and consumes a one-time handoff', () => {
    const draft = createEmptyAdvancedMapDatasetDraft('resource-1', referenceRows);
    draft.draftId = 'draft-1';
    draft.title = 'Series';
    draft.metadata.title = 'Series';
    draft.unit = 'RON';
    draft.metadata.unit = 'RON';

    const handoff = createDatasetCloneHandoff(draft);
    expect(handoff.token).toHaveLength(12);
    expect(handoff.persistedToLocalStorage).toBe(true);

    const consumed = consumeDatasetCloneHandoff(handoff.token);
    expect(consumed?.draftId).toBe('draft-1');
    expect(consumeDatasetCloneHandoff(handoff.token)).toBeNull();
  });

  it('drops expired handoffs', () => {
    const draft = createEmptyAdvancedMapDatasetDraft('resource-1', referenceRows);
    draft.title = 'Series';
    draft.metadata.title = 'Series';
    draft.unit = 'RON';
    draft.metadata.unit = 'RON';

    const handoff = createDatasetCloneHandoff(draft, { ttlMs: 1 });
    expect(handoff.token).toHaveLength(12);

    vi.setSystemTime(new Date('2026-04-09T10:00:01.000Z'));
    expect(consumeDatasetCloneHandoff(handoff.token)).toBeNull();
  });

  it('prefers the fresh in-memory record when localStorage writes fail over stale persisted data', () => {
    const staleDraft = createEmptyAdvancedMapDatasetDraft('resource-1', referenceRows);
    staleDraft.title = 'Stale';
    staleDraft.metadata.title = 'Stale';
    staleDraft.unit = 'RON';
    staleDraft.metadata.unit = 'RON';

    createDatasetCloneHandoff(staleDraft);

    const persistedLocalStorage = window.localStorage;
    vi.stubGlobal('localStorage', {
      getItem: persistedLocalStorage.getItem.bind(persistedLocalStorage),
      setItem: () => {
        throw new DOMException('QuotaExceededError');
      },
      removeItem: persistedLocalStorage.removeItem.bind(persistedLocalStorage),
      clear: persistedLocalStorage.clear.bind(persistedLocalStorage),
      key: persistedLocalStorage.key.bind(persistedLocalStorage),
      get length() {
        return persistedLocalStorage.length;
      },
    });

    const freshDraft = createEmptyAdvancedMapDatasetDraft('resource-2', referenceRows);
    freshDraft.title = 'Fresh';
    freshDraft.metadata.title = 'Fresh';
    freshDraft.unit = 'EUR';
    freshDraft.metadata.unit = 'EUR';

    const handoff = createDatasetCloneHandoff(freshDraft);

    expect(handoff.persistedToLocalStorage).toBe(false);
    expect(consumeDatasetCloneHandoff(handoff.token)?.title).toBe('Fresh');
  });
});
