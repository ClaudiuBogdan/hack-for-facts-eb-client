export interface AdvancedMapAnalyticsTableSeriesColumn {
  id: string;
  label: string;
  unit?: string;
}

export interface AdvancedMapAnalyticsTableGroupingColumn {
  id: string;
  label: string;
}

export type AdvancedMapAnalyticsTableRowMode =
  | 'uat_rows'
  | 'group_rows'
  | 'group_rows_with_members';

export type AdvancedMapAnalyticsTableRowKind = 'uat' | 'group' | 'group-member';

export interface AdvancedMapAnalyticsTableRow {
  rowId?: string;
  kind?: AdvancedMapAnalyticsTableRowKind;
  parentRowId?: string;
  depth?: number;
  sirutaCode?: string;
  uatName: string;
  countyName: string;
  entityCui?: string;
  groupWorkspaceId?: string;
  groupWorkspaceLabel?: string;
  groupId?: string;
  groupLabel?: string;
  primarySirutaCode?: string;
  primaryUatName?: string;
  memberCount?: number;
  memberSirutaCodes?: string[];
  searchText?: string;
  binFilterKey?: string;
  groupValuesByGroupingId?: Record<string, string | undefined>;
  valuesBySeriesId: Record<string, number | undefined>;
}

export interface AdvancedMapAnalyticsBinsFilterOption {
  groupId: string;
  label: string;
  color: string;
  checked: boolean;
}

export interface AdvancedMapAnalyticsBinsFilterSection {
  presetId: string;
  presetLabel: string;
  options: AdvancedMapAnalyticsBinsFilterOption[];
  disabledReason?: string;
}

export type AdvancedMapAnalyticsBinsFilterSelectionByPresetId = Record<string, string[]>;
