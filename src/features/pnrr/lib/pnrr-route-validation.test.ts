import { describe, expect, it } from "vitest";

import { isIsoCalendarDate, normalizePnrrCui } from "./pnrr-route-validation";
import { pnrrProjectsSearchSchema } from "@/routes/pnrr_.proiecte";

describe("normalizePnrrCui", () => {
  it.each([
    ["12345678", "12345678"],
    ["RO12345678", "12345678"],
    [" ro12345678 ", "12345678"],
  ])("accepts documented public CUI forms", (input, expected) => {
    expect(normalizePnrrCui(input)).toBe(expected);
  });

  it.each(["evil123", "RO 123", "12-34", "1", "12345678901"])(
    "rejects arbitrary embedded or malformed digits: %s",
    (input) => {
      expect(normalizePnrrCui(input)).toBeNull();
    },
  );
});

describe("isIsoCalendarDate", () => {
  it("accepts real ISO calendar dates", () => {
    expect(isIsoCalendarDate("2026-07-26")).toBe(true);
    expect(isIsoCalendarDate("2024-02-29")).toBe(true);
  });

  it.each(["2026-02-30", "2026-7-26", "not-a-date"])(
    "rejects invalid dates: %s",
    (input) => {
      expect(isIsoCalendarDate(input)).toBe(false);
    },
  );
});

describe("pnrrProjectsSearchSchema", () => {
  it("accepts an ordered ISO date interval", () => {
    expect(
      pnrrProjectsSearchSchema.parse({
        from: "2026-01-01",
        to: "2026-07-26",
      }),
    ).toMatchObject({ from: "2026-01-01", to: "2026-07-26" });
  });

  it.each([{ from: "2026-02-30" }, { from: "2026-07-27", to: "2026-07-26" }])(
    "rejects an invalid URL date scope",
    (input) => {
      expect(pnrrProjectsSearchSchema.safeParse(input).success).toBe(false);
    },
  );
});
