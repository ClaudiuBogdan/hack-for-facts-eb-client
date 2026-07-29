import { useState } from 'react'
import type { ParliamentMembersSearch } from '@/schemas/parliament'
import { getPanelFilterCount } from '../lib/member-search'
import { MembersActiveFilters } from './members-active-filters'
import { FindRepDialog, FindRepTriggerButton } from './find-rep-dialog'
import { MembersFilterSheet } from './members-filter-sheet'
import { FilterTriggerButton } from './parliament-filter-trigger-button'
import { ParliamentDebouncedSearchInput } from './parliament-debounced-search-input'
import { ParliamentListToolbar } from './parliament-list-surface'

type Props = {
  readonly search: ParliamentMembersSearch
  readonly onSearchChange: (search: ParliamentMembersSearch) => void
  readonly filterSheetOpen?: boolean
  readonly onFilterSheetOpenChange?: (open: boolean) => void
  readonly findRepOpen?: boolean
  readonly onFindRepOpenChange?: (open: boolean) => void
}

/**
 * The members directory's control row — the shared list toolbar, with the
 * "find my representative" dialog as the one control this surface has that the
 * others do not.
 *
 * The search box used to be a hand-rolled input under a visible uppercase
 * label, with its own debounce timer; both are now the parliament-wide
 * `ParliamentDebouncedSearchInput`, so a reader moving between the six tabs
 * meets one search field rather than four.
 */
export function MembersFilters({
  search,
  onSearchChange,
  filterSheetOpen,
  onFilterSheetOpenChange,
  findRepOpen,
  onFindRepOpenChange,
}: Props) {
  const [internalFilterSheetOpen, setInternalFilterSheetOpen] = useState(false)
  const [internalFindRepOpen, setInternalFindRepOpen] = useState(false)
  const isFilterSheetOpen = filterSheetOpen ?? internalFilterSheetOpen
  const setFilterSheetOpen = onFilterSheetOpenChange ?? setInternalFilterSheetOpen
  const isFindRepOpen = findRepOpen ?? internalFindRepOpen
  const setFindRepOpen = onFindRepOpenChange ?? setInternalFindRepOpen

  const handleClearAll = () => {
    onSearchChange({
      tab: 'grupuri',
      page: 1,
    })
  }

  const panelFilterCount = getPanelFilterCount(search)

  return (
    <>
      <ParliamentListToolbar
        chips={
          <MembersActiveFilters
            search={search}
            onSearchChange={onSearchChange}
            onClearAll={handleClearAll}
          />
        }
      >
        <ParliamentDebouncedSearchInput
          inputId="member-search"
          ariaLabel="Caută după nume"
          placeholder="Nume parlamentar…"
          value={search.q}
          onCommit={(next) => onSearchChange({ ...search, q: next, page: 1 })}
          className="flex-1"
        />
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
          <FindRepTriggerButton
            className="w-full sm:w-auto"
            onClick={() => setFindRepOpen(true)}
          />
          <FilterTriggerButton
            activeCount={panelFilterCount}
            className="w-full sm:w-auto"
            onClick={() => setFilterSheetOpen(true)}
            ariaLabel={
              panelFilterCount > 0
                ? `Filtrează parlamentarii, ${panelFilterCount} filtre active`
                : 'Filtrează parlamentarii'
            }
          />
        </div>
      </ParliamentListToolbar>

      <MembersFilterSheet
        open={isFilterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        search={search}
        onSearchChange={onSearchChange}
      />

      <FindRepDialog
        open={isFindRepOpen}
        onOpenChange={setFindRepOpen}
        onApply={(updates) =>
          onSearchChange({
            ...search,
            ...updates,
            tab: 'grupuri',
            page: 1,
            find: undefined,
          })
        }
      />
    </>
  )
}
