import { useSyncExternalStore } from "react";

type WindowSize = {
  width: number;
  height: number;
};

const SERVER_WINDOW_SIZE: WindowSize = { width: 0, height: 0 };
let cachedSnapshot: WindowSize | null = null;

/**
 * Subscribes to window resize events and calls the callback on change.
 * @param callback The function to call when the window size changes.
 * @returns A function to unsubscribe from the event listener.
 */
function subscribe(callback: () => void): () => void {
  window.addEventListener("resize", callback);
  return () => {
    window.removeEventListener("resize", callback);
  };
}

/**
 * Gets the current window size on the client.
 */
function getSnapshot(): WindowSize {
  const width = window.innerWidth;
  const height = window.innerHeight;

  if (cachedSnapshot && cachedSnapshot.width === width && cachedSnapshot.height === height) {
    return cachedSnapshot;
  }

  cachedSnapshot = { width, height };
  return cachedSnapshot;
}

/**
 * Gets the window size for SSR (returns 0 for both dimensions).
 */
function getServerSnapshot(): WindowSize {
  return SERVER_WINDOW_SIZE;
}

/**
 * A React hook that returns the current window dimensions.
 * This implementation uses `useSyncExternalStore` to provide the correct value
 * from the very first render, avoiding UI flicker and SSR mismatches.
 *
 * @returns {WindowSize} An object with width and height properties.
 */
export function useWindowSize(): WindowSize {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
