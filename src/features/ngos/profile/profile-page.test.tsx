import { render, screen, within } from "@/test/test-utils";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { profileFixture } from "./profile.fixture";
import { NgoLiveProfilePage } from "./profile-page";
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    readonly children: ReactNode;
    readonly to: string;
    readonly params?: Record<string, string>;
  }) => (
    <a href={to.replace(/\$(\w+)/g, (_, key: string) => params?.[key] ?? key)}>
      {children}
    </a>
  ),
}));
describe("live NGO profile presentation", () => {
  it("renders false, unknown, dates and source provenance without financial totals", () => {
    render(<NgoLiveProfilePage profile={profileFixture} />);
    const vat = screen.getByText("VAT payer").closest("div")!;
    expect(within(vat).getByText("No")).toBeInTheDocument();
    const inactive = screen
      .getByText("Declared fiscally inactive")
      .closest("div")!;
    expect(within(inactive).getByText("Not provided")).toBeInTheDocument();
    expect(
      screen.getByText(/Fiscal inactivity is not legal dissolution/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "ANAF source service" }),
    ).toHaveAttribute("href", "https://static.anaf.ro/");
    expect(
      screen.getByText(
        /Financial statements, services, accreditations and funding are not released/,
      ),
    ).toBeInTheDocument();
  });
  it("preserves duplicate source observations and shows unavailable fiscal data honestly", () => {
    render(
      <NgoLiveProfilePage
        profile={{
          ...profileFixture,
          registryRecords: [
            profileFixture.registryRecords[0],
            {
              ...profileFixture.registryRecords[0],
              id: "second",
              name: "Second observation",
            },
          ],
          fiscal: { availability: "unavailable", data: null },
        }}
      />,
    );
    expect(
      screen.getByRole("link", { name: "Second observation" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/not a confirmed negative result/),
    ).toBeInTheDocument();
    expect(screen.queryByText("VAT payer")).not.toBeInTheDocument();
  });
});
