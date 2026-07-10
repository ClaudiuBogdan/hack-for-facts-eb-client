import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
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
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { INS_ROOT_CONTEXTS } from '@/lib/ins/ins-metric-registry'
import type { StatisticsDatasetExplorerSearch } from '@/schemas/statistics'
import {
  EXPLORER_PERIODICITY_VALUES,
  explorerPeriodicityLabel,
  type ExplorerPeriodicity,
} from '../../lib/explorer-chips'
import { countActiveExplorerFilters } from '../../lib/explorer-filter'

/** Sentinel for "no context filter" — shadcn `SelectItem` forbids an empty value. */
const ALL_CONTEXTS = 'all'

type Props = {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly search: StatisticsDatasetExplorerSearch
  readonly onChange: (next: StatisticsDatasetExplorerSearch) => void
}

/**
 * Side panel holding the secondary filters. Every control auto-applies: there
 * is no "Apply" button, and closing the sheet never discards a selection.
 *
 * The status filter lives outside this sheet on purpose — see
 * `DatasetExplorerStatusToggle`.
 */
export function DatasetExplorerFilterSheet({
  open,
  onOpenChange,
  search,
  onChange,
}: Props) {
  const activeCount = countActiveExplorerFilters(search)

  // A filter change invalidates the current offset.
  const apply = (patch: Partial<StatisticsDatasetExplorerSearch>) => {
    onChange({ ...search, ...patch, pagina: undefined })
  }

  const togglePeriodicity = (value: ExplorerPeriodicity, checked: boolean) => {
    const current = search.frecventa ?? []
    const next = checked
      ? [...current, value]
      : current.filter((entry) => entry !== value)
    apply({
      frecventa:
        next.length > 0
          ? (next as unknown as NonNullable<
              StatisticsDatasetExplorerSearch['frecventa']
            >)
          : undefined,
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-6 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            <Trans>Filtre</Trans>
          </SheetTitle>
          <SheetDescription>
            <Trans>Filtrele se aplică imediat. Adresa paginii le păstrează.</Trans>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto">
          <fieldset className="space-y-2">
            <Label htmlFor="explorer-context">
              <Trans>Temă</Trans>
            </Label>
            <Select
              value={search.context ?? ALL_CONTEXTS}
              onValueChange={(value) =>
                apply({ context: value === ALL_CONTEXTS ? undefined : value })
              }
            >
              <SelectTrigger id="explorer-context" aria-label={t`Temă`}>
                <SelectValue placeholder={t`Toate temele`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CONTEXTS}>{t`Toate temele`}</SelectItem>
                {INS_ROOT_CONTEXTS.map((context) => (
                  <SelectItem key={context.code} value={context.code}>
                    {context.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">
              <Trans>Periodicitate</Trans>
            </legend>
            {EXPLORER_PERIODICITY_VALUES.map((value) => {
              const id = `explorer-periodicity-${value.toLowerCase()}`
              return (
                <div key={value} className="flex items-center gap-2">
                  <Checkbox
                    id={id}
                    checked={(search.frecventa ?? []).includes(value)}
                    onCheckedChange={(checked) =>
                      togglePeriodicity(value, checked === true)
                    }
                  />
                  <Label htmlFor={id} className="font-normal">
                    {explorerPeriodicityLabel(value)}
                  </Label>
                </div>
              )
            })}
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">
              <Trans>Acoperire</Trans>
            </legend>
            <div className="flex items-center gap-2">
              <Checkbox
                id="explorer-coverage-uat"
                checked={search.uat === true}
                onCheckedChange={(checked) =>
                  apply({ uat: checked === true ? true : undefined })
                }
              />
              <Label htmlFor="explorer-coverage-uat" className="font-normal">
                <Trans>Date la nivel de UAT</Trans>
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="explorer-coverage-judet"
                checked={search.judet === true}
                onCheckedChange={(checked) =>
                  apply({ judet: checked === true ? true : undefined })
                }
              />
              <Label htmlFor="explorer-coverage-judet" className="font-normal">
                <Trans>Date la nivel de județ</Trans>
              </Label>
            </div>
          </fieldset>
        </div>

        <SheetFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={activeCount === 0}
            onClick={() =>
              apply({
                context: undefined,
                frecventa: undefined,
                uat: undefined,
                judet: undefined,
              })
            }
          >
            <Trans>Șterge filtrele</Trans>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
