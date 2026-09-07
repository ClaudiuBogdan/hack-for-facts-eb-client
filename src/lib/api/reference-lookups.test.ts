import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/graphql/graphql-client", () => ({ graphqlQuery: vi.fn() }));
import { graphqlQuery } from "@/lib/graphql/graphql-client";
import {
  fetchCountyOptions,
  fetchEntityLabels,
  fetchEntityOptions,
  fetchUatLabels,
  fetchUatOptions,
} from "./reference-lookups";
const query = vi.mocked(graphqlQuery);
const territory = (id: number) => ({
  id,
  name: `Town ${id}`,
  countyCode: "CJ",
  countyName: "Cluj",
});
const entity = (cui: string) => ({
  cui,
  name: `Entity ${cui}`,
  territory: null,
});
const page = (
  field: string,
  nodes: unknown[],
  next: string | null = null,
  totalCount = nodes.length,
) => ({
  [field]: {
    edges: nodes.map((node) => ({ node })),
    totalCount,
    pageInfo: { hasNextPage: next !== null, endCursor: next },
  },
});
beforeEach(() => {
  query.mockReset();
});

describe("native map reference lookups", () => {
  it("keeps county mnemonics and searches names without diacritics", async () => {
    query.mockResolvedValue({
      referenceCounties: [
        { countyCode: "CJ", countyName: "Cluj" },
        { countyCode: "IS", countyName: "Iași" },
      ],
    });
    const result = await fetchCountyOptions({
      search: "iasi",
      offset: 0,
      limit: 1,
    });
    expect(result.nodes).toEqual([{ county_code: "IS", county_name: "Iași" }]);
    expect(result.pageInfo).toMatchObject({
      totalCount: 1,
      hasNextPage: false,
    });
    expect(query.mock.calls[0]?.[2]).toMatchObject({ auth: "none" });
  });
  it("uses canonical territory IDs and forwards opaque cursors and cancellation", async () => {
    query.mockResolvedValue(
      page("referenceTerritories", [territory(1373)], "next-cursor", 2),
    );
    const signal = new AbortController().signal;
    const result = await fetchUatOptions({
      search: "Cluj",
      after: "opaque-cursor",
      limit: 500,
      signal,
    });
    expect(result.nodes[0]?.id).toBe("1373"); // Cluj-Napoca SIRUTA is 54975, a different namespace.
    expect(result.nextOffset).toBe("next-cursor");
    expect(query.mock.calls[0]?.[1]).toEqual({
      filter: { isUat: { eq: true }, name: { contains: "Cluj" } },
      first: 100,
      after: "opaque-cursor",
    });
    expect(query.mock.calls[0]?.[2]).toEqual({ auth: "none", signal });
  });
  it("starts a fresh search without a cursor and retains bare creditor CUIs", async () => {
    query.mockResolvedValue(
      page("referencePublicEntities", [entity("4305857")]),
    );
    expect(
      (await fetchEntityOptions({ search: "4305857" })).nodes[0]?.cui,
    ).toBe("4305857");
    expect(query.mock.calls[0]?.[1]).toEqual({
      filter: { cui: { eq: "4305857" } },
      first: 100,
      after: undefined,
    });
    await fetchEntityOptions({ search: "Cluj" });
    expect(query.mock.calls[1]?.[1]).toMatchObject({
      filter: { name: { contains: "Cluj" } },
      after: undefined,
    });
  });
  it.each([null, "same"])(
    "rejects a continuing page without an advancing cursor (%s)",
    async (cursor) => {
      query.mockResolvedValue({
        referenceTerritories: {
          edges: [{ node: territory(1) }],
          totalCount: 2,
          pageInfo: { hasNextPage: true, endCursor: cursor },
        },
      });
      await expect(fetchUatOptions({ after: "same" })).rejects.toThrow(
        "pagination did not advance",
      );
    },
  );
  it("rejects malformed native territory identities", async () => {
    query.mockResolvedValue(
      page("referenceTerritories", [{ ...territory(1), id: "54975" }]),
    );
    await expect(fetchUatOptions()).rejects.toThrow();
  });
  it("hydrates more than one page of labels without dropping later IDs", async () => {
    query.mockImplementation(async (_document, variables) => {
      const ids = (variables?.filter as { id: { in: number[] } }).id.in;
      return page("referenceTerritories", ids.map(territory));
    });
    const ids = Array.from({ length: 205 }, (_, i) => i + 1);
    const result = await fetchUatLabels(ids);
    expect(result).toHaveLength(205);
    expect(result[result.length - 1]).toEqual({ id: "205", label: "Town 205" });
    expect(query).toHaveBeenCalledTimes(3);
  });
  it("continues native cursors within a requested label batch", async () => {
    query
      .mockResolvedValueOnce(
        page("referencePublicEntities", [entity("1")], "page-two", 2),
      )
      .mockResolvedValueOnce(page("referencePublicEntities", [entity("2")]));
    expect(await fetchEntityLabels(["1", "2"])).toHaveLength(2);
    expect(query.mock.calls[1]?.[1]).toMatchObject({
      after: "page-two",
      filter: { cui: { in: ["1", "2"] } },
    });
  });
  it("leaves unresolved IDs without invented labels and skips empty lookups", async () => {
    expect(await fetchUatLabels([])).toEqual([]);
    expect(query).not.toHaveBeenCalled();
    query.mockResolvedValue(page("referenceTerritories", [territory(1)]));
    expect(await fetchUatLabels(["1", "2"])).toEqual([
      { id: "1", label: "Town 1" },
    ]);
  });
  it("rejects unexpected or repeated label identities", async () => {
    query.mockResolvedValue(page("referenceTerritories", [territory(2)]));
    await expect(fetchUatLabels(["1"])).rejects.toThrow("identity mismatch");
    query.mockResolvedValue(
      page("referenceTerritories", [territory(1), territory(1)]),
    );
    await expect(fetchUatLabels(["1"])).rejects.toThrow("identity mismatch");
  });
  it("does not reinterpret malformed IDs as canonical territories", async () => {
    await expect(fetchUatLabels(["13oops"])).rejects.toThrow(
      "Invalid canonical territory ID",
    );
    expect(query).not.toHaveBeenCalled();
  });
});
