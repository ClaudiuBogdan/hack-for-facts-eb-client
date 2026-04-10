import { renderHook, act } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEmptyAdvancedMapDatasetDraft, type AdvancedMapDatasetReferenceRow } from '@/features/advanced-map-datasets/types';
import { useAdvancedMapDatasetDraftHistory } from './use-advanced-map-dataset-draft-history';

const referenceRows: AdvancedMapDatasetReferenceRow[] = [
  {
    uatId: 'uat-1',
    cui: '4270740',
    sirutaCode: '143450',
    name: 'Sibiu',
    levelName: 'Municipiu resedinta de judet',
    countyName: 'Sibiu',
    countyCode: 'SB',
    isCounty: false,
  },
];

function useHistoryHarness(historyLimit = 2) {
  const [draft, setDraft] = useState(() => createEmptyAdvancedMapDatasetDraft('resource-1', referenceRows));
  const history = useAdvancedMapDatasetDraftHistory({
    resourceKey: 'resource-1',
    draft,
    replaceDraft: setDraft,
    historyLimit,
  });

  return {
    draft,
    ...history,
  };
}

describe('useAdvancedMapDatasetDraftHistory', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('tracks undo and redo in memory', () => {
    const { result } = renderHook(() => useHistoryHarness());

    act(() => {
      result.current.commitDraftChange((currentDraft) => ({
        ...currentDraft,
        title: 'First change',
      }));
    });

    expect(result.current.draft.title).toBe('First change');
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    act(() => {
      result.current.undo();
    });

    expect(result.current.draft.title).toBe('');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.redo();
    });

    expect(result.current.draft.title).toBe('First change');
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('caps the undo stack to the configured history limit', () => {
    const { result } = renderHook(() => useHistoryHarness(2));

    act(() => {
      result.current.commitDraftChange((currentDraft) => ({
        ...currentDraft,
        title: 'one',
      }));
    });

    act(() => {
      result.current.commitDraftChange((currentDraft) => ({
        ...currentDraft,
        title: 'two',
      }));
    });

    act(() => {
      result.current.commitDraftChange((currentDraft) => ({
        ...currentDraft,
        title: 'three',
      }));
    });

    act(() => {
      result.current.undo();
    });
    expect(result.current.draft.title).toBe('two');

    act(() => {
      result.current.undo();
    });
    expect(result.current.draft.title).toBe('one');
    expect(result.current.canUndo).toBe(false);
  });

  it('skips internal history state updates after unmount', () => {
    const replaceDraft = vi.fn();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const initialDraft = createEmptyAdvancedMapDatasetDraft('resource-1', referenceRows);
    const { result, unmount } = renderHook(() =>
      useAdvancedMapDatasetDraftHistory({
        resourceKey: 'resource-1',
        draft: initialDraft,
        replaceDraft,
      })
    );

    unmount();

    act(() => {
      result.current.commitDraftChange((currentDraft) => ({
        ...currentDraft,
        title: 'Pending metadata commit',
      }));
    });

    expect(replaceDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Pending metadata commit',
      })
    );
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
