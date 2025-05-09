import { useMultiSelectInfinite } from '../base-filter/hooks/useMultiSelectInfinite';
import { EntityOption } from './interfaces';
import { graphqlRequest } from '@/lib/api/graphql';
import { useState } from 'react';
import { SearchInput } from '../base-filter/SearchInput';
import { PageData } from '../base-filter/interfaces';
import { LoadingSpinner } from '../base-filter/LoadingSpinner';
import { ErrorDisplay } from '../base-filter/ErrorDisplay';
import { FilterContainer } from '../base-filter/FilterContainer';
import { FilterOption } from '../base-filter/FilterOption';
import { NoResults } from '../base-filter/NoResults';
import { cn } from '@/lib/utils';

interface MultiSelectInfiniteProps {
    selected: EntityOption[];
    toggleSelect: (option: EntityOption) => void;
    pageSize?: number;
    className?: string;
}

export function MultiSelectInfinite({
    selected,
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
                  nodes { name cui }
                  pageInfo { totalCount hasNextPage }
                }
              }
            `;
            // Ensure pageSize from props is used in limit, or a fixed one
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
    const showInitialPrompt = !isLoading && !isError && items.length === 0 && searchFilter.length === 0;


    return (
        <div className={cn("w-full flex flex-col space-y-3", className)}>
            <SearchInput
                onChange={setSearchFilter}
                placeholder="Search entities (e.g., Aspirin)"
                initialValue={searchFilter} // To keep search term if component re-renders for other reasons
            />

            {isLoading && <LoadingSpinner text="Loading entities..." className="py-10" />}
            {isError && error && (
                <ErrorDisplay
                    error={error as Error}
                    refetch={refetch}
                    title="Could Not Load Entities"
                />
            )}

            {!isLoading && !isError && (
                <FilterContainer
                    // Pass the parentRef from the hook to the actual scrollable element's ref
                    // If FilterContainer's implementation uses React.forwardRef and applies it to the scrollable div:
                    ref={parentRef}
                    height={rowVirtualizer.getTotalSize()}
                    isFetchingNextPage={isFetchingNextPage}
                    className="min-h-[10rem]" // Ensure a minimum height
                >
                    {rowVirtualizer.getVirtualItems().length > 0 ? (
                        rowVirtualizer.getVirtualItems().map(virtualRow => {
                            const option = items[virtualRow.index];
                            // It's good practice to ensure option exists, though virtualizer count should match items.length
                            if (!option) return null;
                            const isSelected = selected.some(item => item.cui === option.cui);
                            return (
                                <FilterOption
                                    key={option.cui}
                                    uniqueIdPart={option.cui}
                                    onClick={() => toggleSelect(option)}
                                    // TODO: add county prefix to label
                                    label={option.name}
                                    selected={isSelected}
                                    optionHeight={virtualRow.size} 
                                    optionStart={virtualRow.start}
                                />
                            );
                        })
                    ) : null}
                </FilterContainer>
            )}
            {showNoResults && (
                <NoResults message={`No entities found for "${searchFilter}".`} />
            )}
            {showInitialPrompt && (
                <div className="p-6 text-center text-muted-foreground">
                    <p>Start typing to search for entities.</p>
                </div>
            )}
        </div>
    );
}