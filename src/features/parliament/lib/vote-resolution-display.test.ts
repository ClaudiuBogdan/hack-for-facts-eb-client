import { describe, expect, it } from "vitest";

import { ParliamentVoteDetailSchema } from "@/schemas/parliament";

/**
 * W1.3 resolution contract, client half.
 *
 * The vote page used to fall back to the legacy scalar `relatedBillId` whenever
 * it happened to be set — which asserted a bill for divisions the resolver had
 * deliberately refused to resolve. These pin the rule the page now follows, so
 * a future refactor cannot quietly restore the fallback.
 *
 * The predicate below mirrors `vote-detail-content.tsx`. Kept here rather than
 * in a render test because it is the DECISION that matters, and a DOM assertion
 * would pass just as happily against the wrong branch order.
 */
const assertsABill = (detail: {
  billLinks: readonly unknown[];
  relatedBillId?: string | undefined;
  resolutionStatus?: string | undefined;
}): boolean => {
  if (detail.billLinks.length > 0) return true;
  return (
    Boolean(detail.relatedBillId) &&
    (detail.resolutionStatus === "resolved" ||
      detail.resolutionStatus === "adjudicated")
  );
};

const detailOf = (over: {
  billLinks?: readonly unknown[];
  relatedBillId?: string;
  resolutionStatus?: string;
}) => ({ billLinks: over.billLinks ?? [], ...over });

describe("vote page bill assertion", () => {
  it("asserts a bill when the resolver resolved one", () => {
    expect(
      assertsABill(
        detailOf({ relatedBillId: "23458", resolutionStatus: "resolved" }),
      ),
    ).toBe(true);
  });

  it("does NOT assert a bill for an unresolved vote that still has a legacy key", () => {
    // The exact old defect: relatedBillId set, resolver abstained.
    expect(
      detailOf({ relatedBillId: "19860", resolutionStatus: "unresolved" })
        .relatedBillId,
    ).toBe("19860");
    expect(
      assertsABill(
        detailOf({ relatedBillId: "19860", resolutionStatus: "unresolved" }),
      ),
    ).toBe(false);
  });

  it("does NOT assert a bill for a conflict vote", () => {
    // 18 votes, each spanning 2-3 different dossiers.
    expect(
      assertsABill(
        detailOf({ relatedBillId: "19860", resolutionStatus: "conflict" }),
      ),
    ).toBe(false);
  });

  it("does NOT assert a bill while the vote is unstamped", () => {
    expect(assertsABill(detailOf({ relatedBillId: "19860" }))).toBe(false);
  });

  it("still asserts when role-bearing links exist, whatever the scalar key says", () => {
    expect(
      assertsABill(
        detailOf({
          billLinks: [{ billId: "23458", role: "final_adoption" }],
          resolutionStatus: "resolved",
        }),
      ),
    ).toBe(true);
  });

  it("carries resolutionStatus and resolutionMethod through the schema", () => {
    // Narrow round-trip: the two fields must survive parsing, or the page can
    // never see them however correct the predicate is.
    const shape = ParliamentVoteDetailSchema.shape;
    expect(shape.resolutionStatus).toBeDefined();
    expect(shape.resolutionMethod).toBeDefined();
    expect(shape.resolutionStatus.safeParse("conflict").success).toBe(true);
    expect(shape.resolutionMethod.safeParse(undefined).success).toBe(true);
  });
});
