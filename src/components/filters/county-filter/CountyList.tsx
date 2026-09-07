import { useState } from 'react'
import { BaseListProps } from '../base-filter/interfaces'
import { ListContainer } from '../base-filter/ListContainer'
import { ListOption } from '../base-filter/ListOption'
import { cn } from '@/lib/utils'
import { SearchInput } from '../base-filter/SearchInput'
import { useMultiSelectInfinite } from '../base-filter/hooks/useMultiSelectInfinite'
import { fetchCountyOptions } from '@/lib/api/reference-lookups'
import { ErrorDisplay } from '../base-filter/ErrorDisplay'
import { t } from '@lingui/core/macro'

type CountyOption = {
  county_code: string
  county_name: string
}

export function CountyList({ selectedOptions, toggleSelect, pageSize = 100, className }: BaseListProps) {
  const [searchFilter, setSearchFilter] = useState('')

  const {
    items,
    parentRef,
    rowVirtualizer,
    isLoading,
    isError,
    error,
    refetch,
    isFetchingNextPage,
  } = useMultiSelectInfinite<CountyOption>({
    itemSize: 48,
    queryKey: ['native-counties', searchFilter],
    queryFn: ({ pageParam, signal }) => fetchCountyOptions({ search: searchFilter, offset: pageParam, limit: pageSize, signal }),
  })

  const showNoResults = !isLoading && !isError && items.length === 0 && searchFilter.length > 0
  const isEmpty = !isLoading && !isError && items.length === 0 && !searchFilter

  return (
    <div className={cn('w-full flex flex-col space-y-3', className)}>
      <SearchInput onChange={setSearchFilter} placeholder={t`Search counties...`} initialValue={searchFilter} />

      {isError && error && <ErrorDisplay error={error as Error} refetch={refetch} title={t`Could Not Load Counties`} />}

      {!isError && (
        <ListContainer
          ref={parentRef}
          height={rowVirtualizer.getTotalSize()}
          isFetchingNextPage={isFetchingNextPage}
          isLoading={isLoading}
          isSearchResultsEmpty={showNoResults}
          isEmpty={isEmpty}
          className="min-h-[10rem]"
        >
          {rowVirtualizer.getVirtualItems().length > 0
            ? rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const option = items[virtualRow.index]
                if (!option) return null
                const isSelected = selectedOptions.some((item) => item.id === option.county_code)
                const label = `${option.county_name} (${option.county_code})`
                return (
                  <ListOption
                    key={option.county_code}
                    uniqueIdPart={option.county_code}
                    onClick={() => toggleSelect({ id: option.county_code, label })}
                    label={label}
                    selected={isSelected}
                    optionHeight={virtualRow.size}
                    optionStart={virtualRow.start}
                  />
                )
              })
            : null}
        </ListContainer>
      )}
    </div>
  )
}


