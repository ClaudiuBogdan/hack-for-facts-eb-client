import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Adjust path
import { Button } from "@/components/ui/button"; // Adjust path
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorDisplayProps {
    error: Error | { message: string } | null; // More flexible error type
    refetch?: () => void;
    title?: string;
    className?: string;
    actionText?: string;
}

export function ErrorDisplay({
    error,
    refetch,
    title = "An Error Occurred",
    className,
    actionText = "Try Again"
}: ErrorDisplayProps) {
    if (!error) return null;

    const errorMessage = typeof error === 'string' ? error : error.message || "Something went wrong.";

    return (
        <Alert variant="destructive" className={cn("my-4", className)} role="alert">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="ml-2 font-semibold">{title}</AlertTitle>
            <AlertDescription className="ml-2 mt-1">
                {errorMessage}
                {refetch && (
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={refetch}
                        className="mt-3 w-full sm:w-auto"
                    >
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        {actionText}
                    </Button>
                )}
            </AlertDescription>
        </Alert>
    );
}