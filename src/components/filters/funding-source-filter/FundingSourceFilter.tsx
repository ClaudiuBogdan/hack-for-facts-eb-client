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

export interface FundingSourceOption {
    source_id: string;
    source_description: string;
}

export function FundingSourceList({
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
    } = useMultiSelectInfinite<FundingSourceOption>({
        itemSize: 48,
        queryKey: ['native-funding-sources', searchFilter],
        queryFn: async ({ pageParam = 0, signal }): Promise<PageData<FundingSourceOption>> => {
            const query = `
              query FundingSources($search: String!, $limit: Int!, $offset: Int!) {
                fundingSources(filter: { search: $search }, limit: $limit, offset: $offset) {
                    nodes { 
                        source_id
                        source_description
                    }
                  pageInfo { totalCount hasNextPage hasPreviousPage }
                }
              }
            `;
            const limit = pageSize;
            const variables = { search: searchFilter, limit, offset: pageParam };
            const response = await graphqlQuery<{
                fundingSources: { nodes: FundingSourceOption[]; pageInfo: { totalCount: number; hasNextPage: boolean; hasPreviousPage: boolean } };
            }>(query, variables, { signal, auth: 'none' });
            return {
                nodes: response.fundingSources.nodes,
                pageInfo: response.fundingSources.pageInfo,
                nextOffset: pageParam + response.fundingSources.nodes.length,
            };
        }
    });

    const showNoResults = !isLoading && !isError && items.length === 0 && searchFilter.length > 0;
    const isEmpty = !isLoading && !isError && items.length === 0 && !searchFilter;
    return (
        <div className={cn("w-full flex flex-col space-y-3", className)}>
            <SearchInput
                onChange={setSearchFilter}
                placeholder={t`Search funding sources`}
                initialValue={searchFilter}
            />

            {isError && error && (
                <ErrorDisplay
                    error={error as Error}
                    refetch={refetch}
                    title={t`Could Not Load Funding Sources`}
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
                            const isSelected = selectedOptions.some(item => item.id === option.source_id);
                            const label = `${option.source_description}`;
                            return (
                                <ListOption
                                    key={option.source_id}
                                    uniqueIdPart={option.source_id}
                                    onClick={() => {
                                        toggleSelect({ id: option.source_id, label })
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