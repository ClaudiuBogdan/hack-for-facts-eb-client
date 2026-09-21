import { render, screen } from "@/test/test-utils";
import type { ComponentType } from "react";
import { describe, expect, it, vi } from "vitest";
import { profileFixture } from "@/features/ngos/profile/profile.fixture";
const pageProps = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  createLazyFileRoute: () => (options: Record<string, unknown>) => ({
    options,
    useLoaderData: () => ({ profile: profileFixture }),
  }),
}));
vi.mock("@/features/ngos/profile/profile-page", () => ({
  NgoLiveProfilePage: (props: Record<string, unknown>) => {
    pageProps(props);
    return <div>Live profile</div>;
  },
  NgoLiveProfileNotFound: () => <div>No current link</div>,
  NgoLiveProfileUnavailable: () => <div>Read unavailable</div>,
}));
describe("live NGO profile route", () => {
  it("renders the live loader result without funding or mock profile props", async () => {
    const { Route } = await import("./ong-uri.$cui.lazy");
    const Component = Route.options.component as ComponentType;
    render(<Component />);
    expect(screen.getByText("Live profile")).toBeInTheDocument();
    expect(pageProps).toHaveBeenCalledWith({ profile: profileFixture });
  });
  it("keeps missing current admission distinct from a read error", async () => {
    const { Route } = await import("./ong-uri.$cui.lazy");
    const Missing = Route.options.notFoundComponent as ComponentType;
    const Failed = Route.options.errorComponent as ComponentType;
    render(
      <>
        <Missing />
        <Failed />
      </>,
    );
    expect(screen.getByText("No current link")).toBeInTheDocument();
    expect(screen.getByText("Read unavailable")).toBeInTheDocument();
  });
});
