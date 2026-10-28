/**
 * Background chunk loads in flight, each with whether a chunk error arrived
 * while it ran. Their failures must not reload the page: the app-wide chunk
 * error handler (`chunk-recovery.ts`) reads this set. A module of its own, so
 * code that only loads quietly (the telemetry loaders) does not import the
 * recovery itself.
 */
export const quietLoads = new Set<{ failed: boolean }>();

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
