import type { ReactNode } from "react";
import {
  QueryClient,
  QueryClientProvider,
  hashKey,
} from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchInsEntityContext } from "../api/graphql/ins-entity-context";
import {
  prepareEntityInsSource,
  fetchEntityInsHistory,
} from "../api/native-entity-ins-api";
import { insEntityContextFixture } from "../test/ins-entity-context-fixtures";
import {
  preparedEntityInsFixture,
  entityInsRequest,
  entityInsHistoryFixture,
} from "../test/native-entity-ins-fixtures";
import {
  entityInsHistoryOptions,
  entityInsPreparationOptions,
  useEntityInsSource,
  type EntityInsSourceInput,
} from "./use-entity-ins-source";
vi.mock("../api/graphql/ins-entity-context", async (original) => ({
  ...(await original<typeof import("../api/graphql/ins-entity-context")>()),
  fetchInsEntityContext: vi.fn(),
}));
vi.mock("../api/native-entity-ins-api", () => ({
  prepareEntityInsSource: vi.fn(),
  fetchEntityInsHistory: vi.fn(),
}));
const input: EntityInsSourceInput = {
  cui: "123",
  enabled: true,
  metadataReady: true,
  metadata: { cui: "123", uat: { id: 1, level: "uat", territory_key: "test" } },
  search: entityInsRequest,
};
function harness() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const wrapper = ({ children }: { readonly children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(fetchInsEntityContext).mockResolvedValue(insEntityContextFixture());
  vi.mocked(prepareEntityInsSource).mockResolvedValue(
    preparedEntityInsFixture(),
  );
  vi.mocked(fetchEntityInsHistory).mockResolvedValue(entityInsHistoryFixture());
});
describe("native entity INS query lifecycle", () => {
  it.each([
    { enabled: false },
    { metadataReady: false },
    { cui: "12345678901" },
    { metadata: null },
    { metadata: { cui: "456", uat: { id: 1 } } },
    { metadata: { cui: "123", uat: null } },
    { metadata: { cui: "123" } },
  ])(
    "does not query an inactive, withheld, unanchored or placeholder entity %j",
    (extra) => {
      const { wrapper } = harness();
      const { result } = renderHook(
        () => useEntityInsSource({ ...input, ...extra }),
        { wrapper },
      );
      expect(result.current.context).toBeNull();
      expect(result.current.history).toBeNull();
      expect(fetchInsEntityContext).not.toHaveBeenCalled();
      expect(prepareEntityInsSource).not.toHaveBeenCalled();
    },
  );
  it.each(["county", "uat", "locality", "region", "country"])(
    "accepts canonical %s anchors without fiscal/SIRUTA checks",
    async (level) => {
      const { wrapper } = harness();
      const { result } = renderHook(
        () =>
          useEntityInsSource({
            ...input,
            metadata: { cui: "123", uat: { level } },
          }),
        { wrapper },
      );
      await waitFor(() => expect(result.current.history).not.toBeNull());
      expect(fetchInsEntityContext).toHaveBeenCalledWith(
        "123",
        expect.any(AbortSignal),
      );
    },
  );
  it("distinguishes unmapped context from mapped zero coverage", async () => {
    vi.mocked(fetchInsEntityContext).mockResolvedValueOnce(null);
    const first = renderHook(() => useEntityInsSource(input), {
      wrapper: harness().wrapper,
    });
    await waitFor(() =>
      expect(first.result.current.contextQuery.isSuccess).toBe(true),
    );
    expect(first.result.current.context).toBeNull();
    expect(prepareEntityInsSource).not.toHaveBeenCalled();
    first.unmount();
    vi.mocked(fetchInsEntityContext).mockResolvedValue({
      ...insEntityContextFixture(),
      datasetCount: 0,
    });
    const second = renderHook(
      () => useEntityInsSource({ ...input, search: {} }),
      { wrapper: harness().wrapper },
    );
    await waitFor(() =>
      expect(second.result.current.context?.datasetCount).toBe(0),
    );
    expect(prepareEntityInsSource).not.toHaveBeenCalled();
  });
  it("does not expose previous-CUI data when navigation metadata is still a placeholder", async () => {
    const { wrapper } = harness();
    const { result, rerender } = renderHook(
      (props: EntityInsSourceInput) => useEntityInsSource(props),
      { wrapper, initialProps: input },
    );
    await waitFor(() => expect(result.current.history).not.toBeNull());
    rerender({ ...input, cui: "456", metadataReady: false });
    expect(result.current.context).toBeNull();
    expect(result.current.prepared).toBeNull();
    expect(result.current.history).toBeNull();
    expect(fetchInsEntityContext).toHaveBeenCalledTimes(1);
  });
  it("fresh-source retry uses the new publication for history", async () => {
    const { wrapper } = harness();
    const { result } = renderHook(() => useEntityInsSource(input), { wrapper });
    await waitFor(() => expect(result.current.history).not.toBeNull());
    const fresh = preparedEntityInsFixture("2");
    vi.mocked(prepareEntityInsSource).mockResolvedValue(fresh);
    vi.mocked(fetchEntityInsHistory).mockResolvedValue(
      entityInsHistoryFixture(fresh),
    );
    await act(async () => result.current.refresh());
    await waitFor(() =>
      expect(result.current.history?.descriptor.metadata.revision_id).toBe("2"),
    );
    expect(fetchEntityInsHistory).toHaveBeenLastCalledWith(
      fresh,
      expect.any(AbortSignal),
    );
  });
  it("failed fresh context hides cached downstream history and propagates the error", async () => {
    const { wrapper } = harness();
    const { result } = renderHook(() => useEntityInsSource(input), { wrapper });
    await waitFor(() => expect(result.current.history).not.toBeNull());
    vi.mocked(fetchInsEntityContext).mockRejectedValue(
      new Error("unavailable"),
    );
    await act(async () => {
      await expect(result.current.refresh()).rejects.toThrow("unavailable");
    });
    await waitFor(() => expect(result.current.contextQuery.isError).toBe(true));
    expect(result.current.history).toBeNull();
  });
  it("source cache ignores unrelated fiscal periods and retains explicit null identity", () => {
    const key = (search: typeof entityInsRequest) => hashKey(entityInsPreparationOptions("123", insEntityContextFixture(), search).queryKey);
    const first = { ...entityInsRequest, year: 2024, month: "01" };
    const second = { ...entityInsRequest, year: 2025, month: "02" };
    expect(key(first)).toBe(key(second));
    expect(hashKey(entityInsPreparationOptions("123", insEntityContextFixture(), { insDataset: "POP107D", insSourceUnit: null }).queryKey)).not.toBe(
      hashKey(entityInsPreparationOptions("123", insEntityContextFixture(), { insDataset: "POP107D" }).queryKey));
  });
  it("history cache separates publication and effective source filter but reuses cadence-only changes", () => {
    const base = preparedEntityInsFixture();
    const key = (p: typeof base) =>
      hashKey(entityInsHistoryOptions("123", p).queryKey);
    expect(key(base)).not.toBe(key(preparedEntityInsFixture("2")));
    expect(key(base)).not.toBe(
      key({
        ...base,
        resolved: {
          ...base.resolved,
          filter: { ...base.resolved.filter, unitCodes: ["1"] },
        },
      }),
    );
    expect(key(base)).toBe(
      key({
        ...base,
        resolved: {
          ...base.resolved,
          scope: { ...base.resolved.scope, periodicity: "MONTHLY" },
        },
      }),
    );
  });
});
