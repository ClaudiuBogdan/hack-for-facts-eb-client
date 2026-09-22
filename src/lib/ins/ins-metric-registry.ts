import { t } from '@lingui/core/macro';

export type InsMetricLevel = 'uat' | 'county';

export interface InsMetricDefinition {
  code: string;
  label: string;
}

export interface InsRootContextDefinition {
  code: string;
  shortLabel: string;
  label: string;
}

// Labels are getters: `t` resolves against the active locale when it runs, and
// a module-scope call runs once, at import, in whatever locale was active then.

export const INS_TOP_METRICS_BY_LEVEL: Record<InsMetricLevel, InsMetricDefinition[]> = {
  uat: [
    { code: 'POP107D', get label() { return t`Population` } },
    { code: 'FOM104D', get label() { return t`Employees (average)` } },
    { code: 'SOM101F', get label() { return t`Registered unemployment share` } },
    { code: 'LOC101B', get label() { return t`Existing dwellings` } },
  ],
  county: [
    { code: 'POP107D', get label() { return t`Population` } },
    { code: 'FOM104D', get label() { return t`Employees (average)` } },
    { code: 'SOM103A', get label() { return t`Unemployment rate` } },
    { code: 'LOC101B', get label() { return t`Existing dwellings` } },
  ],
};

export const INS_PRIORITIZED_DATASET_CODES_BY_LEVEL: Record<InsMetricLevel, string[]> = {
  uat: [
    'POP107D',
    'POP108D',
    'POP201D',
    'POP206D',
    'POP309E',
    'POP310E',
    'FOM104D',
    'SOM101E',
    'SOM101F',
    'LOC101B',
    'LOC103B',
    'GOS107A',
    'GOS110A',
    'GOS116A',
    'GOS118A',
    'GOS104A',
    'GOS105A',
    'SCL101C',
    'SCL103D',
    'SAN101B',
    'SAN104B',
    'TUR101C',
    'TUR104E',
  ],
  county: [
    'POP107D',
    'POP108D',
    'POP201D',
    'POP206D',
    'POP309E',
    'POP310E',
    'FOM104D',
    'SOM103A',
    'SOM103B',
    'SOM101E',
    'SOM101F',
    'LOC101B',
    'LOC103B',
    'GOS107A',
    'GOS110A',
    'GOS116A',
    'GOS118A',
    'SCL101C',
    'SCL103D',
    'SAN104B',
    'SAN101B',
    'POP206C',
    'POP217A',
    'TUR101C',
    'TUR104E',
  ],
};

export const INS_DERIVED_INDICATOR_BASE_CODES = [
  'POP107D',
  'POP201D',
  'POP206D',
  'POP309E',
  'POP310E',
  'FOM104D',
  'LOC101B',
  'LOC103B',
  'GOS107A',
  'GOS118A',
  'GOS110A',
  'GOS116A',
] as const;

export const INS_ROOT_CONTEXTS: InsRootContextDefinition[] = [
  { code: '1', shortLabel: 'A', get label() { return t`Social` } },
  { code: '2', shortLabel: 'B', get label() { return t`Economic` } },
  { code: '3', shortLabel: 'C', get label() { return t`Finance` } },
  { code: '4', shortLabel: 'D', get label() { return t`Justice` } },
  { code: '5', shortLabel: 'E', get label() { return t`Environment` } },
  { code: '6', shortLabel: 'F', get label() { return t`Utilities & territory` } },
  { code: '7', shortLabel: 'G', get label() { return t`SDG 2020` } },
  { code: '8', shortLabel: 'H', get label() { return t`SDG 2030` } },
];

