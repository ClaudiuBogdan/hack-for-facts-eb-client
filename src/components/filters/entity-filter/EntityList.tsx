import { useMultiSelectInfinite } from '../base-filter/hooks/useMultiSelectInfinite';
import { graphqlRequest } from '@/lib/api/graphql';
import { useState } from 'react';
import { SearchInput } from '../base-filter/SearchInput';
import { BaseListProps, PageData } from '../base-filter/interfaces';
import { ErrorDisplay } from '../base-filter/ErrorDisplay';
import { ListContainer } from '../base-filter/ListContainer';
import { ListOption } from '../base-filter/ListOption';
import { cn } from '@/lib/utils';

export interface EntityOption {
    name: string;
    cui: string;
    uat?: {
        name: string;
        county_code: string;
    }
}

export function EntityList({
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
                placeholder="Cauta entitati (ex: Primaria Arad)"
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
                            const isSelected = selectedOptions.some(item => item.id === option.cui);
                            const countyLabel = option.uat?.county_code ? `(${option.uat.county_code} - ${option.uat.name})` : "";
                            const label = `${option.name} ${countyLabel}`;
                            return (
                                <ListOption
                                    key={option.cui}
                                    uniqueIdPart={option.cui}
                                    onClick={() => toggleSelect({ id: option.cui, label })}
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