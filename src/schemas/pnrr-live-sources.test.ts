import { describe, expect, it } from "vitest";

import {
  pnrrDocumentReferenceSchema,
  pnrrProgramRevisionSchema,
} from "./pnrr-live";

describe("PNRR source-aware legal schemas", () => {
  it("accepts a Council revision without a fabricated CELEX identifier", () => {
    const revision = pnrrProgramRevisionSchema.parse({
      revisionId: "council:ST-14452-2025",
      identifierScheme: "council_register",
      legalReference: "ST 14452/25",
      celex: null,
      legalStatus: "adopted",
      isCurrentAdopted: true,
      effectiveDate: "2025-11-13",
      sourceAuthority: "Council of the European Union",
      sourceUrl:
        "https://data.consilium.europa.eu/doc/document/ST-14452-2025-INIT/en/pdf",
      documentCount: 2,
      textReadyDocumentCount: 0,
      ocrRequiredDocumentCount: 1,
    });

    expect(revision.celex).toBeNull();
    expect(revision.ocrRequiredDocumentCount).toBe(1);
  });

  it("keeps program document custody separate from extracted claims", () => {
    const document = pnrrDocumentReferenceSchema.parse({
      documentKey: "program:pdf:council:ST-14452-2025:EN:annex",
      acquisitionKey: null,
      lotKey: null,
      announcementKey: null,
      programRevisionId: "council:ST-14452-2025",
      language: "EN",
      documentRole: "annex",
      fileName: "annex",
      mimeType: "application/pdf",
      documentType: "program_annex",
      sourceUrl:
        "https://data.consilium.europa.eu/doc/document/ST-14452-2025-ADD-1/en/pdf",
      retrievedAt: "2026-07-26T09:00:00Z",
      contentSha256:
        "3a869b1837f5576ab47c4e9fcfeb09deaf8689709f173ff2ca4d80ac79ce3b01",
      extractionState: "ocr_required",
      hasObjectCustody: true,
    });

    expect(document.extractionState).toBe("ocr_required");
    expect(document).not.toHaveProperty("text");
    expect(document).not.toHaveProperty("claims");
  });
});
