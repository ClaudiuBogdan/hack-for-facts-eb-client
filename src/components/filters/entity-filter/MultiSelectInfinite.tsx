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


interface MultiSelectInfiniteProps {
    selected: EntityOption[];
    toggleSelect: (option: EntityOption) => void;
    pageSize?: number;
}

export function MultiSelectInfinite({
    selected,
    toggleSelect,
    pageSize,
}: MultiSelectInfiniteProps) {
    const [searchFilter, setSearchFilter] = useState("");
    const {
        items,
        parentRef,
        rowVirtualizer,
        isLoading,
        isError,
        error,
        refetch,
        isFetchingNextPage,
    } = useMultiSelectInfinite({
        itemSize: 40,
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
            const variables = { search: searchFilter, limit: pageSize, offset: pageParam };
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
    return (
        <div className="w-full max-w-md">
            <SearchInput onChange={setSearchFilter} />
            {isLoading && <LoadingSpinner />}
            {isError && <ErrorDisplay error={error as Error} refetch={refetch} />}
            <FilterContainer
                ref={parentRef}
                height={rowVirtualizer.getTotalSize()}
                isFetchingNextPage={isFetchingNextPage}
            >
                {rowVirtualizer.getVirtualItems().map(virtualRow => {
                    const option = items[virtualRow.index];
                    if (!option) return null;
                    const isSelected = selected.some(item => item.cui === option.cui);
                    return (
                        <FilterOption
                            key={option.cui}
                            onClick={() => toggleSelect(option)}
                            label={option.name}
                            selected={isSelected}
                            optionHeight={virtualRow.size}
                            optionStart={virtualRow.start}
                        />
                    );
                })}
                {rowVirtualizer.getVirtualItems().length === 0 && !isLoading && (
                    <NoResults />
                )}
            </FilterContainer>
        </div>
    );
}
