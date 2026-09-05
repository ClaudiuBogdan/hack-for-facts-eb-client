import { render, screen } from "@/test/test-utils";
import { describe, expect, it, vi } from "vitest";
import { EntityAnalyticsTable } from "./EntityAnalyticsTable";
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

const row = {
  entity_cui: "111",
  entity_name: "Annual observation",
  amount: 123,
  total_amount: 500,
  population: null,
  per_capita_amount: 123,
};
describe("per-capita availability in the entity table", () => {
  it("renders a valid annual ratio even when there is no single multiyear population", () => {
    render(
      <EntityAnalyticsTable
        data={[row]}
        onSortChange={() => {}}
        columnPinning={{ left: [], right: [] }}
        columnVisibility={{}}
        columnSizing={{}}
        columnOrder={[]}
        currencyFormat="standard"
      />,
    );
    expect(screen.getByText(/123.*capita/)).toBeInTheDocument();
  });
  it("does not fabricate a ratio from a positive population when the metric is unavailable", () => {
    render(
      <EntityAnalyticsTable
        data={[{ ...row, population: 100, per_capita_amount: null }]}
        onSortChange={() => {}}
        columnPinning={{ left: [], right: [] }}
        columnVisibility={{}}
        columnSizing={{}}
        columnOrder={[]}
      />,
    );
    expect(screen.queryByText(/capita/)).not.toBeInTheDocument();
  });
});
