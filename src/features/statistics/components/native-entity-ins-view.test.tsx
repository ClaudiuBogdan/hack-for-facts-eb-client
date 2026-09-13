import type { ComponentProps, ReactNode } from "react";
import { fireEvent, render, screen } from "@/test/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NativeEntityInsView } from "./native-entity-ins-view";
import {
  preparedEntityInsFixture,
  entityInsHistoryFixture,
  entityInsRequest,
} from "../test/native-entity-ins-fixtures";
import { ComparisonDatasetError } from "../lib/comparison-dataset-error";
const { read, historyRender, metricsRead } = vi.hoisted(() => ({
  read: vi.fn(),
  metricsRead: vi.fn(),
  historyRender: vi.fn(),
}));
vi.mock("../hooks/use-entity-ins-source", () => ({
  useEntityInsSource: (input: unknown) => read(input),
}));
vi.mock("../hooks/use-entity-ins-metrics", () => ({
  useEntityInsMetrics: () => metricsRead(),
}));
vi.mock("./entity-ins-source-history", () => ({
  EntityInsSourceHistory: (props: unknown) => {
    historyRender(props);
    return <div>Original history</div>;
  },
}));
vi.mock("./entity-ins-source-controls", () => ({
  EntityInsSourceControls: () => <div>Source controls</div>,
}));
vi.mock("./entity-ins-dataset-picker", () => ({
  EntityInsDatasetPicker: ({
    onSelect,
  }: {
    onSelect: (code: string) => void;
  }) => <button onClick={() => onSelect("NEW")}>Select dataset</button>,
}));
vi.mock("@tanstack/react-router", async () => ({
  ...(await vi.importActual<typeof import("@tanstack/react-router")>(
    "@tanstack/react-router",
  )),
  Link: ({
    children,
    to,
    search,
  }: {
    readonly children: ReactNode;
    readonly to: string;
    readonly search?: unknown;
  }) => (
    <a href={to} data-search={JSON.stringify(search)}>
      {children}
    </a>
  ),
}));
const query = { isFetching: false, isSuccess: true, error: null };
const props: ComponentProps<typeof NativeEntityInsView> = {
  cui: "123",
  metadata: { cui: "123", uat: { id: 1 } },
  metadataReady: true,
  search: entityInsRequest,
  reportPeriod: { type: "YEAR" as const, selection: { dates: ["2024"] } },
  onChange: vi.fn(),
};
const source = () => {
  const prepared = preparedEntityInsFixture();
  return {
    context: prepared.context,
    prepared,
    history: entityInsHistoryFixture(prepared),
    contextQuery: query,
    preparationQuery: query,
    historyQuery: query,
    refresh: vi.fn().mockResolvedValue(undefined),
  };
};
beforeEach(() => {
  vi.clearAllMocks();
  read.mockReturnValue(source());
  metricsRead.mockReturnValue({
    context: preparedEntityInsFixture().context,
    topMetrics: [
      { code: "POP107D", label: "Population" },
      { code: "FOM104D", label: "Employees (average)" },
    ],
    metrics: [],
    defaults: [],
    isLoading: false,
    isBootstrapLoading: false,
    error: null,
    refresh: vi.fn().mockResolvedValue(undefined),
  });
});
describe("native entity INS mounted view", () => {
  it("passes settled entity metadata and router search into the native hook", () => {
    render(<NativeEntityInsView {...props} />);
    expect(read).toHaveBeenCalledWith(
      expect.objectContaining({
        cui: "123",
        metadataReady: true,
        enabled: true,
        search: entityInsRequest,
      }),
    );
    expect(historyRender).toHaveBeenCalledWith(
      expect.objectContaining({ reportPeriod: props.reportPeriod }),
    );
  });
  it("opens the exact observed periods and pins in the chart editor", () => {
    render(<NativeEntityInsView {...props} />);
    const link = screen.getByRole("link", { name: "POP107D" });
    const chart = JSON.parse(link.getAttribute("data-search")!).chart;
    expect(chart.series[0]).toMatchObject({
      period: { type: "YEAR", selection: { dates: ["2025"] } },
      classificationSelections: { D0: ["0"], D1: ["210"] },
      unitCodes: ["0"],
      sirutaCodes: ["54975"],
    });
  });
  it("shows no geographic anchor separately from an unmapped INS area", () => {
    const { rerender } = render(
      <NativeEntityInsView {...props} metadata={{ cui: "123", uat: null }} />,
    );
    expect(
      screen.getByText(/no canonical geographic area/),
    ).toBeInTheDocument();
    read.mockReturnValue({
      ...source(),
      context: null,
      prepared: null,
      history: null,
    });
    rerender(<NativeEntityInsView {...props} />);
    expect(
      screen.getByText(/not mapped to an INS territory/),
    ).toBeInTheDocument();
    expect(screen.queryByText("Original history")).not.toBeInTheDocument();
  });
  it("keeps zero coverage distinct and offers the general catalog", () => {
    const current = source();
    current.context = { ...current.context, datasetCount: 0 };
    read.mockReturnValue(current);
    render(<NativeEntityInsView {...props} />);
    expect(
      screen.getByText(/No published datasets currently cover this area/),
    ).toBeInTheDocument();
  });
  it("never renders raw cached query data when guarded history is absent", () => {
    const current = source();
    read.mockReturnValue({
      ...current,
      history: null,
      historyQuery: {
        ...query,
        isSuccess: false,
        error: new Error("drift"),
        data: current.history,
      },
    });
    render(<NativeEntityInsView {...props} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      /could not be loaded or verified/,
    );
    expect(historyRender).not.toHaveBeenCalled();
  });
  it("retains verified history during a background refresh and disables duplicate refreshes", () => {
    read.mockReturnValue({
      ...source(),
      contextQuery: { ...query, isFetching: true },
    });
    render(<NativeEntityInsView {...props} />);
    expect(historyRender).toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Refresh source" }),
    ).toBeDisabled();
  });
  it("distinguishes catalog-only selections from transport failures", () => {
    read.mockReturnValue({
      ...source(),
      prepared: null,
      history: null,
      preparationQuery: {
        ...query,
        error: new ComparisonDatasetError("CATALOG_ONLY"),
      },
    });
    render(<NativeEntityInsView {...props} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      /observations are not published/,
    );
  });
  it("changing datasets clears only the seven source fields through the router callback", () => {
    render(<NativeEntityInsView {...props} search={{}} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Employees \(average\)/ }),
    );
    expect(props.onChange).toHaveBeenCalledWith({
      insDataset: "FOM104D",
      insSeries: undefined,
      insUnit: undefined,
      insTemporal: undefined,
      insSourcePins: undefined,
      insSourceUnit: undefined,
      insSourceCadence: undefined,
    });
  });
});
