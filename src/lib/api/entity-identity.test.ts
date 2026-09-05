import { beforeEach, describe, expect, it, vi } from "vitest";
import { graphqlQuery } from "@/lib/graphql/graphql-client";
import { fetchEntityIdentity } from "./entity-identity";
vi.mock("@/lib/graphql/graphql-client", () => ({ graphqlQuery: vi.fn() }));
const territory = {
  id: 1,
  level: "uat",
  kind: "municipality",
  territoryKey: "siruta:54975",
  parentId: null,
  nutsCode: null,
  name: "Cluj-Napoca",
  countyCode: "CJ",
  countyName: "Cluj",
  sirutaCode: "54975",
  population: null,
};
beforeEach(() => vi.resetAllMocks());
describe("canonical entity identity independent of fiscal reads", () => {
  it("reads only kernel identity fields anonymously and preserves nullable population", async () => {
    vi.mocked(graphqlQuery).mockResolvedValue({
      entity: { cui: "123", organization: { name: "Entity" }, territory },
    });
    const signal = new AbortController().signal;
    await expect(fetchEntityIdentity("123", signal)).resolves.toMatchObject({
      cui: "123",
      name: "Entity",
      uat: {
        id: 1,
        territory_key: "siruta:54975",
        siruta_code: 54975,
        population: null,
      },
    });
    const [query, variables, options] = vi.mocked(graphqlQuery).mock.calls[0];
    expect(query).not.toMatch(
      /\b(budget|reference|reportType|normalization)\b/,
    );
    expect(variables).toEqual({ cui: "123" });
    expect(options).toEqual({ auth: "none", signal });
  });
  it("distinguishes missing entity from missing geographic anchor", async () => {
    vi.mocked(graphqlQuery)
      .mockResolvedValueOnce({ entity: null })
      .mockResolvedValueOnce({
        entity: { cui: "123", organization: null, territory: null },
      });
    await expect(fetchEntityIdentity("123")).resolves.toBeNull();
    await expect(fetchEntityIdentity("123")).resolves.toEqual({
      cui: "123",
      name: "123",
      uat: null,
    });
  });
  it("rejects response identity drift and incomplete geography", async () => {
    vi.mocked(graphqlQuery)
      .mockResolvedValueOnce({
        entity: { cui: "456", organization: null, territory: null },
      })
      .mockResolvedValueOnce({
        entity: { cui: "123", organization: null, territory: {} },
      });
    await expect(fetchEntityIdentity("123")).rejects.toThrow(
      "identity mismatch",
    );
    await expect(fetchEntityIdentity("123")).rejects.toThrow();
  });
  it("propagates read failures rather than inventing an empty identity", async () => {
    vi.mocked(graphqlQuery).mockRejectedValue(new Error("offline"));
    await expect(fetchEntityIdentity("123")).rejects.toThrow("offline");
  });
  it("never requests malformed identifiers or an aborted read", async () => {
    await expect(fetchEntityIdentity("123abc")).rejects.toThrow(
      "Invalid entity CUI",
    );
    const controller = new AbortController();
    controller.abort();
    await expect(
      fetchEntityIdentity("123", controller.signal),
    ).rejects.toThrow();
    expect(graphqlQuery).not.toHaveBeenCalled();
  });
});
