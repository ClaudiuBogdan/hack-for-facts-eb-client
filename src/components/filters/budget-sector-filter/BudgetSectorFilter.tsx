import { useMultiSelectInfinite } from '../base-filter/hooks/useMultiSelectInfinite';
import { graphqlQuery } from '@/lib/graphql/graphql-client';
import { useState } from 'react';
import { SearchInput } from '../base-filter/SearchInput';
import { BaseListProps, PageData } from '../base-filter/interfaces';
import { ErrorDisplay } from '../base-filter/ErrorDisplay';
import { ListContainer } from '../base-filter/ListContainer';
import { ListOption } from '../base-filter/ListOption';
import { cn } from '@/lib/utils';
import { t } from '@lingui/core/macro';

export interface BudgetSectorOption {
    sector_id: string;
    sector_description: string;
}

export function BudgetSectorList({
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
    } = useMultiSelectInfinite<BudgetSectorOption>({
        itemSize: 48,
        queryKey: ['native-budget-sectors', searchFilter],
        queryFn: async ({ pageParam = 0, signal }): Promise<PageData<BudgetSectorOption>> => {
            const query = `
              query BudgetSectors($search: String!, $limit: Int!, $offset: Int!) {
                budgetSectors(filter: { search: $search }, limit: $limit, offset: $offset) {
                    nodes { 
                        sector_id
                        sector_description
                    }
                  pageInfo { totalCount hasNextPage hasPreviousPage }
                }
              }
            `;
            const limit = pageSize;
            const variables = { search: searchFilter, limit, offset: pageParam };
            const response = await graphqlQuery<{
                budgetSectors: { nodes: BudgetSectorOption[]; pageInfo: { totalCount: number; hasNextPage: boolean; hasPreviousPage: boolean } };
            }>(query, variables, { signal, auth: 'none' });
            return {
                nodes: response.budgetSectors.nodes,
                pageInfo: response.budgetSectors.pageInfo,
                nextOffset: pageParam + response.budgetSectors.nodes.length,
            };
        }
    });

    const showNoResults = !isLoading && !isError && items.length === 0 && searchFilter.length > 0;
    const isEmpty = !isLoading && !isError && items.length === 0 && !searchFilter;
    return (
        <div className={cn("w-full flex flex-col space-y-3", className)}>
            <SearchInput
                onChange={setSearchFilter}
                placeholder={t`Search budget sectors`}
                initialValue={searchFilter}
            />

            {isError && error && (
                <ErrorDisplay
                    error={error as Error}
                    refetch={refetch}
                    title={t`Could Not Load Budget Sectors`}
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
                            const isSelected = selectedOptions.some(item => item.id === option.sector_id);
                            const label = `${option.sector_description}`;
                            return (
                                <ListOption
                                    key={option.sector_id}
                                    uniqueIdPart={option.sector_id}
                                    onClick={() => {
                                        toggleSelect({ id: option.sector_id, label })
                                    }}
                                    label={label}
                                    selected={isSelected}
                                    optionHeight={virtualRow.size}
                                    optionStart={virtualRow.start}
                                />
                            );
                        })
                    ) : null}
                </ListContainer>
            )}
        </div>
    );
}