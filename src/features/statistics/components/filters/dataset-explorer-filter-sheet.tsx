import { Trans } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { StatisticsDatasetExplorerSearch, StatisticsLandingCatalog } from '@/schemas/statistics'
import type {
  StatisticsContextIndex,
  StatisticsContextTreeNode,
} from '../../lib/context-tree'
import { countActiveExplorerFilters } from '../../lib/explorer-filter'
import { DatasetExplorerFilterControls } from './dataset-explorer-filter-controls'

type Props = {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly search: StatisticsDatasetExplorerSearch
  readonly onChange: (next: StatisticsDatasetExplorerSearch) => void
  readonly catalog?: StatisticsLandingCatalog
  readonly contextRoots: readonly StatisticsContextTreeNode[]
  readonly contextIndex: StatisticsContextIndex
}

/**
 * The phone home of the filters: the same controls the desktop rail shows,
 * in a side panel. Every control auto-applies; closing never discards a
 * selection.
 */
export function DatasetExplorerFilterSheet({
  open,
  onOpenChange,
  search,
  onChange,
  catalog,
  contextRoots,
  contextIndex,
}: Props) {
  const activeCount = countActiveExplorerFilters(search)

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

        <div className="flex-1 overflow-y-auto">
          <DatasetExplorerFilterControls
            search={search}
            onChange={onChange}
            catalog={catalog}
            contextRoots={contextRoots}
            contextIndex={contextIndex}
            idPrefix="sheet"
          />
        </div>

        <SheetFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={activeCount === 0}
            onClick={() =>
              onChange({ ...search, context: undefined, frecventa: undefined, uat: undefined, judet: undefined, pagina: undefined })
            }
          >
            <Trans>Șterge filtrele</Trans>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
