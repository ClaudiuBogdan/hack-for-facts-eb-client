import { RefObject } from "react";

interface FilterContainerProps {
    children: React.ReactNode;
    ref: RefObject<HTMLDivElement | null>;
    height: number;
    isFetchingNextPage: boolean;
}

export function FilterContainer({ children, ref, height, isFetchingNextPage }: FilterContainerProps) {
    return <div className="h-48 overflow-auto border rounded" ref={ref}>

        <div
            style={{
                height: `${height}px`,
                width: '100%',
                position: 'relative',
            }}
        >
            {children}
        </div>
        {isFetchingNextPage && <div className="p-2">Loading more...</div>}
    </div>
}