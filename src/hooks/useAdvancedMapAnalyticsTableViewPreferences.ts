import { useCallback } from 'react';
import { usePersistedState } from '@/lib/hooks/usePersistedState';
import type { MapGroupWorkspace } from '@/schemas/advanced-map-analytics';
import {
  getDefaultAdvancedMapAnalyticsTableRowMode,
  resolveAdvancedMapAnalyticsTableRowMode,
} from '@/components/maps/advanced-map-analytics/advanced-map-analytics-table-rows';
import type { AdvancedMapAnalyticsTableRowMode } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-table-types';

const TABLE_ROW_MODE_STORAGE_KEY = 'advanced-map-analytics-table-row-mode';
const TABLE_SHOW_MEMBER_VALUES_STORAGE_KEY = 'advanced-map-analytics-table-show-member-values';

export function useAdvancedMapAnalyticsTableViewPreferences(params: {
  activeGroupWorkspace?: MapGroupWorkspace;
}) {
  const [preferredRowMode, setPreferredRowMode] =
    usePersistedState<AdvancedMapAnalyticsTableRowMode | null>(
      TABLE_ROW_MODE_STORAGE_KEY,
      null
    );
  const [showMemberValues, setShowMemberValues] = usePersistedState<boolean>(
    TABLE_SHOW_MEMBER_VALUES_STORAGE_KEY,
    true
  );

  const rowMode = resolveAdvancedMapAnalyticsTableRowMode({
    preferredRowMode,
    activeGroupWorkspace: params.activeGroupWorkspace,
  });
  const defaultRowMode = getDefaultAdvancedMapAnalyticsTableRowMode({
    activeGroupWorkspace: params.activeGroupWorkspace,
  });

  const setRowMode = useCallback(
    (nextRowMode: AdvancedMapAnalyticsTableRowMode) => {
      setPreferredRowMode(nextRowMode);
    },
    [setPreferredRowMode]
  );

  return {
    rowMode,
    defaultRowMode,
    preferredRowMode,
    setRowMode,
    showMemberValues,
    setShowMemberValues,
  };
}
