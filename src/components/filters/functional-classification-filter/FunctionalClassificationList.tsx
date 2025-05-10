import { useMultiSelectInfinite } from '../base-filter/hooks/useMultiSelectInfinite';
import { graphqlRequest } from '@/lib/api/graphql';
import { useState } from 'react';
import { SearchInput } from '../base-filter/SearchInput';
import { OptionItem, PageData } from '../base-filter/interfaces';
import { ErrorDisplay } from '../base-filter/ErrorDisplay';
import { ListContainer } from '../base-filter/ListContainer';
import { ListOption } from '../base-filter/ListOption';
import { cn } from '@/lib/utils';

export interface FunctionalClassificationOption {
    functional_code: string;
    functional_name: string;
}

interface FunctionalClassificationListProps {
    selectedOptions: OptionItem[];
    toggleSelect: (option: OptionItem) => void;
    pageSize?: number;
    className?: string;
}

export function FunctionalClassificationList({
    selectedOptions,
    toggleSelect,
    pageSize = 100,
    className,
}: FunctionalClassificationListProps) {
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
    } = useMultiSelectInfinite<FunctionalClassificationOption>({
        itemSize: 48,
        queryKey: ['functional-classifications', searchFilter],
        queryFn: async ({ pageParam = 0 }): Promise<PageData<FunctionalClassificationOption>> => {
            const query = `
              query FunctionalClassifications($search: String!, $limit: Int!, $offset: Int!) {
                functionalClassifications(filter: { search: $search }, limit: $limit, offset: $offset) {
                    nodes { 
                        functional_code
                        functional_name
                    }
                  pageInfo { totalCount hasNextPage }
                }
              }
            `;
            const limit = pageSize;
            const variables = { search: searchFilter, limit, offset: pageParam };
            const response = await graphqlRequest<{
                functionalClassifications: { nodes: FunctionalClassificationOption[]; pageInfo: { totalCount: number; hasNextPage: boolean; hasPreviousPage: boolean } };
            }>(query, variables);
            return {
                nodes: response.functionalClassifications.nodes,
                pageInfo: response.functionalClassifications.pageInfo,
                nextOffset: pageParam + response.functionalClassifications.nodes.length,
            };
        }
    });

    const showNoResults = !isLoading && !isError && items.length === 0 && searchFilter.length > 0;

    return (
        <div className={cn("w-full flex flex-col space-y-3", className)}>
            <SearchInput
                onChange={setSearchFilter}
                placeholder="Cauta clasificare functionala (ex: Ajutor social)"
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
                            const isSelected = selectedOptions.some(item => item.id === option.functional_code);
                            const label = `${option.functional_name} [${option.functional_code}]`;
                            return (
                                <ListOption
                                    key={option.functional_code}
                                    uniqueIdPart={option.functional_code}
                                    onClick={() => toggleSelect({ id: option.functional_code, label })}
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