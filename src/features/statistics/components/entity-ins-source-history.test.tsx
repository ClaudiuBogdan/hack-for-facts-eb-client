import type { ComponentProps } from "react";
import { fireEvent, render, screen, within } from "@/test/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EntityInsSourceHistory } from "./entity-ins-source-history";
import {
  preparedEntityInsFixture,
  entityInsHistoryFixture,
} from "../test/native-entity-ins-fixtures";
import { observation } from "../test/native-landing-fixtures";
const { chart, exported, table } = vi.hoisted(() => ({
  chart: vi.fn(),
  exported: vi.fn(),
  table: vi.fn(),
}));
vi.mock("./detail-observations-chart", () => ({
  DetailObservationsChart: (props: unknown) => {
    chart(props);
    return <div>Chart</div>;
  },
}));
vi.mock("./detail-export-button", () => ({
  DetailExportButton: (props: unknown) => {
    exported(props);
    return <div>Export</div>;
  },
}));
vi.mock("./detail-observations-table", () => ({
  DetailObservationsTable: (props: unknown) => {
    table(props);
    return <div>Table</div>;
  },
}));
const prepared = preparedEntityInsFixture();
const props: ComponentProps<typeof EntityInsSourceHistory> = {
  prepared,
  history: entityInsHistoryFixture(prepared),
  reportPeriod: {
    type: "YEAR" as const,
    selection: { dates: ["2024", "2025"] },
  },
  onChange: vi.fn(),
};
beforeEach(() => vi.clearAllMocks());
describe("native entity INS source presentation", () => {
  it("shows missing selected periods separately and never sums or substitutes latest", () => {
    render(
      <EntityInsSourceHistory
        {...props}
        history={{
          ...props.history,
          observations: [
            observation("54975", 2025, "12345678901234567890.012300"),
          ],
        }}
      />,
    );
    const selected = screen.getByRole("region", {
      name: "Selected INS periods",
    });
    expect(within(selected).getByText("2024")).toBeInTheDocument();
    expect(within(selected).getByText("No observation")).toBeInTheDocument();
    expect(
      within(selected).getByText("12345678901234567890.012300"),
    ).toBeInTheDocument();
  });
  it("keeps a missing latest cell and an explicit empty status, and hides all-null charts", () => {
    const row = { ...observation("54975", 2025, null), value_status: "" };
    render(
      <EntityInsSourceHistory
        {...props}
        history={{ ...props.history, observations: [row] }}
      />,
    );
    const latest = screen.getByRole("region", {
      name: "Latest INS observation",
    });
    expect(within(latest).getByText('""')).toBeInTheDocument();
    expect(chart).not.toHaveBeenCalled();
    expect(exported).toHaveBeenCalledWith(
      expect.objectContaining({ observations: [row], complete: true }),
    );
  });
  it("does not derive a chart or selected-period summary from an inspection preview", () => {
    render(
      <EntityInsSourceHistory
        {...props}
        history={{ ...props.history, mode: "inspection", truncated: true }}
      />,
    );
    expect(screen.getByText(/This preview is incomplete/)).toBeInTheDocument();
    expect(chart).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("region", { name: "Selected INS periods" }),
    ).not.toBeInTheDocument();
    expect(exported).toHaveBeenCalledWith(
      expect.objectContaining({ complete: false }),
    );
    expect(table).toHaveBeenCalled();
  });
  it("exports a complete terminal inspection independently of chart eligibility", () => {
    render(
      <EntityInsSourceHistory
        {...props}
        history={{ ...props.history, mode: "inspection", truncated: false }}
      />,
    );
    expect(exported).toHaveBeenCalledWith(
      expect.objectContaining({ complete: true }),
    );
    expect(chart).not.toHaveBeenCalled();
  });
  it("labels cadence mismatch without displaying the latest cell as the selected period", () => {
    render(
      <EntityInsSourceHistory
        {...props}
        reportPeriod={{ type: "MONTH", selection: { dates: ["2025-01"] } }}
      />,
    );
    const selected = screen.getByRole("region", {
      name: "Selected INS periods",
    });
    expect(selected).toHaveTextContent(/different frequency/);
    expect(within(selected).queryByText("100")).not.toBeInTheDocument();
  });
  it("pages displayed rows while retaining the full vector for export", () => {
    const observations = Array.from({ length: 65 }, (_, index) =>
      observation("54975", 1960 + index),
    );
    render(
      <EntityInsSourceHistory
        {...props}
        history={{ ...props.history, observations }}
      />,
    );
    expect(table).toHaveBeenLastCalledWith(
      expect.objectContaining({ observations: observations.slice(0, 50) }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Next observations" }));
    expect(table).toHaveBeenLastCalledWith(
      expect.objectContaining({ observations: observations.slice(50) }),
    );
    expect(exported).toHaveBeenLastCalledWith(
      expect.objectContaining({ observations, complete: true }),
    );
  });
  it("hides every data surface when source publication validation fails", () => {
    render(
      <EntityInsSourceHistory
        {...props}
        history={{ ...props.history, observations: [observation("CJ", 2025)] }}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/could not verify/);
    expect(table).not.toHaveBeenCalled();
    expect(exported).not.toHaveBeenCalled();
  });
});
