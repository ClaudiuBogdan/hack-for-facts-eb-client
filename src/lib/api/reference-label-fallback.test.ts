import { describe, expect, it, vi } from "vitest";
vi.mock("./reference-lookups", () => ({
  fetchEntityLabels: vi.fn(),
  fetchUatLabels: vi.fn(),
}));
import { fetchEntityLabels, fetchUatLabels } from "./reference-lookups";
import { getEntityLabels, getUatLabels } from "./labels";

describe("shared label lookup fallback", () => {
  it("preserves empty results on failed entity and UAT hydration for existing callers", async () => {
    vi.mocked(fetchEntityLabels).mockRejectedValue(
      new Error("network unavailable"),
    );
    vi.mocked(fetchUatLabels).mockRejectedValue(new Error("invalid response"));
    await expect(getEntityLabels(["4305857"])).resolves.toEqual([]);
    await expect(getUatLabels(["1373"])).resolves.toEqual([]);
  });
});
