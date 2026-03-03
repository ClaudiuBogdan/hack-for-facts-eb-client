import type { AnalyticsFilterType } from '@/schemas/charts'

import type {
  FundingSourceApiNode,
  NationalBudgetAccountCategory,
  NationalBudgetFormulaRule,
  NationalBudgetTransferFilter,
} from './national-budget-types'

export const NATIONAL_BUDGET_FUNDING_SOURCE_KEYS = {
  INTEGRAL_DE_LA_BUGET: 'integral-de-la-buget',
  CREDITE_EXTERNE: 'credite-externe',
  CREDITE_INTERNE: 'credite-interne',
  FONDURI_EXTERNE_NERAMBURSABILE: 'fonduri-externe-nerambursabile',
  ACTIVITATI_FINANTATE_INTEGRAL_DIN_VENITURI_PROPRII: 'activitati-finantate-integral-din-venituri-proprii',
  INTEGRAL_VENITURI_PROPRII: 'integral-venituri-proprii',
  VENITURI_PROPRII_SI_SUBVENTII: 'venituri-proprii-si-subventii',
  BUGET_PRIVATIZARE: 'buget-privatizare',
  BUGETUL_FONDULUI_PENTRU_MEDIU: 'bugetul-fondului-pentru-mediu',
  BUGETUL_TREZORERIEI_STATULUI: 'bugetul-trezoreriei-statului',
} as const

export type NationalBudgetFundingSourceKey =
  (typeof NATIONAL_BUDGET_FUNDING_SOURCE_KEYS)[keyof typeof NATIONAL_BUDGET_FUNDING_SOURCE_KEYS]

export type NationalBudgetSectorFilterPreset = {
  sectorId: string
  accountCategory: NationalBudgetAccountCategory
  fundingSourceKeys?: NationalBudgetFundingSourceKey[]
}

export type NationalBudgetLineItemsExcludeOverride = {
  sectorId: string
  accountCategory: NationalBudgetAccountCategory
  functionalPrefixes?: string[]
  economicPrefixes?: string[]
}

export type NationalBudgetFundingSourceIdsByKey = Partial<Record<NationalBudgetFundingSourceKey, string>>

export type BuildNationalBudgetSectorBaseFilterOptions = {
  fundingSourceIdsByKey?: NationalBudgetFundingSourceIdsByKey
}

const FUNDING_SOURCE_LABEL_ALIASES: Record<NationalBudgetFundingSourceKey, string[]> = {
  [NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.INTEGRAL_DE_LA_BUGET]: ['integral de la buget'],
  [NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.CREDITE_EXTERNE]: ['credite externe'],
  [NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.CREDITE_INTERNE]: ['credite interne'],
  [NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.FONDURI_EXTERNE_NERAMBURSABILE]: ['fonduri externe nerambursabile'],
  [NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.ACTIVITATI_FINANTATE_INTEGRAL_DIN_VENITURI_PROPRII]: ['activitati finantate integral din venituri proprii'],
  [NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.INTEGRAL_VENITURI_PROPRII]: ['integral venituri proprii'],
  [NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.VENITURI_PROPRII_SI_SUBVENTII]: ['venituri proprii si subventii'],
  [NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.BUGET_PRIVATIZARE]: ['buget aferent activitatii din privatizare'],
  [NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.BUGETUL_FONDULUI_PENTRU_MEDIU]: ['bugetul fondului pentru mediu'],
  [NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.BUGETUL_TREZORERIEI_STATULUI]: ['bugetul trezoreriei statului'],
}

function normalizeLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function buildNormalizedLabelCandidates(rawLabel: string): string[] {
  const normalizedLabel = normalizeLabel(rawLabel)
  if (!normalizedLabel) return []

  const candidates = new Set<string>([normalizedLabel])
  const withoutSourceCodePrefix = normalizedLabel.replace(/^[a-z0-9]{1,2}\s*[-:.]\s*/, '').trim()
  if (withoutSourceCodePrefix) {
    candidates.add(withoutSourceCodePrefix)
  }

  return Array.from(candidates)
}

export function buildFundingSourceIdsByKey(fundingSources: FundingSourceApiNode[]): NationalBudgetFundingSourceIdsByKey {
  const normalizedSources = fundingSources.map((source) => ({
    sourceId: source.source_id,
    candidates: buildNormalizedLabelCandidates(source.source_description ?? ''),
  }))

  const sourceIdByNormalizedLabel = new Map<string, string>()
  for (const source of fundingSources) {
    const candidates = buildNormalizedLabelCandidates(source.source_description ?? '')
    for (const candidate of candidates) {
      sourceIdByNormalizedLabel.set(candidate, source.source_id)
    }
  }

  const fundingSourceIdsByKey: NationalBudgetFundingSourceIdsByKey = {}
  for (const [key, aliases] of Object.entries(FUNDING_SOURCE_LABEL_ALIASES) as [NationalBudgetFundingSourceKey, string[]][]) {
    const normalizedAliases = aliases.map((alias) => normalizeLabel(alias))

    for (const alias of aliases) {
      const sourceId = sourceIdByNormalizedLabel.get(normalizeLabel(alias))
      if (!sourceId) continue
      fundingSourceIdsByKey[key] = sourceId
      break
    }

    if (fundingSourceIdsByKey[key]) continue

    // Fallback for labels with additional context such as suffixes in parentheses.
    const fuzzyMatch = normalizedSources.find((source) =>
      source.candidates.some((candidate) =>
        normalizedAliases.some((alias) => candidate.includes(alias)),
      ),
    )
    if (fuzzyMatch) {
      fundingSourceIdsByKey[key] = fuzzyMatch.sourceId
    }
  }

  return fundingSourceIdsByKey
}

const SECTOR_FILTER_PRESETS: NationalBudgetSectorFilterPreset[] = [
  // Cheltuieli (ch)
  {
    sectorId: '1',
    accountCategory: 'ch',
    fundingSourceKeys: [NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.INTEGRAL_DE_LA_BUGET],
  },
  {
    sectorId: '2',
    accountCategory: 'ch',
    fundingSourceKeys: [
      NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.INTEGRAL_DE_LA_BUGET,
      NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.INTEGRAL_VENITURI_PROPRII,
      NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.ACTIVITATI_FINANTATE_INTEGRAL_DIN_VENITURI_PROPRII,
      NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.VENITURI_PROPRII_SI_SUBVENTII,
    ],
  },
  {
    sectorId: '3',
    accountCategory: 'ch',
    fundingSourceKeys: [NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.INTEGRAL_DE_LA_BUGET],
  },
  { sectorId: '4', accountCategory: 'ch', fundingSourceKeys: [] },
  { sectorId: '5', accountCategory: 'ch', fundingSourceKeys: [] },

  // Venituri (vn)
  {
    sectorId: '1',
    accountCategory: 'vn',
    fundingSourceKeys: [NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.INTEGRAL_DE_LA_BUGET],
  },
  {
    sectorId: '2',
    accountCategory: 'vn',
    fundingSourceKeys: [
      NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.INTEGRAL_DE_LA_BUGET,
      NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.FONDURI_EXTERNE_NERAMBURSABILE,
      NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.INTEGRAL_VENITURI_PROPRII,
    ],
  },
  {
    sectorId: '3',
    accountCategory: 'vn',
    fundingSourceKeys: [NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.INTEGRAL_DE_LA_BUGET],
  },
  {
    sectorId: '4',
    accountCategory: 'vn',
    fundingSourceKeys: [NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.INTEGRAL_DE_LA_BUGET],
  },
  {
    sectorId: '5',
    accountCategory: 'vn',
    fundingSourceKeys: [
      NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.INTEGRAL_DE_LA_BUGET,
      NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.FONDURI_EXTERNE_NERAMBURSABILE,
    ],
  },
]

const LINE_ITEMS_EXCLUDE_OVERRIDES: NationalBudgetLineItemsExcludeOverride[] = [
  {
    sectorId: '1',
    accountCategory: 'vn',
    functionalPrefixes: ['36.02.05', '37.02.03', '37.02.04', '47.02.04'],
    economicPrefixes: ['51.01', '51.02'],
  },
]

function hasFilterValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0
  return value !== undefined
}

function sanitizeExclude(exclude: AnalyticsFilterType['exclude'] | undefined): AnalyticsFilterType['exclude'] | undefined {
  if (!exclude) return undefined

  // We scope sector/funding/classification from dedicated national budget rules.
  // Carrying these fields from URL state causes cross-sector contamination.
  const {
    functional_codes: _functionalCodes,
    functional_prefixes: _functionalPrefixes,
    economic_codes: _economicCodes,
    economic_prefixes: _economicPrefixes,
    funding_source_ids: _fundingSourceIds,
    budget_sector_ids: _budgetSectorIds,
    ...rest
  } = exclude

  const hasAnyValue = Object.values(rest).some(hasFilterValue)
  return hasAnyValue ? rest : undefined
}

function normalizeExclude(baseFilter: AnalyticsFilterType, nextExclude: AnalyticsFilterType['exclude']): AnalyticsFilterType {
  if (!nextExclude) {
    return {
      ...baseFilter,
      exclude: undefined,
    }
  }
  const hasExcludeValues = Object.values(nextExclude).some(hasFilterValue)
  return {
    ...baseFilter,
    exclude: hasExcludeValues ? nextExclude : undefined,
  }
}

export function buildNationalBudgetLineItemsFilter(
  baseFilter: AnalyticsFilterType,
  {
    sectorId,
    rules,
    transferFilter,
  }: {
    sectorId: string
    rules: NationalBudgetFormulaRule[]
    transferFilter: NationalBudgetTransferFilter
  },
): AnalyticsFilterType {
  const exclude = { ...(baseFilter.exclude ?? {}) }

  if (transferFilter === 'all') {
    return normalizeExclude(baseFilter, {
      ...exclude,
      functional_prefixes: undefined,
      economic_prefixes: undefined,
    })
  }

  const derivedFunctionalPrefixes = new Set<string>()
  const derivedEconomicPrefixes = new Set<string>()

  for (const rule of rules) {
    if (rule.classification === 'fn') {
      for (const prefix of rule.prefixes) {
        derivedFunctionalPrefixes.add(prefix)
      }
    }
    if (rule.classification === 'ec') {
      for (const prefix of rule.prefixes) {
        derivedEconomicPrefixes.add(prefix)
      }
    }
  }

  const accountCategory = baseFilter.account_category ?? 'ch'
  const excludeOverride = getLineItemsExcludeOverride(sectorId, accountCategory)
  const nextFunctionalPrefixes = new Set<string>(
    excludeOverride?.functionalPrefixes ?? Array.from(derivedFunctionalPrefixes),
  )
  const nextEconomicPrefixes = new Set<string>(
    excludeOverride?.economicPrefixes ?? Array.from(derivedEconomicPrefixes),
  )

  return normalizeExclude(baseFilter, {
    ...exclude,
    functional_prefixes: nextFunctionalPrefixes.size > 0 ? Array.from(nextFunctionalPrefixes) : undefined,
    economic_prefixes: nextEconomicPrefixes.size > 0 ? Array.from(nextEconomicPrefixes) : undefined,
  })
}

export function getSectorFilterPreset(
  sectorId: string,
  accountCategory: NationalBudgetAccountCategory,
): NationalBudgetSectorFilterPreset | undefined {
  return SECTOR_FILTER_PRESETS.find((preset) => preset.sectorId === sectorId && preset.accountCategory === accountCategory)
}

export function getLineItemsExcludeOverride(
  sectorId: string,
  accountCategory: NationalBudgetAccountCategory,
): NationalBudgetLineItemsExcludeOverride | undefined {
  return LINE_ITEMS_EXCLUDE_OVERRIDES.find(
    (override) => override.sectorId === sectorId && override.accountCategory === accountCategory,
  )
}

export function buildNationalBudgetSectorBaseFilter(
  baseFilter: AnalyticsFilterType,
  sectorId: string,
  options?: BuildNationalBudgetSectorBaseFilterOptions,
): AnalyticsFilterType {
  const accountCategory: NationalBudgetAccountCategory = baseFilter.account_category ?? 'ch'
  const preset = getSectorFilterPreset(sectorId, accountCategory)
  const fundingSourceIds = preset?.fundingSourceKeys?.length
    ? preset.fundingSourceKeys
      .map((sourceKey) => options?.fundingSourceIdsByKey?.[sourceKey])
      .filter((sourceId): sourceId is string => Boolean(sourceId))
    : undefined
  const uniqueFundingSourceIds = fundingSourceIds?.length ? Array.from(new Set(fundingSourceIds)) : undefined

  return {
    ...baseFilter,
    account_category: accountCategory,
    budget_sector_ids: [sectorId],
    funding_source_ids: uniqueFundingSourceIds,
    functional_codes: undefined,
    functional_prefixes: undefined,
    economic_codes: undefined,
    economic_prefixes: undefined,
    exclude: sanitizeExclude(baseFilter.exclude),
  }
}
