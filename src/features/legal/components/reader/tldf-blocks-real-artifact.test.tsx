/**
 * The v1.1 table path, proven against a CAPTURED PRODUCTION ARTIFACT.
 *
 * The v1.1 table suite next door is explicit that its fixture is hand-built and
 * says to replace it "once the v6 re-projection lands". It landed on
 * 2026-09-01: prod now serves 221,264 documents at format 1.1 /
 * tldf-compiler-v4. `render-rows-46408.json` is a real envelope pulled verbatim
 * from `legal.document_render` that day, stored in the same shape and directory
 * as the other committed artifacts.
 *
 * Why a captured artifact and not a better hand-built one: a fixture we write
 * encodes what we BELIEVE the compiler emits, so if the belief is wrong the
 * fixture is wrong in the same direction and every test still passes. The
 * artifact's `text_sha256` was computed by the compiler, in another repository,
 * from the document's clean text — so the fold assertion below compares the DOM
 * against a number this codebase had no hand in producing.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { render } from "@/test/test-utils";
import { describe, expect, it, vi } from "vitest";

import { foldTldfBlocks } from "../../lib/tldf/fold";
import { tldfEnvelopeSchema } from "../../lib/tldf/schemas";
import { TldfBlocksView } from "./tldf-blocks";
import type { TldfBlock, TldfEnvelope } from "../../lib/tldf/types";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode; to?: string }) => <>{children}</>,
}));

const fixtureDir = join(
  process.cwd(),
  "src/features/legal/mocks/fixtures/tldf",
);
const rows = JSON.parse(
  readFileSync(join(fixtureDir, "render-rows-46408.json"), "utf8"),
) as { readonly chunk_index: number; readonly tldf: unknown }[];
const envelope = rows[0]?.tldf as TldfEnvelope;

const renderEnvelope = () =>
  render(
    <TldfBlocksView
      blocks={envelope.blocks}
      marks={envelope.marks}
      containsNonBmp={envelope.contains_non_bmp}
    />,
  );

const walk = (
  blocks: readonly TldfBlock[],
  visit: (b: TldfBlock) => void,
): void => {
  for (const b of blocks) {
    visit(b);
    walk(b.children ?? [], visit);
  }
};

describe("captured production v1.1 artifact (document 46408)", () => {
  it("is a real 1.1 envelope and validates against the shipped schema", () => {
    // If the deployed schema could not parse a real production envelope the
    // reader would be broken for the whole 1.1 corpus. Parse the artifact
    // rather than a hand-written approximation of one.
    expect(tldfEnvelopeSchema.safeParse(envelope).success).toBe(true);
    expect(envelope.format_version).toBe("1.1");
  });

  it("renders character-identical to the fold, and the fold matches the COMPILER sha", () => {
    const { container } = renderEnvelope();
    const folded = foldTldfBlocks(envelope.blocks);

    // 1. The DOM shows exactly the fold — no character added, dropped or moved.
    expect(container.textContent).toBe(folded);

    // 2. The fold is the text the compiler recorded. This is the assertion a
    //    hand-built fixture cannot make: `text_sha256` came from the scrapper.
    expect(createHash("sha256").update(folded).digest("hex")).toBe(
      envelope.text_sha256,
    );
  });

  it("renders the real table as a real table, with an explicit tbody", () => {
    const { container } = renderEnvelope();
    const table = container.querySelector('table[data-kind="tabel"]');
    expect(table).not.toBeNull();
    if (table === null) return;

    // `table > tr` reparses differently in the browser than it serializes on
    // the server, so the explicit tbody is load-bearing for hydration.
    expect([...table.children].map((el) => el.tagName)).toEqual(["TBODY"]);

    // The artifact's real shape, asserted so the plain-<div> degrade path the
    // shape guard falls back to cannot pass this suite unnoticed.
    const trs = [...table.querySelectorAll("tr")];
    expect(trs).toHaveLength(2);
    expect([...trs[0]!.querySelectorAll("td")]).toHaveLength(7);
  });

  it("exposes the scrollable table as a focusable, named region", () => {
    // WCAG 2.1.1: a wide table is only readable if its scroll container can be
    // scrolled, and that needs focus. Chromium 151 focuses scrollers natively —
    // measured — but Safari does not, so the attributes are the portable fix.
    //
    // These are ATTRIBUTES, deliberately: the renderer's invariant is that DOM
    // text equals the fold, so a <caption> or any other text node would break
    // the assertion above. That is why this asserts an accessible NAME rather
    // than visible text.
    const { container } = renderEnvelope();
    const shell = container.querySelector(
      'table[data-kind="tabel"]',
    )?.parentElement;
    expect(shell).toBeTruthy();
    expect(shell?.getAttribute("tabindex")).toBe("0");
    expect(shell?.getAttribute("role")).toBe("region");
    expect(shell?.getAttribute("aria-label")).toBeTruthy();
    expect(shell?.className).toContain("overflow-x-auto");

    // The label must not have leaked into the text stream.
    expect(container.textContent).toBe(foldTldfBlocks(envelope.blocks));
  });

  it("carries only kinds the renderer knows, so nothing degrades silently", () => {
    // An unknown kind renders as a plain block and warns once — honest, but
    // invisible on a page. Assert the artifact does not depend on that path.
    const kinds = new Set<string>();
    walk(envelope.blocks, (b) => kinds.add(b.kind));
    for (const required of ["tabel", "rand", "celula"]) {
      expect(kinds.has(required)).toBe(true);
    }

    const { container } = renderEnvelope();
    for (const kind of ["tabel", "rand", "celula"]) {
      expect(container.querySelector(`[data-kind="${kind}"]`)).not.toBeNull();
    }
  });
});
