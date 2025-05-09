import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { graphqlRequest } from '@/lib/api/graphql';

export interface Option {
  name: string;
  cui: string;
}

export interface MultiSelectInfiniteProps {
  /** Currently selected options */
  selected: Option[];
  /** Callback when selection changes */
  onChange: (selected: Option[]) => void;
  /** Search placeholder text */
  placeholder?: string;
  /** Maximum items per page */
  pageSize?: number;
}

// Define an interface for the page data structure
interface PageData {
  nodes: Option[];
  pageInfo: {
    totalCount: number
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  nextOffset: number;
}



export function MultiSelectInfinite({
  selected,
  onChange,
  placeholder = 'Search...',
  pageSize = 20,
}: MultiSelectInfiniteProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

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
  } = useInfiniteQuery({ // Pass a single options object
    queryKey: ['entities', debouncedSearch], // Query Key
    queryFn: async ({ pageParam }: { pageParam: number }): Promise<PageData> => {
      const query = `
        query Entities($search: String!, $limit: Int!, $offset: Int!) {
          entities(filter: { search: $search }, limit: $limit, offset: $offset) {
            nodes {
              name
              cui
            }
            pageInfo {
              totalCount
              hasNextPage
            }
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
    initialPageParam: 0, // Explicitly set initial page param
    getNextPageParam: (lastPage: PageData) =>
      lastPage.pageInfo.hasNextPage ? lastPage.nextOffset : undefined,
  });

  // Flatten items (memo'd for a tiny perf bump)
  const items = useMemo(
    () => data?.pages.flatMap(page => page.nodes) ?? [],
    [data]
  );

  // Virtualizer setup: only virtualize the items you have, not the full totalCount.
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35,
    overscan: 5,
  });

  // Whenever the search changes, scroll back to top
  useEffect(() => {
    rowVirtualizer.scrollToOffset(0, { align: 'start' });
  }, [debouncedSearch, isLoading, rowVirtualizer]); // Added items.length to dependencies

  // Handle scroll near bottom to load more
  useEffect(() => {
    const [lastItem] = [...rowVirtualizer.getVirtualItems()].reverse();
    if (!lastItem) return;
    if (
      lastItem.index >= items.length - 1 - 3 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [rowVirtualizer.scrollOffset, rowVirtualizer, hasNextPage, isFetchingNextPage, fetchNextPage, items.length]);

  // Toggle selection
  const toggleSelect = useCallback(
    (option: Option) => {
      const exists = selected.find(item => item.cui === option.cui);
      let newSelected;
      if (exists) {
        newSelected = selected.filter(item => item.cui !== option.cui);
      } else {
        newSelected = [...selected, option];
      }
      onChange(newSelected);
    },
    [selected, onChange]
  );

  if (isLoading) {
    return <div className="p-4">Loading options...</div>;
  }

  if (isError) {
    return (
      <div className="p-4 text-red-600">
        Error loading options: {(error as Error).message}
        <button onClick={() => refetch()} className="ml-2 underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={placeholder}
        className="w-full p-2 border rounded mb-2"
      />
      <div
        ref={parentRef}
        className="h-48 overflow-auto border rounded"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map(virtualRow => {
            const option = items[virtualRow.index];
            if (!option) return null;
            const isSelected = !!selected.find(item => item.cui === option.cui);
            return (
              <div
                key={option.cui}
                className="flex items-center p-2 cursor-pointer absolute top-0 left-0 w-full"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onClick={() => toggleSelect(option)}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  readOnly
                  className="mr-2"
                />
                <span>{option.name}</span>
              </div>
            );
          })}
          {isFetchingNextPage && (
            <div className="p-2">Loading more...</div>
          )}
        </div>
      </div>
    </div>
  );
}
