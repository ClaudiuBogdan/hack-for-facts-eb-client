import { i18n, type I18n } from "@lingui/core";
import { describe, expect, it } from "vitest";

import type { PnrrLiveHeadFacts } from "../lib/pnrr-live-route-loader";
import { buildPnrrLiveRouteHead } from "./pnrr-live-seo";

// The test build's Lingui stand-in returns source messages, as `translatorFor`
// does for a message missing from the loaded catalogs.
const translator = i18n as unknown as I18n;
const SITE = "https://transparenta.eu";

const facts: PnrrLiveHeadFacts = {
  releaseId: "pnrr-release-v1:mipe-20261015T000000Z",
  releaseState: "degraded",
  mipeProjectsAsOf: "2026-10-15T00:00:00Z",
  ordsPaymentsCaptureAsOf: "2026-11-13T06:17:28Z",
  reportedProjectCount: 21710,
};

type Head = ReturnType<typeof buildPnrrLiveRouteHead>;

const metaContent = (head: Head, key: string) => {
  const meta = head.meta.find(
    (entry) =>
      ("property" in entry && entry.property === key) ||
      ("name" in entry && entry.name === key),
  );
  return meta && "content" in meta ? meta.content : undefined;
};

const dataset = (head: Head) =>
  JSON.parse(head.scripts[0]!.children) as Record<string, unknown>;

describe("buildPnrrLiveRouteHead", () => {
  it("versions the share card by the active release and dates the dataset by the MIPE snapshot", () => {
    const head = buildPnrrLiveRouteHead({
      facts,
      locale: "ro",
      translator,
      siteUrl: SITE,
    });

    expect(metaContent(head, "og:image")).toBe(
      `${SITE}/pnrr/share-image.png?release=pnrr-release-v1%3Amipe-20261015T000000Z`,
    );
    expect(metaContent(head, "twitter:card")).toBe("summary_large_image");
    expect(metaContent(head, "og:locale")).toBe("ro_RO");
    expect(dataset(head)).toMatchObject({
      identifier: facts.releaseId,
      dateModified: "2026-10-15",
      measurementTechnique:
        "21710 projects as reported by MIPE in the active release.",
    });
    expect(JSON.stringify(dataset(head))).not.toContain("2026-11-13");
  });

  it("shows no share card or release facts when no release was read", () => {
    const head = buildPnrrLiveRouteHead({
      facts: null,
      locale: "en",
      translator,
      siteUrl: SITE,
    });

    expect(metaContent(head, "og:image")).toBeUndefined();
    expect(metaContent(head, "twitter:card")).toBe("summary");
    expect(metaContent(head, "og:locale")).toBe("en_US");
    expect(dataset(head)).not.toHaveProperty("identifier");
    expect(dataset(head)).not.toHaveProperty("measurementTechnique");
  });

  it("shows no share card for an abstained release", () => {
    const head = buildPnrrLiveRouteHead({
      facts: { ...facts, releaseState: "abstained", reportedProjectCount: null },
      locale: "ro",
      translator,
      siteUrl: SITE,
    });

    expect(metaContent(head, "og:image")).toBeUndefined();
  });
});
