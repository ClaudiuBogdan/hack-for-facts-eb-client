import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { graphqlRequest } from '@/lib/api/graphql';
import { PageData, UseMultiSelectInfiniteProps, Option } from './interfaces';

export function useMultiSelectInfinite({
    selected,
    onChange,
    pageSize = 20,
    debounceMs = 300,
}: UseMultiSelectInfiniteProps) {
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState(search);

    // Debounce search input
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedSearch(search), debounceMs);
        return () => clearTimeout(handler);
    }, [search, debounceMs]);

    // Infinite query for fetching options
    const {
        data,
        isLoading,
        isError,
        error,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        refetch,
    } = useInfiniteQuery(
        {
            queryKey: ['entities', debouncedSearch],
            staleTime: Infinity,
            queryFn: async ({ pageParam = 0 }): Promise<PageData> => {
                const query = `
          query Entities($search: String!, $limit: Int!, $offset: Int!) {
            entities(filter: { search: $search }, limit: $limit, offset: $offset) {
              nodes { name cui }
              pageInfo { totalCount hasNextPage }
            }
          }
        `;
                const variables = { search: debouncedSearch, limit: pageSize, offset: pageParam };
                const response = await graphqlRequest<{
                    entities: { nodes: Option[]; pageInfo: { totalCount: number; hasNextPage: boolean; hasPreviousPage: boolean } };
                }>(query, variables);
                return {
                    nodes: response.entities.nodes,
                    pageInfo: response.entities.pageInfo,
                    nextOffset: pageParam + response.entities.nodes.length,
                };
            },
            getNextPageParam: lastPage => lastPage.pageInfo.hasNextPage ? lastPage.nextOffset : undefined,
            initialPageParam: 0,
        }
    );

    // Flatten items
    const items = useMemo(
        () => data?.pages.flatMap(page => page.nodes) ?? [],
        [data]
    );

    // Virtualizer setup
    const parentRef = useRef<HTMLDivElement>(null);
    const rowVirtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 35,
        overscan: 5,
    });

    // Scroll to top on new search
    useEffect(() => {
        rowVirtualizer.scrollToOffset(0, { align: 'start' });
    }, [debouncedSearch, isLoading, rowVirtualizer]);

    // Fetch next when reaching near bottom
    useEffect(() => {
        const [last] = [...rowVirtualizer.getVirtualItems()].reverse();
        if (!last) return;
        if (last.index >= items.length - 1 - 3 && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [rowVirtualizer.scrollOffset, rowVirtualizer, hasNextPage, isFetchingNextPage, fetchNextPage, items.length]);

    // Toggle selection
    const toggleSelect = useCallback(
        (option: Option) => {
            const exists = selected.some(item => item.cui === option.cui);
            const newSelected = exists
                ? selected.filter(item => item.cui !== option.cui)
                : [...selected, option];
            onChange(newSelected);
        },
        [selected, onChange]
    );

    return {
        search,
        setSearch,
        items,
        parentRef,
        rowVirtualizer,
        isLoading,
        isError,
        error,
        refetch,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        toggleSelect,
    };
}

