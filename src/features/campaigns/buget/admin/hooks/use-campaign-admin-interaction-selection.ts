import { useCallback, useRef, useState } from "react";
import { buildCampaignAdminSelectionKey } from "@/features/campaigns/buget/admin/constants";
import type { CampaignAdminUserInteractionListItem } from "@/features/campaigns/buget/admin/types";
import { isCampaignAdminPendingReview } from "@/features/campaigns/buget/admin/utils/review-workspace";

export type CampaignAdminToggleUserInteractionSelectionInput = {
  readonly item: CampaignAdminUserInteractionListItem;
  readonly checked: boolean;
  readonly shiftKey: boolean;
  readonly visibleItems: readonly CampaignAdminUserInteractionListItem[];
};

function buildInteractionSelectionKey(
  item: CampaignAdminUserInteractionListItem,
): string {
  return buildCampaignAdminSelectionKey(item.userId, item.recordKey);
}

function areSetsEqual(
  left: ReadonlySet<string>,
  right: ReadonlySet<string>,
): boolean {
  if (left.size !== right.size) {
    return false;
  }

  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }

  return true;
}

function getSelectableRangeSelectionKeys(input: {
  readonly anchorKey: string;
  readonly targetKey: string;
  readonly visibleItems: readonly CampaignAdminUserInteractionListItem[];
}): readonly string[] | null {
  const anchorIndex = input.visibleItems.findIndex(
    (item) => buildInteractionSelectionKey(item) === input.anchorKey,
  );
  const targetIndex = input.visibleItems.findIndex(
    (item) => buildInteractionSelectionKey(item) === input.targetKey,
  );

  if (anchorIndex === -1 || targetIndex === -1) {
    return null;
  }

  const [startIndex, endIndex] =
    anchorIndex <= targetIndex
      ? [anchorIndex, targetIndex]
      : [targetIndex, anchorIndex];

  return input.visibleItems
    .slice(startIndex, endIndex + 1)
    .filter(isCampaignAdminPendingReview)
    .map(buildInteractionSelectionKey);
}

export function useCampaignAdminInteractionSelection() {
  const [selectedKeys, setSelectedKeysState] = useState<Set<string>>(
    () => new Set(),
  );
  const anchorKeyRef = useRef<string | null>(null);

  const commitSelection = useCallback((input: {
    readonly nextKeys: Set<string>;
    readonly nextAnchorKey?: string | null;
  }) => {
    setSelectedKeysState((currentKeys) => {
      if (input.nextAnchorKey !== undefined) {
        anchorKeyRef.current = input.nextAnchorKey;
      }

      return areSetsEqual(currentKeys, input.nextKeys)
        ? currentKeys
        : input.nextKeys;
    });
  }, []);

  const clearSelection = useCallback(() => {
    commitSelection({
      nextKeys: new Set(),
      nextAnchorKey: null,
    });
  }, [commitSelection]);

  const replaceSelection = useCallback(
    (selectionKeys: Iterable<string>, anchorKey: string | null = null) => {
      commitSelection({
        nextKeys: new Set(selectionKeys),
        nextAnchorKey: anchorKey,
      });
    },
    [commitSelection],
  );

  const updateSelection = useCallback(
    (updater: (currentKeys: ReadonlySet<string>) => Set<string>) => {
      setSelectedKeysState((currentKeys) => {
        const nextKeys = updater(currentKeys);

        return areSetsEqual(currentKeys, nextKeys) ? currentKeys : nextKeys;
      });
    },
    [],
  );

  const toggleSelection = useCallback(
    (input: CampaignAdminToggleUserInteractionSelectionInput) => {
      if (!isCampaignAdminPendingReview(input.item)) {
        return;
      }

      const targetKey = buildInteractionSelectionKey(input.item);
      const anchorKey = anchorKeyRef.current;
      const rangeSelectionKeys =
        input.shiftKey && anchorKey !== null
          ? getSelectableRangeSelectionKeys({
              anchorKey,
              targetKey,
              visibleItems: input.visibleItems,
            })
          : null;

      setSelectedKeysState((currentKeys) => {
        const nextKeys = new Set(currentKeys);

        if (rangeSelectionKeys !== null) {
          rangeSelectionKeys.forEach((selectionKey) => {
            if (input.checked) {
              nextKeys.add(selectionKey);
            } else {
              nextKeys.delete(selectionKey);
            }
          });

          return areSetsEqual(currentKeys, nextKeys) ? currentKeys : nextKeys;
        }

        if (input.checked) {
          nextKeys.add(targetKey);
        } else {
          nextKeys.delete(targetKey);
        }

        anchorKeyRef.current = targetKey;
        return areSetsEqual(currentKeys, nextKeys) ? currentKeys : nextKeys;
      });
    },
    [],
  );

  const selectItem = useCallback(
    (item: CampaignAdminUserInteractionListItem) => {
      if (!isCampaignAdminPendingReview(item)) {
        return;
      }

      const selectionKey = buildInteractionSelectionKey(item);

      setSelectedKeysState((currentKeys) => {
        if (currentKeys.has(selectionKey)) {
          anchorKeyRef.current = selectionKey;
          return currentKeys;
        }

        anchorKeyRef.current = selectionKey;
        return new Set([...currentKeys, selectionKey]);
      });
    },
    [],
  );

  const removeSelectionKey = useCallback((selectionKey: string) => {
    setSelectedKeysState((currentKeys) => {
      if (!currentKeys.has(selectionKey)) {
        return currentKeys;
      }

      const nextKeys = new Set(currentKeys);
      nextKeys.delete(selectionKey);

      if (anchorKeyRef.current === selectionKey) {
        anchorKeyRef.current = null;
      }

      return nextKeys;
    });
  }, []);

  const pruneSelection = useCallback((liveSelectionKeys: ReadonlySet<string>) => {
    setSelectedKeysState((currentKeys) => {
      const nextKeys = new Set(
        Array.from(currentKeys).filter((selectionKey) =>
          liveSelectionKeys.has(selectionKey),
        ),
      );

      if (
        anchorKeyRef.current !== null &&
        !liveSelectionKeys.has(anchorKeyRef.current)
      ) {
        anchorKeyRef.current = null;
      }

      return areSetsEqual(currentKeys, nextKeys) ? currentKeys : nextKeys;
    });
  }, []);

  return {
    selectedKeys,
    clearSelection,
    replaceSelection,
    updateSelection,
    toggleSelection,
    selectItem,
    removeSelectionKey,
    pruneSelection,
  };
}
