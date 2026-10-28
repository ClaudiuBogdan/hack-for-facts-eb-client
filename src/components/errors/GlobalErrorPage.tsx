import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { classifyError, getTechnicalMessage, isUpdateAvailableError } from "@/lib/errors-utils";
import { env } from "@/config/env";
import { attemptChunkRecovery } from "@/lib/chunk-recovery";
import { initSentry, withSentry } from "@/lib/sentry";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type GlobalErrorPageProps = {
    readonly error: unknown;
};

type UnknownError = {
    [key: string]: unknown;
};

function isErrorLike(value: unknown): value is { message?: string; stack?: string; cause?: unknown; error?: unknown } {
    if (!value || typeof value !== "object") return false;

    const typed = value as UnknownError;
    return typeof typed === "object" && (typeof typed.name === "string" || typeof typed.message === "string" || typeof typed.stack === "string");
}

function getRootError(error: unknown, seen = new Set<unknown>()): Error | unknown {
    if (!error || seen.has(error)) return error;

    if (error instanceof Error) {
        return error;
    }

    if (isErrorLike(error)) {
        const candidate = error as UnknownError;
        seen.add(error);

        const nextCandidates = [candidate.cause, candidate.error];
        for (const next of nextCandidates) {
            const nested = getRootError(next, seen);
            if (nested) {
                return nested;
            }
        }
    }

    return error;
}

// --- Action Handlers ---
// These functions perform a "hard" navigation, which is crucial for resolving
// chunk load errors by fetching the latest HTML and asset bundle. They do not
// depend on component state, so they can live outside the component body.

/** Forces a full reload of the current page. */
const hardReloadPage = () => window.location.reload();

/** Forces a full navigation to the homepage. */
const navigateHomeAndReload = () => window.location.assign("/");

export function GlobalErrorPage({ error }: GlobalErrorPageProps) {
    // Classify the error to get user-friendly, translatable messages
    const classifiedError = useMemo(() => classifyError(error), [error]);
    const technicalMessage = useMemo(() => getTechnicalMessage(error), [error]);
    const isUpdateError = useMemo(() => isUpdateAvailableError(error), [error]);
    const [isRecovering, setIsRecovering] = useState(false);
    const errorFingerprint = useMemo(() => {
        if (error instanceof Error) {
            return {
                name: error.name,
                message: error.message,
                stack: error.stack,
            };
        }

        return {
            name: typeof error,
            message: typeof error === "string" ? error : "Unknown error",
            stack: null,
        };
    }, [error]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        try {
            initSentry(undefined);
            const rootError = getRootError(error);
            const route = window.location.pathname;
            const query = window.location.search;

            withSentry((Sentry) => Sentry.withScope((scope) => {
                scope.setLevel("error");
                scope.setTag("source", "global-error-page");
                scope.setTag("error_name", errorFingerprint.name);
                scope.setContext("global_error", {
                    technicalMessage,
                    classifiedTitle: classifiedError.title.id,
                    classifiedMessage: classifiedError.friendlyMessage.id,
                    route,
                    query,
                    wrappedErrorClass: typeof error,
                    rootErrorMessage:
                        rootError instanceof Error ? rootError.message : typeof rootError,
                    rootErrorName:
                        rootError instanceof Error ? rootError.name : "Object",
                });

                Sentry.captureException(rootError);
            }));
        } catch {
            // Keep rendering unaffected if Sentry is unavailable.
        }

        if (env.NODE_ENV === "development") {
            console.error("A global error was caught:", error);
        }
    }, [classifiedError.friendlyMessage.id, classifiedError.title.id, error, errorFingerprint, technicalMessage]);

    useEffect(() => {
        if (!isUpdateError) return;
        const didTrigger = attemptChunkRecovery(error);
        setIsRecovering(didTrigger);
    }, [error, isUpdateError]);

    if (isUpdateError && isRecovering) {
        return (
            <main
                className="min-h-screen w-full flex items-center justify-center bg-background p-6"
                role="status"
                aria-live="polite"
            >
                <LoadingSpinner size="lg" />
            </main>
        );
    }

    return (
        <main
            className="min-h-screen w-full flex items-center justify-center bg-background p-6"
            role="alert"
            aria-labelledby="error-title"
        >
            <div className="w-full max-w-xl text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>

                <h1 id="error-title" className="text-3xl font-bold tracking-tight">
                    {classifiedError.title.message}
                </h1>

                <p className="mt-4 text-lg text-muted-foreground">
                    {classifiedError.friendlyMessage.message}
                </p>

                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Button onClick={hardReloadPage} size="lg" className="w-full sm:w-auto">
                        <RefreshCcw className="mr-2 h-5 w-5" />
                        Reload Page
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={navigateHomeAndReload}
                        size="lg"
                        className="w-full sm:w-auto"
                    >
                        <Home className="mr-2 h-5 w-5" />
                        Go to Homepage
                    </Button>
                </div>

                {technicalMessage && (
                    <details className="mt-8 text-left">
                        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                            Show Technical Details
                        </summary>
                        <pre className="mt-2 overflow-auto rounded-md bg-muted p-4 text-xs text-muted-foreground">
                            <code>{technicalMessage}</code>
                        </pre>
                    </details>
                )}
            </div>
        </main>
    );
}

export default GlobalErrorPage;
