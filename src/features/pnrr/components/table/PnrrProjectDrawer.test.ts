import { describe, expect, it } from "vitest";

import { buildProjectDetailHref } from "../../lib/project-detail-link";

describe("buildProjectDetailHref", () => {
  it("opens the contextual profile through a stable MIPE engagement lookup", () => {
    expect(buildProjectDetailHref(" 3224547880 ")).toBe(
      "/pnrr/proiecte/mipe-engagement%3A3224547880",
    );
  });
});
