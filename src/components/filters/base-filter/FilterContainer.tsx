import { LoadingSpinner } from "./LoadingSpinner"; // Make sure this is imported
import { cn } from "@/lib/utils"; // Make sure this is imported
import React from "react"; // Make sure this is imported

interface FilterContainerProps {
    children: React.ReactNode;
    height: number;
    isFetchingNextPage: boolean;
    className?: string;
    listClassName?: string;
}

export const FilterContainer = React.forwardRef<HTMLDivElement, FilterContainerProps>(
    ({ children, height, isFetchingNextPage, className, listClassName }, ref) => {
        return (
            <div
                className={cn("h-64 overflow-auto border rounded-md", className)}
                ref={ref}
            >
                <div
                    style={{
                        height: `${height}px`,
                        width: '100%',
                        position: 'relative',
                    }}
                    className={cn(listClassName)}
                >
                    {children}
                </div>
                {isFetchingNextPage && (
                    <div className="flex items-center justify-center p-2">
                        <LoadingSpinner size="sm" text="Loading more..." />
                    </div>
                )}
            </div>
        );
    });

FilterContainer.displayName = "FilterContainer";