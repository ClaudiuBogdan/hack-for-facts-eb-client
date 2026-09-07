import { useMultiSelectInfinite } from '../base-filter/hooks/useMultiSelectInfinite';
import { fetchUatOptions } from '@/lib/api/reference-lookups';
import { useState } from 'react';
import { SearchInput } from '../base-filter/SearchInput';
import { BaseListProps } from '../base-filter/interfaces';
import { ErrorDisplay } from '../base-filter/ErrorDisplay';
import { ListContainer } from '../base-filter/ListContainer';
import { ListOption } from '../base-filter/ListOption';
import { cn } from '@/lib/utils';
import { t } from '@lingui/core/macro';

export interface UatOption {
    id: string;
    name: string;
    county_code: string;
    county_name: string;
}

export function UatList({
    selectedOptions,
    toggleSelect,
    pageSize = 100,
    className,
}: BaseListProps) {
    const [searchFilter, setSearchFilter] = useState("");
    const {
        items,
        parentRef, // This ref needs to be passed to the scrollable element in FilterContainer
        rowVirtualizer,
        isLoading,
        isError,
        error,
        refetch,
        isFetchingNextPage,
    } = useMultiSelectInfinite<UatOption, string>({
        itemSize: 48,
        initialPageParam: '',
        queryKey: ['native-uats', searchFilter],
        queryFn: ({ pageParam, signal }) => fetchUatOptions({ search: searchFilter, after: pageParam, limit: pageSize, signal }),
    });

    const showNoResults = !isLoading && !isError && items.length === 0 && searchFilter.length > 0;
    const isEmpty = !isLoading && !isError && items.length === 0 && !searchFilter;
    return (
        <div className={cn("w-full flex flex-col space-y-3", className)}>
            <SearchInput
                onChange={setSearchFilter}
                placeholder={t`Search UATs (ex: Municipiul Arad)`}
                initialValue={searchFilter}
            />

            {isError && error && (
                <ErrorDisplay
                    error={error as Error}
                    refetch={refetch}
                    title={t`Could Not Load UATs`}
                />
            )}

            {!isError && (
                <ListContainer
                    ref={parentRef}
                    height={rowVirtualizer.getTotalSize()}
                    isFetchingNextPage={isFetchingNextPage}
                    isLoading={isLoading}
                    isSearchResultsEmpty={showNoResults}
                    isEmpty={isEmpty}
                    className="min-h-[10rem]" // Ensure a minimum height
                >
                    {rowVirtualizer.getVirtualItems().length > 0 ? (
                        rowVirtualizer.getVirtualItems().map(virtualRow => {
                            const option = items[virtualRow.index];
                            // It's good practice to ensure option exists, though virtualizer count should match items.length
                            if (!option) return null;
                            const isSelected = selectedOptions.some(item => item.id === option.id);
                            const countyLabel = `(Jud. ${option.county_name})`;
                            const label = `${option.name} ${countyLabel}`;
                            return (
                                <ListOption
                                    key={option.id}
                                    uniqueIdPart={option.id}
                                    onClick={() => toggleSelect({ id: option.id, label })}
                                    label={label}
                                    selected={isSelected}
                                    optionHeight={virtualRow.size}
                                    optionStart={virtualRow.start}
                                    className="data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
                                />
                            );
                        })
                    ) : null}
                </ListContainer>
            )}
        </div>
    );
}
