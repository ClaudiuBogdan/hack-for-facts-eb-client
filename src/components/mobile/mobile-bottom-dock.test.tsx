import { fireEvent, render, screen, waitFor } from "@/test/test-utils";
import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MobileBottomDock } from "./mobile-bottom-dock";

const mockIsMobile = vi.fn(() => true);
const ensureShortRedirectUrlMock = vi.fn();
const mockSetOpenMobile = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
const mockUseAuth = vi.fn(() => ({ isSignedIn: false }));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mockIsMobile(),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/lib/api/shortLinks", () => ({
  ensureShortRedirectUrl: (...args: unknown[]) =>
    ensureShortRedirectUrlMock(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

vi.mock("@/components/ui/sidebar", () => ({
  useSidebar: () => ({
    setOpenMobile: mockSetOpenMobile,
  }),
}));

vi.mock("@/components/entities/FloatingEntitySearch", () => ({
  FloatingEntitySearch: ({
    externalOpen,
  }: {
    readonly externalOpen?: boolean;
  }) =>
    externalOpen ? (
      <div data-testid="floating-entity-search-dialog">Search dialog</div>
    ) : null,
}));

vi.mock("@/components/sentry/SendFeedbackAction", () => ({
  SendFeedbackAction: () => <div>Send feedback</div>,
}));

vi.mock("@/components/sentry/SendErrorAction", () => ({
  SendErrorAction: () => <div>Report bug</div>,
}));

describe("MobileBottomDock", () => {
  function setScrollPosition(nextY: number) {
    Object.defineProperty(window, "pageYOffset", {
      configurable: true,
      writable: true,
      value: nextY,
    });
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      writable: true,
      value: nextY,
    });
    Object.defineProperty(document.documentElement, "scrollTop", {
      configurable: true,
      writable: true,
      value: nextY,
    });
    fireEvent.scroll(window);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    ensureShortRedirectUrlMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    mockIsMobile.mockReturnValue(true);
    mockUseAuth.mockReturnValue({ isSignedIn: false });
    ensureShortRedirectUrlMock.mockResolvedValue(
      "https://transparenta.eu/share/abc123"
    );
    Object.defineProperty(window, "pageYOffset", {
      configurable: true,
      writable: true,
      value: 0,
    });
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      writable: true,
      value: 0,
    });
    Object.defineProperty(document.documentElement, "scrollTop", {
      configurable: true,
      writable: true,
      value: 0,
    });
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      queueMicrotask(() => callback(0));
      return 1;
    });
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        href: "https://transparenta.eu/primarie/123",
      },
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("renders help, share, search, and menu actions on mobile in order", () => {
    render(<MobileBottomDock />);

    expect(screen.getByTestId("mobile-bottom-dock")).toBeInTheDocument();
    const dockButtons = screen
      .getAllByRole("button")
      .map((button) => button.getAttribute("aria-label"));

    expect(dockButtons).toEqual([
      "Help",
      "Copy share link",
      "Search",
      "Menu",
    ]);
  });

  it("does not render on desktop", () => {
    mockIsMobile.mockReturnValue(false);

    render(<MobileBottomDock />);

    expect(screen.queryByTestId("mobile-bottom-dock")).not.toBeInTheDocument();
  });

  it("opens the search dialog when the search action is pressed", () => {
    render(<MobileBottomDock />);

    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(
      screen.getByTestId("floating-entity-search-dialog")
    ).toBeInTheDocument();
  });

  it("opens the support menu when the help action is pressed", async () => {
    render(<MobileBottomDock />);

    fireEvent.pointerDown(screen.getByRole("button", { name: "Help" }), {
      button: 0,
      ctrlKey: false,
    });

    await waitFor(() => {
      expect(screen.getByText("Send feedback")).toBeInTheDocument();
      expect(screen.getByText("Report bug")).toBeInTheDocument();
      expect(screen.getByText("Contact Support")).toBeInTheDocument();
    });
  });

  it("copies the current URL when the share action is pressed while signed out", async () => {
    render(<MobileBottomDock />);

    fireEvent.click(screen.getByRole("button", { name: "Copy share link" }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "https://transparenta.eu/primarie/123"
      );
      expect(ensureShortRedirectUrlMock).not.toHaveBeenCalled();
      expect(toastSuccessMock).not.toHaveBeenCalled();
    });
  });

  it("uses a short link when the share action is pressed while signed in", async () => {
    mockUseAuth.mockReturnValue({ isSignedIn: true });

    render(<MobileBottomDock />);

    fireEvent.click(screen.getByRole("button", { name: "Copy share link" }));

    await waitFor(() => {
      expect(ensureShortRedirectUrlMock).toHaveBeenCalled();
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "https://transparenta.eu/share/abc123"
      );
    });
  });

  it("falls back to the current URL when short link generation fails", async () => {
    mockUseAuth.mockReturnValue({ isSignedIn: true });
    ensureShortRedirectUrlMock.mockRejectedValue(new Error("short link failed"));
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    render(<MobileBottomDock />);

    fireEvent.click(screen.getByRole("button", { name: "Copy share link" }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "https://transparenta.eu/primarie/123"
      );
      expect(toastSuccessMock).not.toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  it("shows copied feedback on the share button after a successful copy", async () => {
    render(<MobileBottomDock />);

    fireEvent.click(screen.getByRole("button", { name: "Copy share link" }));

    await waitFor(() => {
      expect(screen.getByText("Share").previousSibling).toHaveClass(
        "text-green-600"
      );
    });
  });

  it("resets the copied feedback after the timeout elapses", async () => {
    vi.useFakeTimers();

    render(<MobileBottomDock />);

    fireEvent.click(screen.getByRole("button", { name: "Copy share link" }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("Share").previousSibling).toHaveClass(
      "text-green-600"
    );

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText("Share").previousSibling).not.toHaveClass(
      "text-green-600"
    );

    vi.useRealTimers();
  });

  it("opens the mobile sidebar sheet when the menu action is pressed", () => {
    render(<MobileBottomDock />);

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));

    expect(mockSetOpenMobile).toHaveBeenCalledWith(true);
  });

  it("hides on downward scroll past the threshold and reappears on upward scroll", async () => {
    render(<MobileBottomDock />);

    expect(screen.getByTestId("mobile-bottom-dock")).toHaveClass(
      "translate-y-0",
      "opacity-100"
    );

    setScrollPosition(120);

    await waitFor(() => {
      expect(screen.getByTestId("mobile-bottom-dock")).toHaveClass(
        "translate-y-full",
        "opacity-0"
      );
    });

    setScrollPosition(90);

    await waitFor(() => {
      expect(screen.getByTestId("mobile-bottom-dock")).toHaveClass(
        "translate-y-0",
        "opacity-100"
      );
    });
  });
});
