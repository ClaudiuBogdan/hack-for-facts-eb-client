import { useMultiSelectInfinite } from '../base-filter/hooks/useMultiSelectInfinite';
import { EntityOption } from './interfaces';
import { graphqlRequest } from '@/lib/api/graphql';
import { useState } from 'react';
import { SearchInput } from '../base-filter/SearchInput';
import { PageData } from '../base-filter/interfaces';
import { ErrorDisplay } from '../base-filter/ErrorDisplay';
import { FilterContainer } from '../base-filter/FilterContainer';
import { FilterOption } from '../base-filter/FilterOption';
import { cn } from '@/lib/utils';

interface MultiSelectInfiniteProps {
    selectedOptions: EntityOption[];
    toggleSelect: (option: EntityOption) => void;
    pageSize?: number;
    className?: string;
}

export function MultiSelectInfinite({
    selectedOptions,
    toggleSelect,
    pageSize = 100,
    className,
}: MultiSelectInfiniteProps) {
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
    } = useMultiSelectInfinite<EntityOption>({
        itemSize: 48,
        queryKey: ['entities', searchFilter],
        queryFn: async ({ pageParam = 0 }): Promise<PageData<EntityOption>> => {
            const query = `
              query Entities($search: String!, $limit: Int!, $offset: Int!) {
                entities(filter: { search: $search }, limit: $limit, offset: $offset) {
                    nodes { 
                        name
                        cui
                        uat{
                            name
                            county_code
                        }
                    }
                  pageInfo { totalCount hasNextPage }
                }
              }
            `;
            const limit = pageSize;
            const variables = { search: searchFilter, limit, offset: pageParam };
            const response = await graphqlRequest<{
                entities: { nodes: EntityOption[]; pageInfo: { totalCount: number; hasNextPage: boolean; hasPreviousPage: boolean } };
            }>(query, variables);
            return {
                nodes: response.entities.nodes,
                pageInfo: response.entities.pageInfo,
                nextOffset: pageParam + response.entities.nodes.length,
            };
        }
    });

    const showNoResults = !isLoading && !isError && items.length === 0 && searchFilter.length > 0;

    return (
        <div className={cn("w-full flex flex-col space-y-3", className)}>
            <SearchInput
                onChange={setSearchFilter}
                placeholder="Search entities (e.g., Aspirin)"
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
                <FilterContainer
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
                            const isSelected = selectedOptions.some(item => item.cui === option.cui);
                            const countyLabel = option.uat?.county_code ? `(${option.uat.county_code} - ${option.uat.name})` : "";
                            return (
                                <FilterOption
                                    key={option.cui}
                                    uniqueIdPart={option.cui}
                                    onClick={() => toggleSelect(option)}
                                    label={`${option.name} ${countyLabel}`}
                                    selected={isSelected}
                                    optionHeight={virtualRow.size}
                                    optionStart={virtualRow.start}
                                />
                            );
                        })
                    ) : null}
                </FilterContainer>
            )}
        </div>
    );
}