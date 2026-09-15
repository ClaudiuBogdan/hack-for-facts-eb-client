import { afterEach, describe, expect, it, vi } from "vitest";
import { getRouter } from "./router";

/**
 * The hydration scroll guard.
 *
 * `scrollRestoration` is a predicate rather than `true` so that the router's
 * first `onRendered` — which fires when hydration commits, a second or more
 * after first paint — cannot undo a scroll the reader has already made. On a
 * fresh navigation the SSR inline script has already placed the page, so that
 * pass is redundant. On a reload or a back/forward it is a correction: the
 * inline script runs against a document that is still short, a deep position
 * clamps, and the router's pass is what puts it right.
 *
 * Both halves are asserted here. The guard leans on an implementation detail of
 * router-core — that the first call to the predicate is the hydration render —
 * so it is exactly the kind of thing that regresses quietly on a version bump.
 */

const scrollGuard = () => {
  const restoration = getRouter().options.scrollRestoration;
  if (typeof restoration !== "function") {
    throw new Error("scrollRestoration must stay a predicate; see src/router.tsx");
  }
  // The guard reads the window and ignores its argument.
  return () => restoration({} as Parameters<typeof restoration>[0]);
};

/** jsdom reports no navigation timing, so the type under test is supplied. */
const setNavigationType = (type: NavigationTimingType | "none") => {
  vi.spyOn(performance, "getEntriesByType").mockImplementation((kind) =>
    kind === "navigation" && type !== "none"
      ? ([{ type } as PerformanceNavigationTiming] as PerformanceEntryList)
      : []
  );
};

const setScroll = ({ x = 0, y = 0 }: { readonly x?: number; readonly y?: number }) => {
  Object.defineProperty(window, "scrollX", { value: x, configurable: true });
  Object.defineProperty(window, "scrollY", { value: y, configurable: true });
};

afterEach(() => {
  vi.restoreAllMocks();
  setScroll({});
});

describe("scrollRestoration guard", () => {
  describe("on a fresh navigation, where the inline script has already placed the page", () => {
    it("restores when the reader has not moved", () => {
      setNavigationType("navigate");
      setScroll({ y: 0 });
      expect(scrollGuard()()).toBe(true);
    });

    it("stands down when the reader has already scrolled", () => {
      setNavigationType("navigate");
      setScroll({ y: 800 });
      expect(scrollGuard()()).toBe(false);
    });

    it("counts a horizontal scroll as the reader having moved", () => {
      setNavigationType("navigate");
      setScroll({ x: 40 });
      expect(scrollGuard()()).toBe(false);
    });
  });

  describe("where the router's pass is a correction rather than a repeat", () => {
    // Measured on /entities/$cui, which grows ~1500px after first paint:
    // standing down here cost the reader 1800px of restored scroll.
    it("restores on a reload even though the page is already scrolled", () => {
      setNavigationType("reload");
      setScroll({ y: 1800 });
      expect(scrollGuard()()).toBe(true);
    });

    it("restores on a back/forward into a fresh document", () => {
      setNavigationType("back_forward");
      setScroll({ y: 1800 });
      expect(scrollGuard()()).toBe(true);
    });

    it("keeps the upstream behaviour when there is no navigation entry to read", () => {
      setNavigationType("none");
      setScroll({ y: 1800 });
      expect(scrollGuard()()).toBe(true);
    });
  });

  it("restores on every render after the first, so navigations still reset", () => {
    setNavigationType("navigate");
    const guard = scrollGuard();
    setScroll({ y: 800 });
    expect(guard()).toBe(false);
    // A link navigation away from a scrolled page: the new page goes to top.
    expect(guard()).toBe(true);
    setScroll({ y: 1600 });
    expect(guard()).toBe(true);
  });

  it("gives each router its own guard, so SSR requests cannot consume each other's", () => {
    setNavigationType("navigate");
    const first = scrollGuard();
    setScroll({ y: 800 });
    expect(first()).toBe(false);
    expect(first()).toBe(true);
    // A second request, mid-flight: still gets its own hydration render.
    expect(scrollGuard()()).toBe(false);
  });
});
