import "@testing-library/jest-dom";
import { expect, afterEach, vi } from "vitest";
import { cleanup, configure } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

// Mock @/config/env before any other imports to avoid environment validation errors
// This must be at the top level to ensure it's hoisted before module resolution
vi.mock("@/config/env", () => ({
  env: {
    VITE_APP_VERSION: "1.0.0-test",
    VITE_APP_NAME: "Transparenta",
    VITE_APP_ENVIRONMENT: "test",
    VITE_API_URL: "http://localhost:3000",
    NODE_ENV: "test",
    VITE_POSTHOG_ENABLED: false,
    VITE_SENTRY_ENABLED: false,
    VITE_SENTRY_FEEDBACK_ENABLED: false,
    VITE_CLERK_PUBLISHABLE_KEY: undefined,
    VITE_CAMPAIGN_SELF_SEND_CC_EMAILS: undefined,
  },
  getSiteUrl: () => "http://localhost:3000",
}));

// Extend Vitest's expect method with methods from react-testing-library
expect.extend(matchers);
configure({ asyncUtilTimeout: 10000 });

// Cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver. It must be a real CLASS, not a `vi.fn()`: vitest 4
// refuses a `mockReturnValue` mock called with `new`, and a mock wrapped around
// a class hands back an instance with none of the prototype methods. Either way
// every component that actually observes something threw inside its effect.
// A test that needs to count constructions subclasses this locally.
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = "";
  readonly scrollMargin: string = "";
  readonly thresholds: readonly number[] = [];
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}
window.IntersectionObserver =
  MockIntersectionObserver as unknown as typeof IntersectionObserver;

// Mock ResizeObserver, for the same reason and with the same shape: jsdom has
// none, and Radix's ScrollArea constructs one in a layout effect — so any test
// rendering a component that contains a scroll area threw before it could
// assert anything.
class MockResizeObserver implements ResizeObserver {
  constructor(private readonly callback: ResizeObserverCallback) {}

  observe(target: Element): void {
    const contentRect = {
      x: 0,
      y: 0,
      width: 1024,
      height: 768,
      top: 0,
      right: 1024,
      bottom: 768,
      left: 0,
      toJSON: () => ({}),
    } as DOMRectReadOnly;

    // SafeResponsiveContainer verifies the observer result with an immediate
    // getBoundingClientRect() read. Keep both jsdom measurements consistent so
    // the second (normally all-zero) read does not hide the chart again.
    Object.defineProperty(target, "getBoundingClientRect", {
      configurable: true,
      value: () => contentRect,
    });

    this.callback(
      [
        {
          target,
          contentRect,
        } as ResizeObserverEntry,
      ],
      this,
    );
  }

  unobserve(): void {}
  disconnect(): void {}
}
window.ResizeObserver =
  MockResizeObserver as unknown as typeof ResizeObserver;
globalThis.ResizeObserver =
  MockResizeObserver as unknown as typeof ResizeObserver;

// Pointer Events capture, which jsdom does not implement at all. Radix's Select
// calls `hasPointerCapture` while opening, so a test that clicks the trigger of
// any shadcn <Select> threw `target.hasPointerCapture is not a function` before
// the listbox ever rendered. `scrollIntoView` is missing for the same reason and
// runs when Radix scrolls the checked item into view.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

window.scrollTo = vi.fn();

const localStorageStore: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => (key in localStorageStore ? localStorageStore[key] : null),
  setItem: (key: string, value: string) => {
    localStorageStore[key] = String(value);
  },
  removeItem: (key: string) => {
    delete localStorageStore[key];
  },
  clear: () => {
    Object.keys(localStorageStore).forEach((key) => delete localStorageStore[key]);
  },
  key: (index: number) => Object.keys(localStorageStore)[index] ?? null,
  get length() {
    return Object.keys(localStorageStore).length;
  },
};

Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: localStorageMock,
});

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: localStorageMock,
});

const mockCanvasContext = {
  canvas: null as HTMLCanvasElement | null,
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  clip: vi.fn(),
  setTransform: vi.fn(),
  resetTransform: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  fillText: vi.fn(),
  strokeText: vi.fn(),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  createPattern: vi.fn(() => null),
  createRadialGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  drawImage: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Uint8ClampedArray() })),
  putImageData: vi.fn(),
};

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  configurable: true,
  value: vi.fn(function getContext(this: HTMLCanvasElement) {
    mockCanvasContext.canvas = this;
    return mockCanvasContext;
  }),
});

Object.defineProperty(HTMLCanvasElement.prototype, "toDataURL", {
  configurable: true,
  value: vi.fn(() => "data:image/png;base64,"),
});

Object.defineProperty(HTMLCanvasElement.prototype, "toBlob", {
  configurable: true,
  value: vi.fn((callback?: BlobCallback) => {
    callback?.(new Blob());
  }),
});
