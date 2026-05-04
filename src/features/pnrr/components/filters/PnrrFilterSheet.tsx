import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import type {
  PnrrBeneficiaryType,
  PnrrSearchState,
} from '@/schemas/pnrr'
import type { usePnrrFilterState } from '../../hooks/usePnrrFilterState'
import { getActiveFilterCount } from '../../lib/data-transform'
import { Input } from '@/components/ui/input'
import type { Option } from '@/components/ui/multi-select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  PnrrStyledMultiSelect,
  type PnrrFilterOption,
} from './PnrrStyledMultiSelect'
import { PNRR_COMPONENTS } from '../../data/component-definitions'
import { PNRR_CRIS } from '../../data/cri-definitions'
import { getAllMeasureOptions } from '../../lib/allocations'
import {
  ANOMALY_CONFIG,
  DATA_QUALITY_SIGNAL_CONFIG,
} from '../../lib/anomaly-definitions'
import {
  PROGRESS_CATEGORY_LABELS,
  BENEFICIARY_TYPE_OPTIONS,
  type ProgressCategoryKey,
} from '../../lib/filter-constants'
import type { Currency } from '@/schemas/charts'
import { useUserCurrency } from '@/lib/hooks/useUserCurrency'
import {
  setPreferenceCookie,
  USER_CURRENCY_STORAGE_KEY,
} from '@/lib/user-preferences'
import type { PnrrWorkerFilterFacets } from '../../workers/pnrr-worker-types'

const SEARCH_DEBOUNCE_MS = 300
const SELECTION_DEBOUNCE_MS = 300
const LOCAL_SELECTION_COMMIT_DELAY_MS = 0
const SELECTION_SEPARATOR = '\u001F'

const PROGRESS_OPTIONS: Option[] = Object.entries(PROGRESS_CATEGORY_LABELS).map(
  ([value, label]) => ({ value, label }),
)

const ANOMALY_TYPE_OPTIONS: Option[] = ANOMALY_CONFIG.map((cfg) => ({
  value: cfg.type,
  label: cfg.shortDescription,
}))

const DATA_QUALITY_SIGNAL_OPTIONS: Option[] = DATA_QUALITY_SIGNAL_CONFIG.map(
  (cfg) => ({
    value: cfg.type,
    label: cfg.shortDescription,
  }),
)

const FILTER_LABEL_CLASS =
  'text-xs font-black uppercase tracking-wide text-[var(--pnrr-muted)]'
const FILTER_INPUT_CLASS =
  'h-11 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] pl-10 pr-9 text-sm font-semibold text-[var(--pnrr-fg)] placeholder:text-[var(--pnrr-muted)] focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]'
const FILTER_TOGGLE_ITEM_CLASS =
  'h-10 min-w-0 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-2 text-sm font-black text-[var(--pnrr-fg)] transition-colors hover:bg-[var(--pnrr-bg)] data-[state=on]:bg-[var(--pnrr-fg)] data-[state=on]:text-[var(--pnrr-bg)] sm:px-4'

function applyGlobalCurrency(currency: Currency): void {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(
        USER_CURRENCY_STORAGE_KEY,
        JSON.stringify(currency),
      )
    } catch (error) {
      console.warn('Failed to write currency to localStorage', error)
    }
  }

  setPreferenceCookie(USER_CURRENCY_STORAGE_KEY, currency)
}

function getSelectionKey(values: readonly string[]): string {
  return values.join(SELECTION_SEPARATOR)
}

function useDebouncedSelectionState<T extends string>(
  globalValues: readonly T[],
  onCommit: (values: T[]) => void,
): readonly [T[], (values: T[]) => void] {
  const globalKey = getSelectionKey(globalValues)
  const [localValues, setLocalValuesState] = useState<T[]>(() => [
    ...globalValues,
  ])
  const localKey = getSelectionKey(localValues)
  const globalValuesRef = useRef(globalValues)
  const onCommitRef = useRef(onCommit)
  const latestLocalValuesRef = useRef(localValues)
  const latestLocalKeyRef = useRef(localKey)
  const latestGlobalKeyRef = useRef(globalKey)

  useEffect(() => {
    globalValuesRef.current = globalValues
  }, [globalValues])

  useEffect(() => {
    onCommitRef.current = onCommit
  }, [onCommit])

  useEffect(() => {
    latestLocalValuesRef.current = localValues
    latestLocalKeyRef.current = localKey
    latestGlobalKeyRef.current = globalKey
  }, [globalKey, localKey, localValues])

  useEffect(() => {
    setLocalValuesState((current) =>
      getSelectionKey(current) === globalKey
        ? current
        : [...globalValuesRef.current],
    )
  }, [globalKey])

  useEffect(() => {
    if (localKey === globalKey) return

    const timeout = window.setTimeout(() => {
      onCommitRef.current([...latestLocalValuesRef.current])
    }, SELECTION_DEBOUNCE_MS)

    return () => window.clearTimeout(timeout)
  }, [globalKey, localKey])

  useEffect(() => {
    return () => {
      if (latestLocalKeyRef.current !== latestGlobalKeyRef.current) {
        onCommitRef.current([...latestLocalValuesRef.current])
      }
    }
  }, [])

  const setLocalValues = useCallback((values: T[]) => {
    setLocalValuesState([...values])
  }, [])

  return [localValues, setLocalValues]
}

interface PnrrFilterSheetProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly facets: PnrrWorkerFilterFacets | null
  readonly filterState: ReturnType<typeof usePnrrFilterState>
  readonly showTrigger?: boolean
}

export function PnrrFilterSheet({
  open,
  onOpenChange,
  facets,
  filterState,
  showTrigger = true,
}: PnrrFilterSheetProps) {
  const search = filterState.search
  const setSearch = filterState.setSearch
  const setBeneficiarySearch = filterState.setBeneficiarySearch
  const setBeneficiaryCui = filterState.setBeneficiaryCui
  const [userCurrency, setUserCurrency] = useUserCurrency()
  const selectedCurrency = search.currency ?? userCurrency

  // Local debounced state for search inputs
  const globalSearch = search.search ?? ''
  const globalBeneficiarySearch = search.beneficiarySearch ?? ''
  const globalBeneficiaryCui = search.beneficiaryCui ?? ''
  const [projectInput, setProjectInput] = useState(globalSearch)
  const [beneficiaryInput, setBeneficiaryInput] = useState(
    globalBeneficiarySearch,
  )
  const [beneficiaryCuiInput, setBeneficiaryCuiInput] =
    useState(globalBeneficiaryCui)
  const [selectedUatFilters, setSelectedUatFilters] =
    useDebouncedSelectionState<string>(
      search.uatSirutas ?? (search.uatSiruta ? [search.uatSiruta] : []),
      filterState.setUatFilters,
    )
  const [selectedCounties, setSelectedCounties] =
    useDebouncedSelectionState<string>(
      search.counties ?? [],
      filterState.setCounties,
    )
  const [selectedBeneficiaryTypes, setSelectedBeneficiaryTypes] =
    useDebouncedSelectionState<PnrrBeneficiaryType>(
      search.beneficiaryTypes ?? [],
      filterState.setBeneficiaryTypes,
    )
  const [selectedComponents, setSelectedComponents] =
    useDebouncedSelectionState<string>(
      search.components ?? [],
      filterState.setComponents,
    )
  const [selectedMeasures, setSelectedMeasures] =
    useDebouncedSelectionState<string>(
      search.measures ?? [],
      filterState.setMeasures,
    )
  const [selectedCris, setSelectedCris] = useDebouncedSelectionState<string>(
    search.cris ?? [],
    filterState.setCris,
  )
  const [selectedFundingSources, setSelectedFundingSources] =
    useDebouncedSelectionState<
      NonNullable<PnrrSearchState['fundingSources']>[number]
    >(search.fundingSources ?? [], filterState.setFundingSources)
  const [selectedProgressCategories, setSelectedProgressCategories] =
    useDebouncedSelectionState<ProgressCategoryKey>(
      search.progressCategories ?? [],
      filterState.setProgressCategories,
    )
  const [selectedAnomalyTypes, setSelectedAnomalyTypes] =
    useDebouncedSelectionState<string>(
      search.anomalyTypes ?? [],
      filterState.setAnomalyTypes,
    )
  const [selectedDataQualitySignalTypes, setSelectedDataQualitySignalTypes] =
    useDebouncedSelectionState<string>(
      search.dataQualitySignalTypes ?? [],
      filterState.setDataQualitySignalTypes,
    )

  const handleClearFilters = useCallback(() => {
    setProjectInput('')
    setBeneficiaryInput('')
    setBeneficiaryCuiInput('')
    setSelectedUatFilters([])
    setSelectedCounties([])
    setSelectedBeneficiaryTypes([])
    setSelectedComponents([])
    setSelectedMeasures([])
    setSelectedCris([])
    setSelectedFundingSources([])
    setSelectedProgressCategories([])
    setSelectedAnomalyTypes([])
    setSelectedDataQualitySignalTypes([])
    filterState.clearFilters()
  }, [
    filterState,
    setSelectedAnomalyTypes,
    setSelectedBeneficiaryTypes,
    setSelectedComponents,
    setSelectedCounties,
    setSelectedCris,
    setSelectedDataQualitySignalTypes,
    setSelectedFundingSources,
    setSelectedMeasures,
    setSelectedProgressCategories,
    setSelectedUatFilters,
  ])

  // Sync inputs with global state when changed externally (e.g. clear filters)
  useEffect(() => {
    setProjectInput(globalSearch)
  }, [globalSearch])

  useEffect(() => {
    setBeneficiaryInput(globalBeneficiarySearch)
  }, [globalBeneficiarySearch])

  useEffect(() => {
    setBeneficiaryCuiInput(globalBeneficiaryCui)
  }, [globalBeneficiaryCui])

  // Debounce global state updates so typing stays responsive
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (projectInput !== globalSearch) {
        setSearch(projectInput || undefined)
      }
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [projectInput, globalSearch, setSearch])

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (beneficiaryInput !== globalBeneficiarySearch) {
        setBeneficiarySearch(beneficiaryInput || undefined)
      }
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [beneficiaryInput, globalBeneficiarySearch, setBeneficiarySearch])

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (beneficiaryCuiInput !== globalBeneficiaryCui) {
        setBeneficiaryCui(beneficiaryCuiInput || undefined)
      }
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [beneficiaryCuiInput, globalBeneficiaryCui, setBeneficiaryCui])

  const componentOptions = useMemo(() => {
    return (facets?.components ?? []).map<Option>((code) => ({
      value: code,
      label: `${code} — ${PNRR_COMPONENTS[code]?.nameRo ?? code}`,
    }))
  }, [facets?.components])

  const countyOptions = useMemo(() => {
    return (facets?.counties ?? []).map<Option>((c) => ({ value: c, label: c }))
  }, [facets?.counties])

  const uatOptions = useMemo(() => {
    return (facets?.uats ?? []).map<PnrrFilterOption>((uat) => ({ ...uat }))
  }, [facets?.uats])

  const measureOptions = useMemo(() => {
    const measureValues = new Set(facets?.measures ?? [])
    return getAllMeasureOptions()
      .filter((opt) => measureValues.has(opt.value))
      .map<Option>((opt) => ({ value: opt.value, label: opt.label }))
  }, [facets?.measures])

  const criOptions = useMemo(() => {
    return (facets?.cris ?? []).map<Option>((c) => ({
      value: c,
      label: PNRR_CRIS[c]?.nameRo ? `${c} — ${PNRR_CRIS[c].nameRo}` : c,
    }))
  }, [facets?.cris])

  const activeCount = useMemo(() => getActiveFilterCount(search), [search])

  return (
    <>
      {/* Trigger button */}
      {showTrigger && (
        <PnrrFilterTriggerButton
          activeCount={activeCount}
          onClick={() => onOpenChange(true)}
        />
      )}

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          onOpenAutoFocus={(event) => event.preventDefault()}
          className="flex w-full max-w-full flex-col overflow-hidden border-l-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] p-0 sm:max-w-xl [&>button.absolute]:right-5 [&>button.absolute]:top-5 [&>button.absolute]:h-8 [&>button.absolute]:w-8 [&>button.absolute]:rounded-none [&>button.absolute]:bg-transparent [&>button.absolute]:opacity-100 [&>button.absolute]:ring-offset-0 [&>button.absolute]:hover:bg-[var(--pnrr-card)] [&>button.absolute]:focus:ring-[var(--pnrr-blue)]"
        >
          <SheetHeader className="border-b-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] p-6 pr-14 text-left">
            <SheetTitle className="text-left text-4xl font-black leading-none tracking-tight text-[var(--pnrr-fg)]">
              <Trans>Advanced filters</Trans>
            </SheetTitle>
            <SheetDescription className="pt-1 text-left text-base font-bold text-[var(--pnrr-muted)]">
              <Trans>{activeCount} active filters</Trans>
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 [&_[data-radix-scroll-area-viewport]>div]:!block [&_[data-radix-scroll-area-viewport]>div]:!max-w-full [&_[data-radix-scroll-area-viewport]>div]:!w-full">
            <div className="w-full min-w-0 max-w-full space-y-6 overflow-x-hidden p-4 sm:p-6">
              <section className="space-y-2">
                <Label className={FILTER_LABEL_CLASS}>
                  <Trans>Currency</Trans>
                </Label>
                <ToggleGroup
                  type="single"
                  value={selectedCurrency}
                  onValueChange={(value) => {
                    if (value === 'RON' || value === 'EUR' || value === 'USD') {
                      const nextCurrency = value as Currency
                      applyGlobalCurrency(nextCurrency)
                      setUserCurrency(nextCurrency)
                      filterState.setCurrency(nextCurrency)
                    }
                  }}
                  className="grid w-full grid-cols-3 gap-2"
                >
                  <ToggleGroupItem
                    value="RON"
                    className={FILTER_TOGGLE_ITEM_CLASS}
                    aria-label={t`Display values in RON`}
                  >
                    RON
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="EUR"
                    className={FILTER_TOGGLE_ITEM_CLASS}
                    aria-label={t`Display values in EUR`}
                  >
                    EURO
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="USD"
                    className={FILTER_TOGGLE_ITEM_CLASS}
                    aria-label={t`Display values in USD`}
                  >
                    USD
                  </ToggleGroupItem>
                </ToggleGroup>
              </section>

              <div className="border-t-2 border-[var(--pnrr-border)]" />

              <section className="space-y-5">
                <div className="space-y-2">
                  <Label className={FILTER_LABEL_CLASS}>
                    <Trans>UAT</Trans>
                  </Label>
                  <PnrrStyledMultiSelect
                    options={uatOptions}
                    selected={selectedUatFilters}
                    onChange={setSelectedUatFilters}
                    placeholder={t`Choose UAT...`}
                    commitDelayMs={LOCAL_SELECTION_COMMIT_DELAY_MS}
                  />
                </div>

                <div className="space-y-2">
                  <Label className={FILTER_LABEL_CLASS}>
                    <Trans>Counties</Trans>
                  </Label>
                  <PnrrStyledMultiSelect
                    options={countyOptions}
                    selected={selectedCounties}
                    onChange={setSelectedCounties}
                    placeholder={t`Choose counties...`}
                    commitDelayMs={LOCAL_SELECTION_COMMIT_DELAY_MS}
                  />
                </div>
              </section>

              <div className="border-t-2 border-[var(--pnrr-border)]" />

              {/* Project Search */}
              <section className="space-y-2">
                <Label className={FILTER_LABEL_CLASS}>
                  <Trans>Project search</Trans>
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--pnrr-muted)]" />
                  <Input
                    placeholder={t`Title, beneficiary, CUI, or locality...`}
                    value={projectInput}
                    onChange={(e) => setProjectInput(e.target.value)}
                    className={FILTER_INPUT_CLASS}
                  />

                  {projectInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setProjectInput('')
                        filterState.setSearch(undefined)
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--pnrr-muted)] transition-colors hover:text-[var(--pnrr-fg)]"
                      aria-label={t`Clear search`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </section>

              {/* Beneficiary CUI */}
              <section className="space-y-2">
                <Label className={FILTER_LABEL_CLASS}>
                  <Trans>Beneficiary CUI</Trans>
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--pnrr-muted)]" />
                  <Input
                    inputMode="numeric"
                    placeholder={t`Exact CUI...`}
                    value={beneficiaryCuiInput}
                    onChange={(e) => setBeneficiaryCuiInput(e.target.value)}
                    className={FILTER_INPUT_CLASS}
                  />

                  {beneficiaryCuiInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setBeneficiaryCuiInput('')
                        filterState.setBeneficiaryCui(undefined)
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--pnrr-muted)] transition-colors hover:text-[var(--pnrr-fg)]"
                      aria-label={t`Clear search`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </section>

              {/* Beneficiary Search */}
              <section className="space-y-2">
                <Label className={FILTER_LABEL_CLASS}>
                  <Trans>Beneficiary search</Trans>
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--pnrr-muted)]" />
                  <Input
                    placeholder={t`Beneficiary name...`}
                    value={beneficiaryInput}
                    onChange={(e) => setBeneficiaryInput(e.target.value)}
                    className={FILTER_INPUT_CLASS}
                  />

                  {beneficiaryInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setBeneficiaryInput('')
                        filterState.setBeneficiarySearch(undefined)
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--pnrr-muted)] transition-colors hover:text-[var(--pnrr-fg)]"
                      aria-label={t`Clear search`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </section>

              <section className="space-y-2">
                <Label className={FILTER_LABEL_CLASS}>
                  <Trans>Beneficiary type</Trans>
                </Label>
                <PnrrStyledMultiSelect
                  options={BENEFICIARY_TYPE_OPTIONS}
                  selected={selectedBeneficiaryTypes}
                  onChange={(values) =>
                    setSelectedBeneficiaryTypes(values as PnrrBeneficiaryType[])
                  }
                  placeholder={t`Choose beneficiary type...`}
                  commitDelayMs={LOCAL_SELECTION_COMMIT_DELAY_MS}
                />
              </section>

              <div className="border-t-2 border-[var(--pnrr-border)]" />

              <section className="space-y-5">
                {/* Components */}
                <div className="space-y-2">
                  <Label className={FILTER_LABEL_CLASS}>
                    <Trans>PNRR components</Trans>
                  </Label>
                  <PnrrStyledMultiSelect
                    options={componentOptions}
                    selected={selectedComponents}
                    onChange={setSelectedComponents}
                    placeholder={t`Choose components...`}
                    commitDelayMs={LOCAL_SELECTION_COMMIT_DELAY_MS}
                  />
                </div>

                {/* Measures */}
                <div className="space-y-2">
                  <Label className={FILTER_LABEL_CLASS}>
                    <Trans>Measure code</Trans>
                  </Label>
                  <PnrrStyledMultiSelect
                    options={measureOptions}
                    selected={selectedMeasures}
                    onChange={setSelectedMeasures}
                    placeholder={t`Choose measures...`}
                    commitDelayMs={LOCAL_SELECTION_COMMIT_DELAY_MS}
                  />
                </div>

                {/* CRIs */}
                <div className="space-y-2">
                  <Label className={FILTER_LABEL_CLASS}>
                    <Trans>Responsible institutions (CRI)</Trans>
                  </Label>
                  <PnrrStyledMultiSelect
                    options={criOptions}
                    selected={selectedCris}
                    onChange={setSelectedCris}
                    placeholder={t`Choose institutions...`}
                    commitDelayMs={LOCAL_SELECTION_COMMIT_DELAY_MS}
                  />
                </div>
              </section>

              <div className="border-t-2 border-[var(--pnrr-border)]" />

              {/* Funding sources */}
              <section className="space-y-3">
                <Label className={FILTER_LABEL_CLASS}>
                  <Trans>Funding source</Trans>
                </Label>
                <ToggleGroup
                  type="multiple"
                  value={selectedFundingSources}
                  onValueChange={(v) =>
                    setSelectedFundingSources(
                      v as ('grant' | 'loan' | 'grant/loan')[],
                    )
                  }
                  className="grid w-full grid-cols-2 justify-start gap-2 sm:flex sm:flex-wrap"
                >
                  <ToggleGroupItem
                    value="grant"
                    className={FILTER_TOGGLE_ITEM_CLASS}
                  >
                    <Trans>Grant</Trans>
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="loan"
                    className={FILTER_TOGGLE_ITEM_CLASS}
                  >
                    <Trans>Loan</Trans>
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="grant/loan"
                    className={`${FILTER_TOGGLE_ITEM_CLASS} col-span-2`}
                  >
                    <Trans>Grant + loan</Trans>
                  </ToggleGroupItem>
                </ToggleGroup>
              </section>

              {/* Progress */}
              <section className="space-y-2">
                <Label className={FILTER_LABEL_CLASS}>
                  <Trans>Implementation status</Trans>
                </Label>
                <PnrrStyledMultiSelect
                  options={PROGRESS_OPTIONS}
                  selected={selectedProgressCategories}
                  onChange={(v) =>
                    setSelectedProgressCategories(v as ProgressCategoryKey[])
                  }
                  placeholder={t`Choose status...`}
                  commitDelayMs={LOCAL_SELECTION_COMMIT_DELAY_MS}
                />
              </section>

              <div className="border-t-2 border-[var(--pnrr-border)]" />

              {/* Anomaly types */}
              <section className="space-y-2">
                <Label className={FILTER_LABEL_CLASS}>
                  <Trans>Risk signal type</Trans>
                </Label>
                <PnrrStyledMultiSelect
                  options={ANOMALY_TYPE_OPTIONS}
                  selected={selectedAnomalyTypes}
                  onChange={setSelectedAnomalyTypes}
                  placeholder={t`Choose risk type...`}
                  commitDelayMs={LOCAL_SELECTION_COMMIT_DELAY_MS}
                />
              </section>

              {/* Data anomaly signal types */}
              <section className="space-y-2">
                <Label className={FILTER_LABEL_CLASS}>
                  <Trans>Data anomalies</Trans>
                </Label>
                <PnrrStyledMultiSelect
                  options={DATA_QUALITY_SIGNAL_OPTIONS}
                  selected={selectedDataQualitySignalTypes}
                  onChange={setSelectedDataQualitySignalTypes}
                  placeholder={t`Choose data anomalies...`}
                  commitDelayMs={LOCAL_SELECTION_COMMIT_DELAY_MS}
                />
              </section>

              <div className="border-t-2 border-[var(--pnrr-border)]" />

              {/* Toggles */}
              <section className="space-y-0">
                <div className="flex items-center justify-between gap-4 border-b border-[var(--pnrr-border)] py-3">
                  <Label
                    htmlFor="sheet-only-anomalies"
                    className="cursor-pointer text-sm font-bold text-[var(--pnrr-fg)]"
                  >
                    <Trans>Only projects with risk signals</Trans>
                  </Label>
                  <Switch
                    id="sheet-only-anomalies"
                    checked={search.onlyAnomalies ?? false}
                    onCheckedChange={filterState.setOnlyAnomalies}
                  />
                </div>

                <div className="flex items-center justify-between gap-4 border-b border-[var(--pnrr-border)] py-3">
                  <Label
                    htmlFor="sheet-exclude-micro"
                    className="cursor-pointer text-sm font-bold text-[var(--pnrr-fg)]"
                  >
                    <Trans>Without micro-projects (&lt;€5k)</Trans>
                  </Label>
                  <Switch
                    id="sheet-exclude-micro"
                    checked={search.excludeMicro ?? false}
                    onCheckedChange={filterState.setExcludeMicro}
                  />
                </div>

                <div className="flex items-center justify-between gap-4 py-3">
                  <Label
                    htmlFor="sheet-include-national"
                    className="cursor-pointer text-sm font-bold text-[var(--pnrr-fg)]"
                  >
                    <Trans>Include national projects</Trans>
                  </Label>
                  <Switch
                    id="sheet-include-national"
                    checked={search.includeNational ?? true}
                    onCheckedChange={filterState.setIncludeNational}
                  />
                </div>
              </section>
            </div>
          </ScrollArea>

          {/* Sticky footer with actions */}
          <div className="border-t-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] p-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-11 min-w-0 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-2 text-xs font-black uppercase tracking-wide text-[var(--pnrr-fg)] hover:bg-[var(--pnrr-bg)] sm:text-sm"
                onClick={handleClearFilters}
              >
                <Trans>Clear all</Trans>
              </Button>
              <Button
                className="h-11 min-w-0 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-fg)] px-2 text-xs font-black uppercase tracking-wide text-[var(--pnrr-bg)] hover:bg-[var(--pnrr-card)] hover:text-[var(--pnrr-fg)] sm:text-sm"
                onClick={() => onOpenChange(false)}
              >
                <Trans>Close</Trans>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

export function PnrrFilterTriggerButton({
  activeCount,
  onClick,
}: {
  readonly activeCount: number
  readonly onClick: () => void
}) {
  return (
    <Button
      variant="outline"
      className="gap-2 relative rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-4 py-2 text-sm font-bold text-[var(--pnrr-fg)] hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)]"
      onClick={onClick}
    >
      <SlidersHorizontal className="h-4 w-4" />
      <span>
        <Trans>Filter data</Trans>
      </span>
      {activeCount > 0 && (
        <Badge
          variant="default"
          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full p-0 text-[11px] bg-[var(--pnrr-fg)] text-[var(--pnrr-bg)]"
        >
          {activeCount}
        </Badge>
      )}
    </Button>
  )
}
