export interface ExperimentalMapTableSeriesColumn {
  id: string;
  label: string;
  unit?: string;
}

export interface ExperimentalMapTableRow {
  sirutaCode: string;
  uatName: string;
  countyName: string;
  entityCui?: string;
  valuesBySeriesId: Record<string, number | undefined>;
}

export interface ExperimentalMapBinsFilterOption {
  groupId: string;
  label: string;
  color: string;
  checked: boolean;
}

export interface ExperimentalMapBinsFilterSection {
  presetId: string;
  presetLabel: string;
  options: ExperimentalMapBinsFilterOption[];
  disabledReason?: string;
}

export type ExperimentalMapBinsFilterSelectionByPresetId = Record<string, string[]>;
