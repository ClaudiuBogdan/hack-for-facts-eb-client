import { useMultiSelectInfinite } from '../base-filter/hooks/useMultiSelectInfinite';
import { graphqlRequest } from '@/lib/api/graphql';
import { useState } from 'react';
import { SearchInput } from '../base-filter/SearchInput';
import { BaseListProps, PageData } from '../base-filter/interfaces';
import { ErrorDisplay } from '../base-filter/ErrorDisplay';
import { ListContainer } from '../base-filter/ListContainer';
import { ListOption } from '../base-filter/ListOption';
import { cn } from '@/lib/utils';

export interface EconomicClassificationOption {
    economic_code: string;
    economic_name: string;
}

export function EconomicClassificationList({
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
    } = useMultiSelectInfinite<EconomicClassificationOption>({
        itemSize: 48,
        queryKey: ['economic-classification', searchFilter],
        queryFn: async ({ pageParam = 0 }): Promise<PageData<EconomicClassificationOption>> => {
            const query = `
              query EconomicClassifications($search: String!, $limit: Int!, $offset: Int!) {
                economicClassifications(filter: { search: $search }, limit: $limit, offset: $offset) {
                    nodes {
                        economic_code
                        economic_name
                    }
                  pageInfo { totalCount hasNextPage }
                }
              }
            `;
            const limit = pageSize;
            const variables = { search: searchFilter, limit, offset: pageParam };
            const response = await graphqlRequest<{
                economicClassifications: { nodes: EconomicClassificationOption[]; pageInfo: { totalCount: number; hasNextPage: boolean; hasPreviousPage: boolean } };
            }>(query, variables);
            return {
                nodes: response.economicClassifications.nodes,
                pageInfo: response.economicClassifications.pageInfo,
                nextOffset: pageParam + response.economicClassifications.nodes.length,
            };
        }
    });

    const showNoResults = !isLoading && !isError && items.length === 0 && searchFilter.length > 0;

    return (
        <div className={cn("w-full flex flex-col space-y-3", className)}>
            <SearchInput
                onChange={setSearchFilter}
                placeholder="Cauta clasificare economica (ex: Agricultura)"
                initialValue={searchFilter}
            />

            {isError && error && (
                <ErrorDisplay
                    error={error as Error}
                    refetch={refetch}
                    title="Could Not Load Entities"
                />
            )}

            {!isError && (
                <ListContainer
                    ref={parentRef}
                    height={rowVirtualizer.getTotalSize()}
                    isFetchingNextPage={isFetchingNextPage}
                    isLoading={isLoading}
                    isEmpty={showNoResults}
                    className="min-h-[10rem]" // Ensure a minimum height
                >
                    {rowVirtualizer.getVirtualItems().length > 0 ? (
                        rowVirtualizer.getVirtualItems().map(virtualRow => {
                            const option = items[virtualRow.index];
                            // It's good practice to ensure option exists, though virtualizer count should match items.length
                            if (!option) return null;
                            const isSelected = selectedOptions.some(item => item.id === option.economic_code);
                            const label = `${option.economic_name} [${option.economic_code}]`;
                            return (
                                <ListOption
                                    key={option.economic_code}
                                    uniqueIdPart={option.economic_code}
                                    onClick={() => toggleSelect({ id: option.economic_code, label })}
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