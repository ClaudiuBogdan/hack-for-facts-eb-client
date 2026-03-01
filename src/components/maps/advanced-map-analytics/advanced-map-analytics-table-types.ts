export interface AdvancedMapAnalyticsTableSeriesColumn {
  id: string;
  label: string;
  unit?: string;
}

export interface AdvancedMapAnalyticsTableRow {
  sirutaCode: string;
  uatName: string;
  countyName: string;
  entityCui?: string;
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
