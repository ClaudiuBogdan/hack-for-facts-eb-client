import { SearchX } from "lucide-react"; // Or another icon like Info, Inbox
import { cn } from "@/lib/utils";

interface NoResultsProps {
    message?: string;
    className?: string;
    iconSize?: number;
}

export function NoResults({
    message = "No results found.",
    className,
    iconSize = 10
}: NoResultsProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center p-6 text-center text-muted-foreground space-y-3",
                className
            )}
            role="status"
        >
            <SearchX className={`h-${iconSize} w-${iconSize} text-gray-400 dark:text-gray-500`} />
            <p className="text-sm">{message}</p>
        </div>
    );
}