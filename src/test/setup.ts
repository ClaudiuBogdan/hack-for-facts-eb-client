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

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.IntersectionObserver = mockIntersectionObserver;

if (!window.localStorage || typeof window.localStorage.clear !== "function") {
  const store: Record<string, string> = {};
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => (key in store ? store[key] : null),
      setItem: (key: string, value: string) => {
        store[key] = String(value);
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        Object.keys(store).forEach((key) => delete store[key]);
      },
      key: (index: number) => Object.keys(store)[index] ?? null,
      get length() {
        return Object.keys(store).length;
      },
    },
  });
}
