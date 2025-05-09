import { useRef, useEffect, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { PageData } from '../interfaces';

export interface UseMultiSelectInfiniteProps<T> {
    queryKey: string[];
    queryFn: ({ pageParam }: { pageParam: number }) => Promise<PageData<T>>;
    itemSize?: number;
}

export function useMultiSelectInfinite<T>({
    queryKey,
    queryFn,
    itemSize = 35,
}: UseMultiSelectInfiniteProps<T>) {
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

