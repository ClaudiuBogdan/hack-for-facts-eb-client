import type { ComponentProps } from "react";
import { fireEvent, render, screen } from "@/test/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NativeEntityInsView } from "./native-entity-ins-view";
import {
  preparedEntityInsFixture,
  entityInsHistoryFixture,
  entityInsRequest,
} from "../test/native-entity-ins-fixtures";
import { ComparisonDatasetError } from "../lib/comparison-dataset-error";
const { read, historyRender } = vi.hoisted(() => ({
  read: vi.fn(),
  historyRender: vi.fn(),
}));
vi.mock("../hooks/use-entity-ins-source", () => ({
  useEntityInsSource: (input: unknown) => read(input),
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
    fireEvent.click(screen.getByRole("button", { name: "Select dataset" }));
    expect(props.onChange).toHaveBeenCalledWith({
      insDataset: "NEW",
      insSeries: undefined,
      insUnit: undefined,
      insTemporal: undefined,
      insSourcePins: undefined,
      insSourceUnit: undefined,
      insSourceCadence: undefined,
    });
  });
});
