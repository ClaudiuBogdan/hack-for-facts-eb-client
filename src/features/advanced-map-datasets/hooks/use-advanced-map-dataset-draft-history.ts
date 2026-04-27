import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { AdvancedMapDatasetDraft } from '@/features/advanced-map-datasets/types';

const DEFAULT_HISTORY_LIMIT = 20;

interface UseAdvancedMapDatasetDraftHistoryInput {
  resourceKey: string;
  draft: AdvancedMapDatasetDraft;
  replaceDraft: (draft: AdvancedMapDatasetDraft) => void;
  historyLimit?: number;
}

export function useAdvancedMapDatasetDraftHistory({
  resourceKey,
  draft,
  replaceDraft,
  historyLimit = DEFAULT_HISTORY_LIMIT,
}: Readonly<UseAdvancedMapDatasetDraftHistoryInput>) {
  const draftRef = useRef(draft);
  const undoStackRef = useRef<AdvancedMapDatasetDraft[]>([]);
  const redoStackRef = useRef<AdvancedMapDatasetDraft[]>([]);
  const isMountedRef = useRef(false);
  const [, setHistoryVersion] = useState(0);

  const syncHistoryVersion = useCallback(() => {
    if (!isMountedRef.current) {
      return;
    }

    setHistoryVersion((version) => version + 1);
  }, []);

  useLayoutEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    syncHistoryVersion();
  }, [resourceKey, syncHistoryVersion]);

  const commitDraftChange = useCallback(
    (updater: (currentDraft: AdvancedMapDatasetDraft) => AdvancedMapDatasetDraft) => {
      const currentDraft = draftRef.current;
      const nextDraft = updater(currentDraft);

      if (nextDraft === currentDraft) {
        return;
      }

      undoStackRef.current.push(currentDraft);
      if (undoStackRef.current.length > historyLimit) {
        undoStackRef.current.shift();
      }

      redoStackRef.current = [];

      const stampedDraft = {
        ...nextDraft,
        updatedAt: new Date().toISOString(),
      };

      draftRef.current = stampedDraft;
      syncHistoryVersion();
      replaceDraft(stampedDraft);
    },
    [historyLimit, replaceDraft, syncHistoryVersion]
  );

  const undo = useCallback(() => {
    const previousDraft = undoStackRef.current.pop();
    if (!previousDraft) {
      return;
    }

    redoStackRef.current.push(draftRef.current);
    if (redoStackRef.current.length > historyLimit) {
      redoStackRef.current.shift();
    }

    const stampedDraft = {
      ...previousDraft,
      updatedAt: new Date().toISOString(),
    };

    draftRef.current = stampedDraft;
    syncHistoryVersion();
    replaceDraft(stampedDraft);
  }, [historyLimit, replaceDraft, syncHistoryVersion]);

  const redo = useCallback(() => {
    const nextDraft = redoStackRef.current.pop();
    if (!nextDraft) {
      return;
    }

    undoStackRef.current.push(draftRef.current);
    if (undoStackRef.current.length > historyLimit) {
      undoStackRef.current.shift();
    }

    const stampedDraft = {
      ...nextDraft,
      updatedAt: new Date().toISOString(),
    };

    draftRef.current = stampedDraft;
    syncHistoryVersion();
    replaceDraft(stampedDraft);
  }, [historyLimit, replaceDraft, syncHistoryVersion]);

  const resetHistory = useCallback(
    (nextDraft: AdvancedMapDatasetDraft = draftRef.current) => {
      draftRef.current = nextDraft;
      undoStackRef.current = [];
      redoStackRef.current = [];
      syncHistoryVersion();
    },
    [syncHistoryVersion]
  );

  return {
    commitDraftChange,
    undo,
    redo,
    canUndo: undoStackRef.current.length > 0,
    canRedo: redoStackRef.current.length > 0,
    resetHistory,
  };
}
