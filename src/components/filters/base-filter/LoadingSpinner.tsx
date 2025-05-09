import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
    size?: "sm" | "md" | "lg";
    text?: string | null;
    className?: string;
    fullScreen?: boolean; // If true, centers on screen, else inline or centered in parent
}

export function LoadingSpinner({
    size = "md",
    text = "Loading...",
    className,
    fullScreen = false,
}: LoadingSpinnerProps) {
    const sizeMap = {
        sm: "h-5 w-5",
        md: "h-8 w-8",
        lg: "h-12 w-12",
    };

    const containerClasses = cn(
        "flex flex-col items-center justify-center space-y-2",
        fullScreen ? "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" : "p-4",
        className
    );

    return (
        <div className={containerClasses} role="status" aria-live="polite">
            <Loader2 className={cn(sizeMap[size], "animate-spin text-primary")} />
            {text && <p className="text-sm text-muted-foreground">{text}</p>}
        </div>
    );
}