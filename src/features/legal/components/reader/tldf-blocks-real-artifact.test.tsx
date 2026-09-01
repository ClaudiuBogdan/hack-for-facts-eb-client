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
 * fixture is wrong in the same direction and every test still passes. Here the
 * blocks and the sha both came from the compiler, so the comparison is real.
 *
 * BE PRECISE ABOUT WHAT THAT PROVES. `text_sha256` is independent of THIS
 * codebase, not of the compiler: blocks and sha travel in the same artifact,
 * written by the same producer. So a green run proves client/compiler textual
 * agreement — that the renderer and the fold reproduce the compiler's own
 * segmentation — NOT that the segmentation matches the authoritative source.
 * The gate that escapes that loop lives in the scrapper and compares the fold
 * against RAW `portal_text.documents.text_sha256`, computed before TLDF
 * existed; it was run against the v6 corpus on 2026-09-01 (500 sampled
 * documents, 200 chunked, 0 mismatches). Do not conflate the two.
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

// The renderer's fallback signal is `logger.warn`, not `console.warn`, and the
// logger is built at module scope — so it has to be mocked here, hoisted, or
// the spy attaches to nothing and the assertion below silently passes. That is
// exactly what happened the first time this was written: an injected unknown
// kind did not fail the test.
const loggerWarn = vi.hoisted(() => vi.fn());
vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    warn: loggerWarn,
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    verbose: vi.fn(),
  }),
}));

const fixtureDir = join(
  process.cwd(),
  "src/features/legal/mocks/fixtures/tldf",
);
const rows = JSON.parse(
  readFileSync(join(fixtureDir, "render-rows-46408.json"), "utf8"),
) as { readonly chunk_index: number; readonly tldf: unknown }[];

// Parse ONCE through the shipped schema and use its output everywhere below.
// Casting and then validating separately would leave every later assertion
// running against the unvalidated cast, so a schema regression could not fail
// the render tests — only the one test that happened to call safeParse.
const envelope: TldfEnvelope = tldfEnvelopeSchema.parse(rows[0]?.tldf);

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
    // The parse at module scope is the assertion — it THROWS on a schema
    // regression, so every test in this file depends on it. If the deployed
    // schema could not read a real production envelope the reader would be
    // broken for the whole 1.1 corpus.
    expect(envelope.format_version).toBe("1.1");
    expect(envelope.generation.structure_parser_version).toBe("portal-tree-v6");
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
    // Both rows, not just the first: an empty leading cell dropped from row 2
    // would shift its data one column left while a first-row-only assertion
    // stayed green. The §3.2 exemption is that an empty celula renders an
    // empty <td> precisely so later cells keep their column.
    const trs = [...table.querySelectorAll("tr")];
    expect(trs).toHaveLength(2);
    expect(trs.map((tr) => tr.querySelectorAll("td").length)).toEqual([7, 7]);
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

  it("renders every block through a typed path, with no unknown-kind fallback", () => {
    // Checking that three kinds are PRESENT does not test this: an unknown kind
    // also gets a data-kind attribute, so a block taking the generic fallback
    // would leave such a test green. The renderer's own signal is the
    // once-per-kind warning it logs on that path — assert that it never fires.
    // NO mockClear HERE, deliberately. `warnedKinds` in the renderer is
    // module-level and warns ONCE per kind for the lifetime of the module, so
    // by the time this (the last) test runs, an earlier render in this file has
    // already consumed the only warning. Clearing the spy first threw that
    // evidence away and made this assertion unfalsifiable — verified by
    // injecting an unknown kind into the fixture and watching the test stay
    // green. Assert over every call accumulated across the whole file instead.
    const { container } = renderEnvelope();
    const logged = loggerWarn.mock.calls.map((c) => JSON.stringify(c));

    // No block fell through to the generic renderer...
    expect(
      logged.filter((line) => line.includes("Unknown TLDF block kind")),
    ).toEqual([]);
    // ...and the table subtree survived the shape guard rather than degrading
    // to the plain-div fallback, which warns separately.
    expect(
      logged.filter((line) => line.includes("renderable-table guard")),
    ).toEqual([]);
    expect(container.querySelector('table[data-kind="tabel"]')).not.toBeNull();

    // The artifact really does exercise the v1.1 kinds, so the assertions above
    // are about something.
    const kinds = new Set<string>();
    walk(envelope.blocks, (b) => kinds.add(b.kind));
    for (const required of ["tabel", "rand", "celula"]) {
      expect(kinds.has(required)).toBe(true);
    }
  });
});
