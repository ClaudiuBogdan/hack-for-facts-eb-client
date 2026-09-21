import { describe, expect, it, vi } from "vitest";
import { profileFixture } from "./profile.fixture";
import { ngoProfileOverviewSchema, fetchNgoProfileOverview } from "./api";
const query = vi.hoisted(() => vi.fn());
vi.mock("@/lib/graphql/graphql-client", () => ({ graphqlQuery: query }));
describe("live NGO profile contract", () => {
  it("keeps false, null and multiple source observations", () => {
    const profile = ngoProfileOverviewSchema.parse({
      ...profileFixture,
      registryRecords: [
        profileFixture.registryRecords[0],
        { ...profileFixture.registryRecords[0], id: "second" },
      ],
    });
    expect(profile.fiscal.data?.vatPayer).toBe(false);
    expect(profile.fiscal.data?.declaredFiscallyInactive).toBeNull();
    expect(profile.fiscal.data?.capturedAt).toBeNull();
    expect(profile.registryRecords).toHaveLength(2);
  });
  it("does not turn unavailable data into zero/false", () => {
    expect(
      ngoProfileOverviewSchema.parse({
        ...profileFixture,
        fiscal: { availability: "unavailable", data: null },
      }).fiscal.data,
    ).toBeNull();
    expect(() =>
      ngoProfileOverviewSchema.parse({
        ...profileFixture,
        fiscal: { availability: "available", data: null },
      }),
    ).toThrow();
  });
  it("uses GraphQL even when legacy mock mode is enabled and propagates failures", async () => {
    vi.stubEnv("VITE_USE_MOCK_DATA", "true");
    try {
      query.mockResolvedValueOnce({ ngoProfileOverview: profileFixture });
      expect(await fetchNgoProfileOverview(profileFixture.cui)).toEqual(
        profileFixture,
      );
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("NgoProfileOverview"),
        { cui: profileFixture.cui },
        { operationName: "NgoProfileOverview", auth: "none" },
      );
      query.mockRejectedValueOnce(new Error("unavailable"));
      await expect(fetchNgoProfileOverview(profileFixture.cui)).rejects.toThrow(
        "unavailable",
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
