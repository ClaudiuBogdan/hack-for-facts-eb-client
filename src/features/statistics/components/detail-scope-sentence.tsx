import { useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import type {
  InsDatasetDetails,
  InsDimension,
  InsPeriodicity,
} from '@/schemas/ins'
import type { StatisticsDatasetDetailSearch } from '@/schemas/statistics'
import { useDimensionValues } from '../hooks/use-dataset-detail'
import {
  classificationTypeCode,
  DIMENSION_PAGE_SIZE,
  dimensionsOfType,
  encodeTerritoryPin,
  removeClassificationPin,
  territoryPinFromValue,
  upsertClassificationPin,
  type DetailSearchPatch,
  type EffectiveScope,
} from '../lib/dataset-selection'
import { periodicityLabel } from '../lib/periodicity-labels'
import { DetailDimensionCombobox } from './detail-dimension-combobox'

export interface ScopeSegment {
  readonly id: string
  /** The visible sentence text for this segment. */
  readonly text: string
  /** True when the value is a server-resolved default, not a URL pin. */
  readonly defaulted: boolean
  /** The control rendered in the popover / sheet. Null = display-only. */
  readonly control: ReactNode
  readonly controlLabel: string
}

type Props = {
  readonly dataset: InsDatasetDetails
  readonly search: StatisticsDatasetDetailSearch
  readonly scope: EffectiveScope
  /** Display labels resolved from the fetched rows (never re-queried). */
  readonly territoryLabel: string
  readonly classificationLabels: ReadonlyMap<string, string>
  readonly unitLabel: string | null
  readonly yearSpanLabel: string | null
  readonly onChange: (patch: DetailSearchPatch) => void
}

/**
 * Tier 1 — the scope sentence IS the control surface.
 *
 * Reads „România · total · anual · 2016–2025"; every segment opens its own
 * popover on desktop. On mobile the sentence opens ONE bottom sheet holding
 * every control (never four stacked popovers). Server-resolved defaults are
 * visibly marked and are NOT written into the URL until the user changes one.
 */
export function DetailScopeSentence({
  dataset,
  search,
  scope,
  territoryLabel,
  classificationLabels,
  unitLabel,
  yearSpanLabel,
  onChange,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false)

  const segments = buildSegments({
    dataset,
    search,
    scope,
    territoryLabel,
    classificationLabels,
    unitLabel,
    yearSpanLabel,
    onChange,
  })

  if (segments.length === 0) return null

  return (
    <div className="text-sm text-muted-foreground">
      {/* Desktop: each segment is its own popover control. */}
      <div className="hidden flex-wrap items-center gap-x-1 gap-y-1.5 md:flex">
        {segments.map((segment, index) => (
          <span key={segment.id} className="flex items-center gap-1">
            {index > 0 ? <span aria-hidden>·</span> : null}
            {segment.control ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-0.5 rounded-sm px-1 py-0.5 font-medium text-foreground underline decoration-border decoration-dashed underline-offset-4 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={segment.controlLabel}
                  >
                    {segment.text}
                    {segment.defaulted ? (
                      <span className="ml-0.5 font-normal text-muted-foreground">
                        <Trans>(implicit)</Trans>
                      </span>
                    ) : null}
                    <ChevronDown className="h-3 w-3 text-muted-foreground" aria-hidden />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-80 space-y-1.5">
                  <Label>{segment.controlLabel}</Label>
                  {segment.control}
                </PopoverContent>
              </Popover>
            ) : (
              <span className="font-medium text-foreground">{segment.text}</span>
            )}
          </span>
        ))}
      </div>

      {/* Mobile: the whole sentence opens ONE bottom sheet. */}
      <div className="md:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 rounded-md border border-border/70 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="min-w-0 truncate">
                {segments.map((segment) => segment.text).join(' · ')}
              </span>
              <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden />
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>
                <Trans>Alege ce arată seria</Trans>
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-4 pb-6">
              {segments
                .filter((segment) => segment.control)
                .map((segment) => (
                  <div key={segment.id} className="space-y-1.5">
                    <Label>{segment.controlLabel}</Label>
                    {segment.control}
                  </div>
                ))}
              <Button className="w-full" onClick={() => setSheetOpen(false)}>
                <Trans>Gata</Trans>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}

function buildSegments(params: {
  readonly dataset: InsDatasetDetails
  readonly search: StatisticsDatasetDetailSearch
  readonly scope: EffectiveScope
  readonly territoryLabel: string
  readonly classificationLabels: ReadonlyMap<string, string>
  readonly unitLabel: string | null
  readonly yearSpanLabel: string | null
  readonly onChange: (patch: DetailSearchPatch) => void
}): readonly ScopeSegment[] {
  const {
    dataset,
    search,
    scope,
    territoryLabel,
    classificationLabels,
    unitLabel,
    yearSpanLabel,
    onChange,
  } = params

  const segments: ScopeSegment[] = []
  const dimensions = dataset.dimensions ?? []

  const territorialDimension = dimensionsOfType(dimensions, 'TERRITORIAL')[0]
  if (territorialDimension) {
    segments.push({
      id: 'teritoriu',
      text: territoryLabel,
      defaulted: scope.territoryDefaulted,
      controlLabel: territorialDimension.label_ro ?? t`Teritoriu`,
      control: (
        <TerritoryControl
          datasetCode={dataset.code}
          dimension={territorialDimension}
          search={search}
          onChange={onChange}
        />
      ),
    })
  }

  for (const dimension of dimensionsOfType(dimensions, 'CLASSIFICATION')) {
    const typeCode = classificationTypeCode(dimension)
    const value = scope.classifications.get(typeCode)
    if (value === undefined) continue
    segments.push({
      id: `clasificare-${typeCode}`,
      text: (classificationLabels.get(typeCode) ?? value).toLocaleLowerCase(),
      defaulted: scope.defaultedTypes.has(typeCode),
      controlLabel:
        dimension.label_ro ?? dimension.classification_type?.name_ro ?? typeCode,
      control: (
        <ClassificationControl
          datasetCode={dataset.code}
          dimension={dimension}
          search={search}
          pinnedValue={search.clasificari ? value : null}
          onChange={onChange}
        />
      ),
    })
  }

  const unitDimension = dimensionsOfType(dimensions, 'UNIT_OF_MEASURE')[0]
  if (unitDimension && unitLabel) {
    const multipleUnits = (unitDimension.option_count ?? 0) > 1
    segments.push({
      id: 'unitate',
      text: unitLabel.toLocaleLowerCase(),
      defaulted: scope.unitDefaulted && multipleUnits,
      controlLabel: unitDimension.label_ro ?? t`Unitate de măsură`,
      control: multipleUnits ? (
        <UnitControl
          datasetCode={dataset.code}
          dimension={unitDimension}
          search={search}
          onChange={onChange}
        />
      ) : null,
    })
  }

  if (scope.periodicity) {
    const periodicities = dataset.periodicity ?? []
    segments.push({
      id: 'frecventa',
      text: periodicityLabel(scope.periodicity),
      defaulted: !search.frecventa && periodicities.length > 1,
      controlLabel: t`Frecvență`,
      control:
        periodicities.length > 1 ? (
          <Select
            value={scope.periodicity}
            onValueChange={(value) =>
              onChange({ frecventa: value as InsPeriodicity })
            }
          >
            <SelectTrigger className="h-10" aria-label={t`Frecvență`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodicities.map((periodicity) => (
                <SelectItem key={periodicity} value={periodicity}>
                  {periodicityLabel(periodicity)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null,
    })
  }

  if (yearSpanLabel) {
    segments.push({
      id: 'interval',
      text: yearSpanLabel,
      defaulted: search.din === undefined && search.pana === undefined,
      controlLabel: t`Interval de ani`,
      control: (
        <YearWindowControl search={search} onChange={onChange} />
      ),
    })
  }

  return segments
}

function TerritoryControl({
  datasetCode,
  dimension,
  search,
  onChange,
}: {
  readonly datasetCode: string
  readonly dimension: InsDimension
  readonly search: StatisticsDatasetDetailSearch
  readonly onChange: (patch: DetailSearchPatch) => void
}) {
  return (
    <DetailDimensionCombobox
      datasetCode={datasetCode}
      dimensionIndex={dimension.index}
      label=""
      placeholder={t`Caută un teritoriu`}
      selectedKey={search.teritoriu ?? null}
      selectedLabel={search.teritoriu ?? null}
      optionKey={(value) => {
        const pin = value.territory ? territoryPinFromValue(value.territory) : null
        return pin ? encodeTerritoryPin(pin) : null
      }}
      onSelect={(value) => {
        const pin = value.territory ? territoryPinFromValue(value.territory) : null
        if (pin) onChange({ teritoriu: encodeTerritoryPin(pin) })
      }}
      onClear={() => onChange({ teritoriu: undefined })}
    />
  )
}

function ClassificationControl({
  datasetCode,
  dimension,
  search,
  pinnedValue,
  onChange,
}: {
  readonly datasetCode: string
  readonly dimension: InsDimension
  readonly search: StatisticsDatasetDetailSearch
  readonly pinnedValue: string | null
  readonly onChange: (patch: DetailSearchPatch) => void
}) {
  const typeCode = classificationTypeCode(dimension)

  return (
    <DetailDimensionCombobox
      datasetCode={datasetCode}
      dimensionIndex={dimension.index}
      label=""
      placeholder={t`Alege o valoare`}
      selectedKey={pinnedValue}
      selectedLabel={pinnedValue}
      optionKey={(value) => value.classification_value?.code ?? null}
      onSelect={(value) => {
        const code = value.classification_value?.code
        if (!code) return
        onChange({
          clasificari: [
            ...upsertClassificationPin(search.clasificari, {
              type: typeCode,
              value: code,
            }),
          ] as [string, ...string[]],
        })
      }}
      onClear={() => {
        const next = removeClassificationPin(search.clasificari, typeCode)
        onChange({
          clasificari:
            next.length > 0 ? ([...next] as [string, ...string[]]) : undefined,
        })
      }}
    />
  )
}

function UnitControl({
  datasetCode,
  dimension,
  search,
  onChange,
}: {
  readonly datasetCode: string
  readonly dimension: InsDimension
  readonly search: StatisticsDatasetDetailSearch
  readonly onChange: (patch: DetailSearchPatch) => void
}) {
  const unitsQuery = useDimensionValues({
    datasetCode,
    dimensionIndex: dimension.index,
    search: undefined,
    limit: DIMENSION_PAGE_SIZE,
    offset: 0,
    enabled: true,
  })
  const units = unitsQuery.data?.nodes ?? []

  return (
    <Select
      value={search.unitate ?? ''}
      onValueChange={(value) => onChange({ unitate: value })}
    >
      <SelectTrigger className="h-10" aria-label={t`Unitate de măsură`}>
        <SelectValue placeholder={t`Alege o unitate`} />
      </SelectTrigger>
      <SelectContent>
        {units.map((unit) =>
          unit.unit?.code ? (
            <SelectItem key={unit.nom_item_id} value={unit.unit.code}>
              {unit.unit?.name_ro ?? unit.unit?.symbol ?? unit.label_ro ?? unit.unit.code}
            </SelectItem>
          ) : null,
        )}
      </SelectContent>
    </Select>
  )
}

/**
 * Bounded free inputs, not selects: the observed span is data-derived and can
 * be wide. Clearing both returns to the full observed window.
 */
function YearWindowControl({
  search,
  onChange,
}: {
  readonly search: StatisticsDatasetDetailSearch
  readonly onChange: (patch: DetailSearchPatch) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        inputMode="numeric"
        className="h-10 w-24 rounded-md border border-input bg-background px-3 text-sm tabular-nums"
        aria-label={t`An de început`}
        placeholder={t`din`}
        value={search.din ?? ''}
        onChange={(event) => {
          const value = Number.parseInt(event.target.value, 10)
          onChange({ din: Number.isFinite(value) ? value : undefined })
        }}
      />
      <span aria-hidden>–</span>
      <input
        type="number"
        inputMode="numeric"
        className="h-10 w-24 rounded-md border border-input bg-background px-3 text-sm tabular-nums"
        aria-label={t`An de sfârșit`}
        placeholder={t`până în`}
        value={search.pana ?? ''}
        onChange={(event) => {
          const value = Number.parseInt(event.target.value, 10)
          onChange({ pana: Number.isFinite(value) ? value : undefined })
        }}
      />
      {search.din !== undefined || search.pana !== undefined ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={() => onChange({ din: undefined, pana: undefined })}
        >
          <Trans>Resetează</Trans>
        </Button>
      ) : null}
    </div>
  )
}
