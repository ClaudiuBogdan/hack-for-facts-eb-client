import { useRef, useEffect, useMemo } from 'react';
import { useInfiniteQuery, type QueryFunction } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { PageData } from '../interfaces';

export interface UseMultiSelectInfiniteProps<T, TPageParam = number> {
    queryKey: string[];
    queryFn: QueryFunction<PageData<T, TPageParam>, string[], TPageParam>;
    itemSize?: number;
    initialPageParam?: TPageParam;
}

export function useMultiSelectInfinite<T, TPageParam = number>({
    queryKey,
    queryFn,
    itemSize = 35,
    initialPageParam = 0 as TPageParam,
}: UseMultiSelectInfiniteProps<T, TPageParam>) {
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
            queryKey,
            staleTime: Infinity,
            queryFn,
            getNextPageParam: lastPage => lastPage.pageInfo.hasNextPage ? lastPage.nextOffset : undefined,
            initialPageParam,
        }
    );

    // Flatten items
    const items = useMemo(
        () => data?.pages.flatMap(page => page.nodes) ?? [],
        [data]
    );

    const totalCount = useMemo(
        () => data?.pages[0]?.pageInfo?.totalCount ?? items.length,
        [data, items.length]
    );

    // Virtualizer setup
    const parentRef = useRef<HTMLDivElement>(null);
    const rowVirtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => itemSize,
        overscan: 5,
    });

    // Scroll to top on new search
    useEffect(() => {
        rowVirtualizer.scrollToOffset(0, { align: 'start' });
    }, [isLoading, rowVirtualizer]);

    // Fetch next when reaching near bottom
    useEffect(() => {
        const [last] = [...rowVirtualizer.getVirtualItems()].reverse();
        if (!last) return;
        if (last.index >= items.length - 1 - 3 && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [rowVirtualizer.scrollOffset, rowVirtualizer, hasNextPage, isFetchingNextPage, fetchNextPage, items.length]);


    return {
        items,
        totalCount,
        parentRef,
        rowVirtualizer,
        isLoading,
        isError,
        error,
        refetch,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    };
}
