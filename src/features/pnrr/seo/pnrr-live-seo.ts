import type { I18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { getSiteUrl } from "@/config/env";
import type { SupportedLocale } from "@/lib/i18n";
import { serializeForInlineScript } from "@/lib/inline-script-json";
import type { PnrrLiveHeadFacts } from "../lib/pnrr-live-route-loader";

const PNRR_ROUTE_PATH = "/pnrr";
const PNRR_SHARE_IMAGE_PATH = "/pnrr/share-image.png";
const PNRR_SOCIAL_IMAGE_WIDTH = "1200";
const PNRR_SOCIAL_IMAGE_HEIGHT = "630";
const PNRR_OG_LOCALE: Readonly<Record<SupportedLocale, string>> = {
  ro: "ro_RO",
  en: "en_US",
};

/**
 * The share card's address for a release. The versioned URL lets crawlers and
 * CDNs fetch a fresh image when the active release changes.
 */
export function buildPnrrLiveShareImageUrl({
  siteUrl,
  releaseId,
}: {
  readonly siteUrl: string;
  readonly releaseId: string;
}): string {
  return `${siteUrl}${PNRR_SHARE_IMAGE_PATH}?${new URLSearchParams({ release: releaseId }).toString()}`;
}

/**
 * The `/pnrr` head, built only from the active release, in the request's own
 * language (`translatorFor`). It names the release, dates the dataset by the
 * MIPE project snapshot (never by the ORDS capture), and shows the share card
 * only when a non-abstained release was read.
 */
export function buildPnrrLiveRouteHead({
  facts,
  locale,
  translator,
  siteUrl = getSiteUrl(),
}: {
  readonly facts: PnrrLiveHeadFacts | null;
  readonly locale: SupportedLocale;
  readonly translator: I18n;
  readonly siteUrl?: string;
}) {
  const canonical = `${siteUrl}${PNRR_ROUTE_PATH}`;
  const title = translator._(
    msg`PNRR - National Recovery and Resilience Plan | Transparenta.eu`,
  );
  const description = translator._(
    msg`Progress, national totals and county distribution for PNRR projects reported by MIPE. The MIPE snapshot and ORDS capture dates appear separately.`,
  );
  const imageAlt = translator._(
    msg`Transparenta.eu preview for Romania PNRR projects`,
  );
  const reportedProjectCount = facts?.reportedProjectCount ?? null;
  const image =
    facts && facts.releaseState !== "abstained"
      ? buildPnrrLiveShareImageUrl({ siteUrl, releaseId: facts.releaseId })
      : null;

  const dataset = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: translator._(msg`Romania PNRR projects reported by MIPE`),
    description,
    url: canonical,
    ...(facts ? { identifier: facts.releaseId } : {}),
    ...(facts?.mipeProjectsAsOf
      ? { dateModified: facts.mipeProjectsAsOf.slice(0, 10) }
      : {}),
    spatialCoverage: { "@type": "Place", name: "Romania" },
    publisher: {
      "@type": "Organization",
      "@id": `${siteUrl}#organization`,
      name: "Transparenta.eu",
      url: siteUrl,
    },
    isBasedOn: "https://mfe.gov.ro/pnrr-dashboard",
    ...(reportedProjectCount !== null
      ? {
          measurementTechnique: translator._(
            msg`${reportedProjectCount} projects as reported by MIPE in the active release.`,
          ),
        }
      : {}),
  };

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: canonical,
    ...(image ? { image } : {}),
    isPartOf: { "@type": "WebSite", name: "Transparenta.eu", url: siteUrl },
    about: dataset,
  };

  const imageMeta = image
    ? [
        { property: "og:image", content: image },
        { property: "og:image:width", content: PNRR_SOCIAL_IMAGE_WIDTH },
        { property: "og:image:height", content: PNRR_SOCIAL_IMAGE_HEIGHT },
        { property: "og:image:alt", content: imageAlt },
        { name: "twitter:image", content: image },
        { name: "twitter:image:alt", content: imageAlt },
      ]
    : [];

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: "index,follow" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Transparenta.eu" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: canonical },
      { property: "og:locale", content: PNRR_OG_LOCALE[locale] },
      ...imageMeta,
      {
        name: "twitter:card",
        content: image ? "summary_large_image" : "summary",
      },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ],
    links: [{ rel: "canonical", href: canonical }],
    scripts: [
      {
        type: "application/ld+json",
        children: serializeForInlineScript(dataset),
      },
      {
        type: "application/ld+json",
        children: serializeForInlineScript(webPage),
      },
    ],
  };
}
