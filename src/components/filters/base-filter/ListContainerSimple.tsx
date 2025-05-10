import { cn } from "@/lib/utils";
import React from "react";

interface ListContainerProps {
    children: React.ReactNode;
    height: number;
    className?: string;
    listClassName?: string;
}

export function ListContainerSimple({ children, height, className, listClassName }: ListContainerProps) {
    return (
        <div className={cn("h-64 overflow-auto border rounded-md", className)}>
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
        </div>
    );
};
