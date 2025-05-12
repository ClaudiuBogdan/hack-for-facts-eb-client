import { List } from "lucide-react"; // Or another icon like Info, Inbox
import { cn } from "@/lib/utils";

interface EmptyListProps {
    message?: string;
    className?: string;
    iconSize?: number;
}

export function EmptyList({
    message = "List is empty.",
    className,
    iconSize = 10
}: EmptyListProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center p-6 text-center text-muted-foreground space-y-3",
                className
            )}
            role="status"
        >
            <List className={`h-${iconSize} w-${iconSize} text-gray-400 dark:text-gray-500`} />
            <p className="text-sm">{message}</p>
        </div>
    );
}