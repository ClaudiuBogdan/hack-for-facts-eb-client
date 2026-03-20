import { useEffect, useRef, useCallback } from 'react';

type DebouncedCallback<TArgs extends unknown[]> = ((...args: TArgs) => void) & {
    cancel: () => void;
    flush: () => void;
};

/**
 * Creates a debounced callback that delays invoking `callback` until after `delay`
 * milliseconds have passed since the last time the debounced function was invoked.
 *
 * The debounced function is memoized and will have a stable identity as long as
 * the `delay` does not change.
 *
 * @param callback The function to debounce.
 * @param delay The debounce delay in milliseconds.
 * @returns A memoized, debounced version of the callback function.
 */
export function useDebouncedCallback<TArgs extends unknown[]>(
    callback: (...args: TArgs) => void,
    delay: number
): DebouncedCallback<TArgs> {
    const callbackRef = useRef(callback);
    const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastArgsRef = useRef<TArgs | null>(null);

    // Keeps the callback reference up to date.
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    // Cleans up the timeout on unmount.
    useEffect(() => {
        return () => {
            if (timeoutIdRef.current) {
                clearTimeout(timeoutIdRef.current);
            }
        };
    }, []);

    const cancel = useCallback(() => {
        if (timeoutIdRef.current) {
            clearTimeout(timeoutIdRef.current);
            timeoutIdRef.current = null;
        }
        lastArgsRef.current = null;
    }, []);

    const flush = useCallback(() => {
        if (!lastArgsRef.current) {
            return;
        }

        if (timeoutIdRef.current) {
            clearTimeout(timeoutIdRef.current);
            timeoutIdRef.current = null;
        }

        const args = lastArgsRef.current;
        lastArgsRef.current = null;
        callbackRef.current(...args);
    }, []);

    const debouncedCallback = useCallback((...args: TArgs) => {
        lastArgsRef.current = args;

        if (timeoutIdRef.current) {
            clearTimeout(timeoutIdRef.current);
        }

        timeoutIdRef.current = setTimeout(() => {
            timeoutIdRef.current = null;
            const pendingArgs = lastArgsRef.current;
            lastArgsRef.current = null;
            if (pendingArgs) {
                callbackRef.current(...pendingArgs);
            }
        }, delay);
    }, [delay]);

    return Object.assign(debouncedCallback, { cancel, flush });
}
