import { isUpdateAvailableError } from "@/lib/errors-utils";

const RELOAD_QUERY_PARAM = "__reload";
const RELOAD_STATE_KEY = "app:chunk-reload";
const MAX_RELOAD_ATTEMPTS = 1;
const RESET_AFTER_MS = 5 * 60 * 1000;

type ReloadState = {
  count: number;
  lastAttempt: number;
};

let handlerRegistered = false;
let recoveryInProgress = false;
/**
 * Background chunk loads in flight, each with whether a chunk error arrived
 * while it ran. Their failures must not reload the page.
 */
const quietLoads = new Set<{ failed: boolean }>();
const reloadParamSeen =
  typeof window !== "undefined" &&
  new URL(window.location.href).searchParams.has(RELOAD_QUERY_PARAM);

function readReloadState(): ReloadState | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(RELOAD_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ReloadState;
    if (
      typeof parsed?.count === "number" &&
      typeof parsed?.lastAttempt === "number"
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function writeReloadState(state: ReloadState): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(RELOAD_STATE_KEY, JSON.stringify(state));
  } catch {
    return;
  }
}

function shouldAttemptReload(): boolean {
  const now = Date.now();
  const state = readReloadState();

  if (!state || now - state.lastAttempt > RESET_AFTER_MS) {
    writeReloadState({ count: 1, lastAttempt: now });
    return true;
  }

  if (state.count >= MAX_RELOAD_ATTEMPTS) {
    return false;
  }

  writeReloadState({ count: state.count + 1, lastAttempt: now });
  return true;
}

function buildReloadUrl(): string {
  const url = new URL(window.location.href);
  url.searchParams.set(RELOAD_QUERY_PARAM, String(Date.now()));
  return url.toString();
}

function cleanupReloadParam(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(RELOAD_QUERY_PARAM)) return;
  url.searchParams.delete(RELOAD_QUERY_PARAM);
  window.history.replaceState({}, document.title, url.toString());
}

export function attemptChunkRecovery(error?: unknown): boolean {
  if (typeof window === "undefined") return false;
  if (import.meta.env.DEV) return false;
  if (!isUpdateAvailableError(error)) return false;
  if (recoveryInProgress) return true;
  if (reloadParamSeen) return false;
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return false;
  }
  if (!shouldAttemptReload()) return false;

  recoveryInProgress = true;
  window.location.replace(buildReloadUrl());
  return true;
}

function extractErrorFromEvent(event: Event | PromiseRejectionEvent): unknown {
  if ("detail" in event && (event as CustomEvent).detail) {
    return (event as CustomEvent).detail;
  }
  if ("payload" in event && (event as { payload?: unknown }).payload) {
    return (event as { payload?: unknown }).payload;
  }
  if ("reason" in event) {
    return event.reason;
  }
  if ("error" in event && event.error) {
    return event.error;
  }
  if ("message" in event && typeof event.message === "string") {
    return { message: event.message };
  }
  return event;
}

/**
 * Load the current address as a new document, for code this document can no
 * longer load cleanly: a background fetch of it failed, and the browser keeps
 * that failure. Marks the recovery as under way, so the router's own error
 * for the same code does not start a second one. Not offline, where a page
 * load would swap the app for the browser's own error page.
 */
export function reloadForFreshCode(): boolean {
  if (typeof window === "undefined") return false;
  if (recoveryInProgress) return true;
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return false;
  }
  recoveryInProgress = true;
  window.location.reload();
  return true;
}

/**
 * Run a chunk load the reader did not ask for — code fetched ahead of a click
 * — without the reload a failed chunk normally triggers: reloading the page
 * someone is reading because a background fetch failed would be the worst
 * outcome of an optimisation. Resolves to whether it loaded cleanly.
 *
 * A failure is any `vite:preloadError` while the load runs, not only a
 * rejection: Vite reports a stylesheet that failed and then goes on, and a
 * split route component records its import's failure instead of throwing.
 * Loads that overlap all count it, since the event does not say whose it
 * was — a false alarm only costs the reader a full page load later. A
 * navigation that fails meanwhile still recovers through the router's error
 * page (`GlobalErrorPage` → `attemptChunkRecovery`).
 */
export async function quietChunkLoad(load: () => Promise<unknown>): Promise<boolean> {
  const entry = { failed: false };
  quietLoads.add(entry);
  try {
    await load();
    return !entry.failed;
  } catch {
    return false;
  } finally {
    quietLoads.delete(entry);
  }
}

/**
 * Import a chunk the reader did not ask for — a section's code or data,
 * loaded as it nears the screen — with `quietChunkLoad`'s silence: a failure
 * is the section's to show, never a reload of the page being read. Resolves
 * to the module, or rejects with the import's own error.
 */
export async function quietImport<T>(load: () => Promise<T>): Promise<T> {
  const outcome: { module?: T; error?: unknown } = {};
  await quietChunkLoad(async () => {
    try {
      outcome.module = await load();
    } catch (error) {
      outcome.error = error;
      throw error;
    }
  });
  if ("module" in outcome) return outcome.module as T;
  throw outcome.error ?? new Error("The chunk did not load.");
}

/** Listens for failed chunks, app-wide; returns the way to stop (for tests). */
export function registerChunkErrorHandler(): () => void {
  if (typeof window === "undefined" || handlerRegistered) return () => undefined;
  handlerRegistered = true;

  cleanupReloadParam();

  const handleError = (event: Event | PromiseRejectionEvent) => {
    if (quietLoads.size > 0 && event.type === "vite:preloadError") {
      for (const entry of quietLoads) entry.failed = true;
      return;
    }
    const error = extractErrorFromEvent(event);
    if (!isUpdateAvailableError(error)) return;

    const didReload = attemptChunkRecovery(error);
    if (didReload && "preventDefault" in event) {
      event.preventDefault();
    }
  };

  window.addEventListener("vite:preloadError", handleError as EventListener);
  window.addEventListener("error", handleError as EventListener, true);
  window.addEventListener("unhandledrejection", handleError);
  return () => {
    window.removeEventListener("vite:preloadError", handleError as EventListener);
    window.removeEventListener("error", handleError as EventListener, true);
    window.removeEventListener("unhandledrejection", handleError);
    handlerRegistered = false;
  };
}
