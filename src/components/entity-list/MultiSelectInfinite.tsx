
import { useMultiSelectInfinite } from './useMultiSelectInfinite';
import { Option } from './interfaces';
interface MultiSelectInfiniteProps {
    selected: Option[];
    onChange: (selected: Option[]) => void;
    placeholder?: string;
    pageSize?: number;
}

export function MultiSelectInfinite({
    selected,
    onChange,
    placeholder = 'Search...',
    pageSize,
}: MultiSelectInfiniteProps) {
    const {
        search,
        setSearch,
        items,
        parentRef,
        rowVirtualizer,
        isLoading,
        isError,
        error,
        refetch,
        isFetchingNextPage,
        hasNextPage,
        toggleSelect,
    } = useMultiSelectInfinite({ selected, onChange, pageSize });

    return (
        <div className="w-full max-w-md">
            <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={placeholder}
                className="w-full p-2 border rounded mb-2"
            />
            {isLoading && <div className="p-4">Loading options...</div>}
            {isError && (
                <div className="p-4 text-red-600">
                    Error loading options: {(error as Error).message}
                    <button onClick={() => refetch()} className="ml-2 underline">
                        Retry
                    </button>
                </div>
            )}
            <div ref={parentRef} className="h-48 overflow-auto border rounded">
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
                        const isSelected = selected.some(item => item.cui === option.cui);
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
                                <input type="checkbox" checked={isSelected} readOnly className="mr-2" />
                                <span>{option.name}</span>
                            </div>
                        );
                    })}
                </div>
                {isFetchingNextPage && <div className="p-2">Loading more...</div>}
            </div>
        </div>
    );
}
