import type { InsDataset } from '@/schemas/ins';

export type TemporalSplit = 'all' | 'year' | 'quarter' | 'month';
export type ExplorerMode = 'collapsed' | 'expanded';

export type InsUrlState = {
  datasetCode: string | null;
  search: string;
  rootCode: string;
  temporalSplit: TemporalSplit;
  explorerMode: ExplorerMode;
  seriesSelection: Record<string, string[]>;
  unitKey: string | null;
};

export type DatasetExplorerSection = {
  code: string;
  label: string;
  datasets: InsDataset[];
};

export type PreparedDatasetSearchEntry = {
  dataset: InsDataset;
  datasetName: string;
  normalizedName: string;
  normalizedContext: string;
  normalizedCode: string;
  normalizedSupplemental: string;
};

export type DatasetExplorerGroup = {
  code: string;
  shortLabel: string;
  label: string;
  totalCount: number;
  sections: DatasetExplorerSection[];
  unsectionedDatasets: InsDataset[];
};

export type DerivedIndicatorId =
  | 'birth-rate'
  | 'death-rate'
  | 'natural-increase'
  | 'natural-increase-rate'
  | 'net-migration'
  | 'net-migration-rate'
  | 'employees-rate'
  | 'dwellings-rate'
  | 'living-area'
  | 'water'
  | 'gas'
  | 'sewer-rate'
  | 'gas-network-rate';

export type DerivedIndicator = {
  id: DerivedIndicatorId;
  label: string;
  value: string;
  unitLabel: string;
  sourceDatasetCode: string | null;
};

export type DerivedIndicatorExplanation = {
  whyItMatters: string;
  formula: string;
  inputs: string[];
  notes: string;
};

export type DerivedIndicatorRuntimeContext = {
  selectedPeriodLabel: string;
  dataPeriodLabel: string;
  sourceDatasetCode: string | null;
  hasFallback: boolean;
};

export type DerivedIndicatorGroup = 'demography' | 'economy_housing' | 'utilities';
