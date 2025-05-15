import { useEffect, useRef, useCallback } from 'react';

/**
 * A custom React hook that debounces a callback function.
 *
 * @param callback The function to debounce.
 * @param delay The debounce delay in milliseconds.
 * @returns A memoized, debounced version of the callback function.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebouncedCallback<T extends (...args: any[]) => void>(
    callback: T,
    delay: number
): (...args: Parameters<T>) => void {
    // Ref to store the timeout ID
    const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Ref to store the latest callback function.
    // This ensures that the debounced function always calls the most recent
    // version of the callback, even if the callback prop changes.
    const callbackRef = useRef<T>(callback);

    // Update the stored callback if the callback prop changes
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    // Effect for cleanup: clear the timeout when the component unmounts
    // or if the delay changes (though typically delay is constant for a hook instance).
    useEffect(() => {
        return () => {
            if (timeoutIdRef.current) {
                clearTimeout(timeoutIdRef.current);
            }
        };
    }, [delay]); // Also re-run cleanup if delay changes, to cancel previous timer with old delay

    // The memoized debounced function
    const debouncedCallback = useCallback((...args: Parameters<T>) => {
        // Clear any existing timeout
        if (timeoutIdRef.current) {
            clearTimeout(timeoutIdRef.current);
        }

        // Set a new timeout
        timeoutIdRef.current = setTimeout(() => {
            callbackRef.current(...args); // Execute the stored (latest) callback
        }, delay);
    }, [delay]); // Re-memoize if delay changes

    return debouncedCallback;
}