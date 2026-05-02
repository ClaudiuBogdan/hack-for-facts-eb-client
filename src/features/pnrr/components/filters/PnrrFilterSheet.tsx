import { useMemo, useState, useEffect } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import type { PnrrBeneficiaryType, PnrrProject } from '@/schemas/pnrr'
import type { usePnrrFilterState } from '../../hooks/usePnrrFilterState'
import { getActiveFilterCount } from '../../lib/data-transform'
import { Input } from '@/components/ui/input'
import type { Option } from '@/components/ui/multi-select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PnrrStyledMultiSelect, type PnrrFilterOption } from './PnrrStyledMultiSelect'
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

const SEARCH_DEBOUNCE_MS = 300

const PROGRESS_OPTIONS: Option[] = Object.entries(PROGRESS_CATEGORY_LABELS).map(
  ([value, label]) => ({ value, label })
)

const ANOMALY_TYPE_OPTIONS: Option[] = ANOMALY_CONFIG.map((cfg) => ({
  value: cfg.type,
  label: cfg.shortDescription,
}))

const DATA_QUALITY_SIGNAL_OPTIONS: Option[] = DATA_QUALITY_SIGNAL_CONFIG.map((cfg) => ({
  value: cfg.type,
  label: cfg.shortDescription,
}))

const FILTER_LABEL_CLASS = 'text-xs font-black uppercase tracking-wide text-[var(--pnrr-muted)]'
const FILTER_INPUT_CLASS = 'h-11 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] pl-10 pr-9 text-sm font-semibold text-[var(--pnrr-fg)] placeholder:text-[var(--pnrr-muted)] focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]'
const FILTER_TOGGLE_ITEM_CLASS = 'h-10 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-4 text-sm font-black text-[var(--pnrr-fg)] transition-colors hover:bg-[var(--pnrr-bg)] data-[state=on]:bg-[var(--pnrr-fg)] data-[state=on]:text-[var(--pnrr-bg)]'

interface PnrrFilterSheetProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly projects: readonly PnrrProject[]
  readonly filterState: ReturnType<typeof usePnrrFilterState>
  readonly showTrigger?: boolean
}

export function PnrrFilterSheet({ open, onOpenChange, projects, filterState, showTrigger = true }: PnrrFilterSheetProps) {
  const search = filterState.search
  const setSearch = filterState.setSearch
  const setBeneficiarySearch = filterState.setBeneficiarySearch
  const setBeneficiaryCui = filterState.setBeneficiaryCui

  // Local debounced state for search inputs
  const globalSearch = search.search ?? ''
  const globalBeneficiarySearch = search.beneficiarySearch ?? ''
  const globalBeneficiaryCui = search.beneficiaryCui ?? ''
  const [projectInput, setProjectInput] = useState(globalSearch)
  const [beneficiaryInput, setBeneficiaryInput] = useState(globalBeneficiarySearch)
  const [beneficiaryCuiInput, setBeneficiaryCuiInput] = useState(globalBeneficiaryCui)

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
    const codes = Array.from(new Set(projects.map((p) => p.componentCode))).sort()
    return codes.map<Option>((code) => ({
      value: code,
      label: `${code} — ${PNRR_COMPONENTS[code]?.nameRo ?? code}`,
    }))
  }, [projects])

  const countyOptions = useMemo(() => {
    const counties = Array.from(new Set(projects.map((p) => p.county))).sort()
    return counties.map<Option>((c) => ({ value: c, label: c }))
  }, [projects])

  const uatOptions = useMemo(() => {
    const uats = new Map<string, { readonly name: string; readonly county: string }>()

    for (const project of projects) {
      if (!project.sirutaCode || !project.locality || project.county === 'Național') continue

      const existing = uats.get(project.sirutaCode)
      if (!existing || project.locality.localeCompare(existing.name, 'ro') < 0) {
        uats.set(project.sirutaCode, {
          name: project.locality,
          county: project.county,
        })
      }
    }

    return Array.from(uats.entries())
      .map<PnrrFilterOption>(([siruta, uat]) => ({
        value: siruta,
        label: uat.name,
        description: uat.county,
      }))
      .sort((a, b) => {
        const countyCompare = (a.description ?? '').localeCompare(b.description ?? '', 'ro')
        return countyCompare || a.label.localeCompare(b.label, 'ro')
      })
  }, [projects])

  const measureOptions = useMemo(() => {
    const allOptions = getAllMeasureOptions()
    // Only include measures that actually exist in the project data
    const projectMeasureKeys = new Set(
      projects.map((p) => `${p.componentCode}.${p.measureCode}.${p.fundingSource === 'grant/loan' ? 'grant' : p.fundingSource}`)
    )
    return allOptions
      .filter((opt) => projectMeasureKeys.has(opt.value))
      .map<Option>((opt) => ({ value: opt.value, label: opt.label }))
  }, [projects])

  const criOptions = useMemo(() => {
    const cris = Array.from(new Set(projects.map((p) => p.cri))).sort()
    return cris.map<Option>((c) => ({
      value: c,
      label: PNRR_CRIS[c]?.nameRo ? `${c} — ${PNRR_CRIS[c].nameRo}` : c,
    }))
  }, [projects])

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
          className="flex w-full flex-col overflow-hidden border-l-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] p-0 sm:max-w-xl [&>button.absolute]:right-5 [&>button.absolute]:top-5 [&>button.absolute]:h-8 [&>button.absolute]:w-8 [&>button.absolute]:rounded-none [&>button.absolute]:bg-transparent [&>button.absolute]:opacity-100 [&>button.absolute]:ring-offset-0 [&>button.absolute]:hover:bg-[var(--pnrr-card)] [&>button.absolute]:focus:ring-[var(--pnrr-blue)]"
        >
          <SheetHeader className="border-b-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] p-6 pr-14 text-left">
            <SheetTitle className="text-left text-4xl font-black leading-none tracking-tight text-[var(--pnrr-fg)]">
              <Trans>Filtre avansate</Trans>
            </SheetTitle>
            <SheetDescription className="pt-1 text-left text-base font-bold text-[var(--pnrr-muted)]">
              <Trans>{activeCount} filtre active</Trans>
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="space-y-6 p-6">
              <section className="space-y-5">
                <div className="space-y-2">
                  <Label className={FILTER_LABEL_CLASS}><Trans>UAT</Trans></Label>
                  <PnrrStyledMultiSelect
                    options={uatOptions}
                    selected={search.uatSirutas ?? (search.uatSiruta ? [search.uatSiruta] : [])}
                    onChange={filterState.setUatFilters}
                    placeholder={t`Alege UAT...`}
                  />
                </div>

                <div className="space-y-2">
                  <Label className={FILTER_LABEL_CLASS}><Trans>Județe</Trans></Label>
                  <PnrrStyledMultiSelect
                    options={countyOptions}
                    selected={search.counties ?? []}
                    onChange={filterState.setCounties}
                    placeholder={t`Alege județe...`}
                  />
                </div>
              </section>

              <div className="border-t-2 border-[var(--pnrr-border)]" />

              {/* Project Search */}
              <section className="space-y-2">
                <Label className={FILTER_LABEL_CLASS}><Trans>Căutare proiect</Trans></Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--pnrr-muted)]" />
                  <Input
                    placeholder={t`Titlu, beneficiar, CUI sau localitate...`}
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
                <Label className={FILTER_LABEL_CLASS}><Trans>CUI beneficiar</Trans></Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--pnrr-muted)]" />
                  <Input
                    inputMode="numeric"
                    placeholder={t`CUI exact...`}
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
                <Label className={FILTER_LABEL_CLASS}><Trans>Căutare beneficiar</Trans></Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--pnrr-muted)]" />
                  <Input
                    placeholder={t`Nume beneficiar...`}
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
                <Label className={FILTER_LABEL_CLASS}><Trans>Tip beneficiar</Trans></Label>
                <PnrrStyledMultiSelect
                  options={BENEFICIARY_TYPE_OPTIONS}
                  selected={search.beneficiaryTypes ?? []}
                  onChange={(values) => filterState.setBeneficiaryTypes(values as PnrrBeneficiaryType[])}
                  placeholder={t`Alege tip beneficiar...`}
                />
              </section>

              <div className="border-t-2 border-[var(--pnrr-border)]" />

              <section className="space-y-5">
                {/* Components */}
                <div className="space-y-2">
                  <Label className={FILTER_LABEL_CLASS}><Trans>Componente PNRR</Trans></Label>
                  <PnrrStyledMultiSelect
                    options={componentOptions}
                    selected={search.components ?? []}
                    onChange={filterState.setComponents}
                    placeholder={t`Alege componente...`}
                  />
                </div>

                {/* Measures */}
                <div className="space-y-2">
                  <Label className={FILTER_LABEL_CLASS}><Trans>Cod măsură</Trans></Label>
                  <PnrrStyledMultiSelect
                    options={measureOptions}
                    selected={search.measures ?? []}
                    onChange={filterState.setMeasures}
                    placeholder={t`Alege măsuri...`}
                  />
                </div>

                {/* CRIs */}
                <div className="space-y-2">
                  <Label className={FILTER_LABEL_CLASS}><Trans>Instituții responsabile (CRI)</Trans></Label>
                  <PnrrStyledMultiSelect
                    options={criOptions}
                    selected={search.cris ?? []}
                    onChange={filterState.setCris}
                    placeholder={t`Alege instituții...`}
                  />
                </div>
              </section>

              <div className="border-t-2 border-[var(--pnrr-border)]" />

              {/* Funding sources */}
              <section className="space-y-3">
                <Label className={FILTER_LABEL_CLASS}><Trans>Sursă finanțare</Trans></Label>
                <ToggleGroup
                  type="multiple"
                  value={search.fundingSources ?? []}
                  onValueChange={(v) =>
                    filterState.setFundingSources(v as ('grant' | 'loan' | 'grant/loan')[])
                  }
                  className="flex flex-wrap justify-start gap-2"
                >
                  <ToggleGroupItem value="grant" className={FILTER_TOGGLE_ITEM_CLASS}>
                    <Trans>Grant</Trans>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="loan" className={FILTER_TOGGLE_ITEM_CLASS}>
                    <Trans>Împrumut</Trans>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="grant/loan" className={FILTER_TOGGLE_ITEM_CLASS}>
                    <Trans>Grant + Împrumut</Trans>
                  </ToggleGroupItem>
                </ToggleGroup>
              </section>

              {/* Progress */}
              <section className="space-y-2">
                <Label className={FILTER_LABEL_CLASS}><Trans>Stadiu implementare</Trans></Label>
                <PnrrStyledMultiSelect
                  options={PROGRESS_OPTIONS}
                  selected={search.progressCategories ?? []}
                  onChange={(v) => filterState.setProgressCategories(v as ProgressCategoryKey[])}
                  placeholder={t`Alege stadiu...`}
                />
              </section>

              <div className="border-t-2 border-[var(--pnrr-border)]" />

              {/* Anomaly types */}
              <section className="space-y-2">
                <Label className={FILTER_LABEL_CLASS}><Trans>Tip risc</Trans></Label>
                <PnrrStyledMultiSelect
                  options={ANOMALY_TYPE_OPTIONS}
                  selected={search.anomalyTypes ?? []}
                  onChange={filterState.setAnomalyTypes}
                  placeholder={t`Alege tip risc...`}
                />
              </section>

              {/* Data quality signal types */}
              <section className="space-y-2">
                <Label className={FILTER_LABEL_CLASS}><Trans>Calitatea datelor</Trans></Label>
                <PnrrStyledMultiSelect
                  options={DATA_QUALITY_SIGNAL_OPTIONS}
                  selected={search.dataQualitySignalTypes ?? []}
                  onChange={filterState.setDataQualitySignalTypes}
                  placeholder={t`Alege semnal de date...`}
                />
              </section>

              <div className="border-t-2 border-[var(--pnrr-border)]" />

              {/* Toggles */}
              <section className="space-y-0">
                <div className="flex items-center justify-between gap-4 border-b border-[var(--pnrr-border)] py-3">
                  <Label htmlFor="sheet-only-anomalies" className="cursor-pointer text-sm font-bold text-[var(--pnrr-fg)]">
                    <Trans>Doar proiecte cu riscuri</Trans>
                  </Label>
                  <Switch
                    id="sheet-only-anomalies"
                    checked={search.onlyAnomalies ?? false}
                    onCheckedChange={filterState.setOnlyAnomalies}
                  />
                </div>

                <div className="flex items-center justify-between gap-4 border-b border-[var(--pnrr-border)] py-3">
                  <Label htmlFor="sheet-exclude-micro" className="cursor-pointer text-sm font-bold text-[var(--pnrr-fg)]">
                    <Trans>Fără micro-proiecte (&lt;€5k)</Trans>
                  </Label>
                  <Switch
                    id="sheet-exclude-micro"
                    checked={search.excludeMicro ?? false}
                    onCheckedChange={filterState.setExcludeMicro}
                  />
                </div>

                <div className="flex items-center justify-between gap-4 py-3">
                  <Label htmlFor="sheet-include-national" className="cursor-pointer text-sm font-bold text-[var(--pnrr-fg)]">
                    <Trans>Include proiecte naționale</Trans>
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
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="h-11 flex-1 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] text-sm font-black uppercase tracking-wide text-[var(--pnrr-fg)] hover:bg-[var(--pnrr-bg)]"
                onClick={filterState.clearFilters}
              >
                <Trans>Șterge toate</Trans>
              </Button>
              <Button
                className="h-11 flex-1 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-fg)] text-sm font-black uppercase tracking-wide text-[var(--pnrr-bg)] hover:bg-[var(--pnrr-card)] hover:text-[var(--pnrr-fg)]"
                onClick={() => onOpenChange(false)}
              >
                <Trans>Închide</Trans>
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
      <span><Trans>Filter data</Trans></span>
      {activeCount > 0 && (
        <Badge variant="default" className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full p-0 text-[11px] bg-[var(--pnrr-fg)] text-[var(--pnrr-bg)]">
          {activeCount}
        </Badge>
      )}
    </Button>
  )
}
