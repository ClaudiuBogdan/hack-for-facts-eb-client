import { useMultiSelectInfinite } from '../base-filter/hooks/useMultiSelectInfinite';
import { graphqlRequest } from '@/lib/api/graphql';
import { useState } from 'react';
import { SearchInput } from '../base-filter/SearchInput';
import { OptionItem, PageData } from '../base-filter/interfaces';
import { ErrorDisplay } from '../base-filter/ErrorDisplay';
import { ListContainer } from '../base-filter/ListContainer';
import { ListOption } from '../base-filter/ListOption';
import { cn } from '@/lib/utils';

export interface UatOption {
    id: string;
    name: string;
    county_code: string;
    county_name: string;
}

interface UatListProps {
    selectedOptions: OptionItem[];
    toggleSelect: (option: OptionItem) => void;
    pageSize?: number;
    className?: string;
}

export function UatList({
    selectedOptions,
    toggleSelect,
    pageSize = 100,
    className,
}: UatListProps) {
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
    } = useMultiSelectInfinite<UatOption>({
        itemSize: 48,
        queryKey: ['uats', searchFilter],
        queryFn: async ({ pageParam = 0 }): Promise<PageData<UatOption>> => {
            const query = `
              query Uats($search: String!, $limit: Int!, $offset: Int!) {
                uats(filter: { search: $search }, limit: $limit, offset: $offset) {
                    nodes { 
                        id
                        name
                        county_code
                        county_name
                    }
                  pageInfo { totalCount hasNextPage }
                }
              }
            `;
            const limit = pageSize;
            const variables = { search: searchFilter, limit, offset: pageParam };
            const response = await graphqlRequest<{
                uats: { nodes: UatOption[]; pageInfo: { totalCount: number; hasNextPage: boolean; hasPreviousPage: boolean } };
            }>(query, variables);
            return {
                nodes: response.uats.nodes,
                pageInfo: response.uats.pageInfo,
                nextOffset: pageParam + response.uats.nodes.length,
            };
        }
    });

    const showNoResults = !isLoading && !isError && items.length === 0 && searchFilter.length > 0;

    return (
        <div className={cn("w-full flex flex-col space-y-3", className)}>
            <SearchInput
                onChange={setSearchFilter}
                placeholder="Cauta UAT (ex: Municipiul Arad)"
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
                                />
                            );
                        })
                    ) : null}
                </ListContainer>
            )}
        </div>
    );
}