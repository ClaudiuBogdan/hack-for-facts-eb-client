/**
 * The pure TLDF block renderer — blocks in, styled reading column out.
 *
 * THE ONE INVARIANT IS TEXT FIDELITY: the rendered text content is EXACTLY
 * the fold of the blocks (`(sep ?? '') + text` per run, runs and children
 * interleaved by span start) — the same sequence whose sha256 the compiler
 * pinned as `text_sha256`. Styling therefore lives entirely on wrapper
 * elements and classes; no element may inject or reorder a single character.
 * Find-in-page, copy/paste and citation all operate on the proven text. The
 * column renders under `whitespace-pre-wrap`, so `\n` separators ARE the
 * line structure — with a few VISUAL exceptions (user decision 2026-08-12,
 * the gap complaint; three more pairs on 26 November 2026, see
 * `BlockContent`), each a `white-space: normal` span around a separator,
 * never a changed character: a block's LEADING `\n` collapses (the block
 * element already breaks the line, so it only painted a phantom blank line
 * inside every block), and in enumeration blocks (alineat/litera/punct/
 * liniuta) the `\n` between the marker run and its body collapses to a
 * space, so "(1)" and "a)" sit on the same line as their text.
 *
 * Marks slice runs through the tested engine (`lib/tldf/marks.ts`): resolved
 * act references become router links, unresolved/external ones become honest
 * styled states — never a dead link dressed as a live one. On a document
 * with non-BMP content a mark whose boundary would split a surrogate pair is
 * skipped by the engine (text kept, mark dropped).
 *
 * Unknown block kinds render as plain blocks and are logged ONCE per kind —
 * the vocabulary is open at the parser end, and silence would hide a new
 * kind arriving unstyled.
 *
 * TLDF 1.1 adds PRESENTATION kinds (design: scrapper
 * `prod-db/PORTAL_TABLE_CAPTURE_DESIGN.md`), rendered as real HTML structure
 * under the same fidelity invariant. `tabel`/`rand`/`celula` become
 * `<table><tbody><tr><td>` — the `<tbody>` is explicit and the subtree shape
 * is guarded, because the HTML parser FOSTER-PARENTS any non-table content
 * out of a `<table>`, so a server-rendered table carrying stray runs would
 * reparse (and hydrate) into a different tree with characters out of order;
 * an off-contract table subtree keeps the plain-div rendering instead — same
 * characters, nothing for the parser to relocate. `imagine` is a
 * zero-character block whose asset carries NO locator (an image is resolved
 * by BLOCK ID at the server; the envelope never holds a portal URL), so it
 * renders an honest placeholder whose visible label is CSS generated
 * content + `aria-label` — never a text node. `lista`/`element_lista` become
 * real list elements with native markers suppressed: a marker is either
 * already in the character stream or restored from `label` as CSS content,
 * never doubled, never browser-invented. Format 1.0 documents carry none of
 * these kinds, so they render exactly as before by construction.
 *
 * As of 2026-09-01 the v1.1 kinds are LIVE: 221,264 documents serve format 1.1
 * and 1,266 serve 1.0 (an earlier version of this note said production served
 * only 1.0). The version is constant within a document; block dispatch is on
 * `block.kind` alone, and `format_version` is read only for chunk-head
 * agreement (`legal-reader-page.tsx:621`), never to branch a render.
 *
 * THE LOOK (owner, 26 November 2026, promoted from the prototype
 * `development/prototypes/legal/act.blocks.tsx`, which changed classes and
 * wrappers only): the law's words in the reader's own serif, our apparatus
 * (notes on changes, tables, the publication plate, headings) in the site's
 * sans; the site's neutral tokens; enumeration markers hung in a gutter so
 * numbers line up and the text keeps one edge. The words that look adds — a
 * repealed provision's state, a figure's label, the control of a folded note
 * — are attributes drawn as generated content, never text nodes, so the
 * invariant above holds unchanged.
 */

import { createContext, useContext, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Link } from "@tanstack/react-router";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { createLogger } from "@/lib/logger";
import { buildMarkIndex, sliceRun, actionableMark } from "../../lib/tldf/marks";
import type { MarkIndex, RunSegment } from "../../lib/tldf/marks";
import { foldTldfBlocks } from "../../lib/tldf/fold";
import { FOLDED_NOTE_ATTR } from "../../lib/tldf/folded-note";
import type { TldfBlock, TldfMark, TldfRun } from "../../lib/tldf/types";

const logger = createLogger("legal-reader");

/**
 * The compiler's CLOSED kind vocabulary — mirrors `TLDF_KIND_VALUES` in the
 * scrapper's `prod/tldf/format.ts` at format 1.1 (29 kinds: the 23 of v1.0
 * plus the presentation families `tabel`/`rand`/`celula`, `imagine`, and
 * `lista`/`element_lista`), enumerated once instead of discovered one
 * unknown-kind warning at a time. Anything else still takes the plain
 * fallback and logs.
 */
const KNOWN_KINDS = new Set([
  "carte",
  "parte",
  "titlu",
  "titlu_act",
  "subtitlu_act",
  "capitol",
  "subcapitol",
  "sectiune",
  "articol",
  "anexa",
  "apendice",
  "alineat",
  "litera",
  "liniuta",
  "punct",
  "paragraf",
  "bloc",
  "citat",
  "nota",
  "emitent",
  "publicare",
  "semnatura",
  "tabel",
  "rand",
  "celula",
  "imagine",
  "lista",
  "element_lista",
  "preformatat",
]);

const warnedKinds = new Set<string>();
/** Fingerprints of off-contract `tabel` shapes already logged — one warn per
    distinct (clause, child-kinds), not per block. A 13k-row annex that all
    fail the same way must not emit 13k lines. */
const warnedTableShapes = new Set<string>();

/**
 * The UI sans inside the reader. Tailwind's `font-sans` is NOT mapped to the
 * app's Inter token (`--font-family` lands on `body` only), so headings and
 * apparatus must reference the token directly or they silently fall back to
 * the system UI stack — measured as `-apple-system` against Inter everywhere
 * else.
 */
const UI = "[font-family:var(--font-family)]";

/**
 * The law's own face (owner, 26 November 2026: serif, no switch to the site's
 * sans). No font file is added: the serif is the reader's own — Iowan on
 * Apple, Charter, Sitka or Cambria on Windows, Noto Serif on Android and
 * Linux, Georgia as the floor. (`_` is a space inside the arbitrary value.)
 */
const SERIF =
  "[font-family:'Iowan_Old_Style',Charter,'Bitstream_Charter','Sitka_Text',Cambria,'Noto_Serif',Georgia,serif]";

/**
 * Container kinds carry TWO runs: the rank ("Titlul I", role `ttl`) and the
 * denumire ("Dispoziții generale", role `den`). Both are set in the site's
 * sans, in sentence case (no text-transform). The `[&>[data-role=…]]`
 * variants style ONLY the block's own heading runs (children are `div`s, so
 * `>` never reaches their text). Styling lives entirely on wrappers; the
 * character stream is untouched.
 */
const HEAD =
  "[&>[data-role=ttl]]:[font-family:var(--font-family)] [&>[data-role=den]]:[font-family:var(--font-family)] [&>[data-role=den]]:font-semibold [&>[data-role=den]]:tracking-tight";
/**
 * The number is the address, the name is the content: with a denumire after
 * it the rank is a quiet label and the denumire takes the display size. The
 * label is `:has`-gated: a container WITHOUT a denumire keeps a real heading
 * size instead of degrading to a whisper. (Child-variant utilities
 * out-specify the run's own role classes, so the per-kind sizes win.)
 */
const RANK =
  "[&:has(>[data-role=den])>[data-role=ttl]]:text-sm [&:has(>[data-role=den])>[data-role=ttl]]:font-medium [&:has(>[data-role=den])>[data-role=ttl]]:text-muted-foreground [&:not(:has(>[data-role=den]))>[data-role=ttl]]:text-xl [&:not(:has(>[data-role=den]))>[data-role=ttl]]:font-semibold [&:not(:has(>[data-role=den]))>[data-role=ttl]]:tracking-tight";
/** Whatever follows its parent's heading directly sits close to it. */
const FIRST = "[&>[data-role]+[data-kind]]:mt-5";
/**
 * A ruled heading that follows its parent's heading directly drops its own
 * rule and the room above it. Worn by the ruled headings themselves, keyed on
 * the HEADING runs before them: a box that follows a body run (a drawn table
 * after "*Font 7*", a note under an annex's name) keeps its border and its
 * padding (review, 26 November 2026).
 */
const UNDER_HEADING =
  "[[data-role=ttl]+&]:border-t-0 [[data-role=ttl]+&]:pt-0 [[data-role=den]+&]:border-t-0 [[data-role=den]+&]:pt-0";
/**
 * A marker ("(1)", "a)", "1.", "–") hung in the gutter of its own block:
 * numbers line up in a column and the text keeps one edge. The marker keeps
 * a gap of its own, so a wide one ("a^1)") never touches the text. A float
 * moves no character: the marker run stays where the fold puts it.
 */
const MARKER =
  "[&>[data-role=ttl]]:float-left [&>[data-role=ttl]]:pr-1.5 [&>[data-role=ttl]]:font-medium [&>[data-role=ttl]]:tabular-nums [&>[data-role=ttl]]:text-foreground/70";
/**
 * A fully struck provision strikes its marker too. A floated marker is out of
 * the line, so the block's own strike does not reach it, and the marker's
 * colour above would outrank the struck block's.
 */
const STRUCK_MARKER =
  "[&[data-struck=full]>[data-role=ttl]]:text-muted-foreground [&[data-struck=full]>[data-role=ttl]]:line-through [&[data-struck=full]>[data-role=ttl]]:decoration-1 [&[data-struck=full]>[data-role=ttl]]:decoration-foreground/40";
// `flow-root`: an item that is its marker alone still has its line's height,
// so the next item's marker cannot slide up beside it.
const ITEM = `flow-root mt-2 pl-7 sm:pl-9 ${MARKER} ${STRUCK_MARKER} [&>[data-role=ttl]]:-ml-7 [&>[data-role=ttl]]:min-w-7 sm:[&>[data-role=ttl]]:-ml-9 sm:[&>[data-role=ttl]]:min-w-9`;
/**
 * Quoted text — a structurally-classified `citat`, or the new wording an
 * amending act quotes (see `displayClass`): set in behind a left rule only,
 * on the page's own ground (owner, 26 November 2026; the Portal's notes keep
 * the grey field).
 */
const QUOTED =
  "mt-4 border-l-2 border-foreground/30 py-0.5 pl-5 pr-4 [&>*:first-child]:mt-0";

const BLOCK_CLASS: Readonly<Record<string, string>> = {
  carte: `${FIRST} ${UNDER_HEADING} mt-20 border-t border-foreground/20 pt-8 ${HEAD} ${RANK} [&>[data-role=den]]:text-[1.75rem] [&>[data-role=den]]:leading-9`,
  parte: `${FIRST} ${UNDER_HEADING} mt-20 border-t border-foreground/20 pt-8 ${HEAD} ${RANK} [&>[data-role=den]]:text-[1.75rem] [&>[data-role=den]]:leading-9`,
  titlu: `${FIRST} ${UNDER_HEADING} mt-16 border-t pt-7 ${HEAD} ${RANK} [&>[data-role=den]]:text-2xl [&>[data-role=den]]:leading-8`,
  capitol: `${FIRST} ${UNDER_HEADING} mt-12 border-t pt-6 ${HEAD} ${RANK} [&>[data-role=den]]:text-xl [&>[data-role=den]]:leading-7`,
  sectiune: `${FIRST} mt-10 ${HEAD} ${RANK} [&>[data-role=den]]:text-lg [&>[data-role=den]]:leading-7`,
  subcapitol: `${FIRST} mt-10 ${HEAD} ${RANK} [&>[data-role=den]]:text-lg [&>[data-role=den]]:leading-7`,
  // The article's number is the address people cite; its name, where it has
  // one, follows in the same sans, quieter.
  articol: `mt-9 [&>[data-role=ttl]]:[font-family:var(--font-family)] [&>[data-role=ttl]]:text-base [&>[data-role=ttl]]:font-semibold [&>[data-role=den]]:[font-family:var(--font-family)] [&>[data-role=den]]:ml-2 [&>[data-role=den]]:text-base [&>[data-role=den]]:font-normal [&>[data-role=den]]:text-muted-foreground`,
  // Same rank/denumire model as the containers above — "Anexa nr. 1" is
  // usually den-less and takes the :has fallback size.
  anexa: `${FIRST} ${UNDER_HEADING} mt-20 border-t border-foreground/20 pt-8 ${HEAD} ${RANK} [&>[data-role=den]]:text-2xl [&>[data-role=den]]:leading-8`,
  apendice: `${FIRST} mt-12 ${HEAD} ${RANK} [&>[data-role=den]]:text-lg [&>[data-role=den]]:leading-7`,
  // The document's own masthead — the title lines the law opens with, shown
  // only where the page head does not already say them.
  titlu_act: `${UI} text-xl font-semibold leading-8 tracking-tight`,
  subtitlu_act: `${UI} text-base leading-7 text-muted-foreground`,
  // From `sm` the paragraph's number hangs in the gutter; on a phone it stays
  // in the line, where the width is the text's.
  alineat: `${STRUCK_MARKER} mt-3 sm:[&:has(>[data-role=ttl])]:flow-root sm:[&:has(>[data-role=ttl])]:pl-10 [&>[data-role=ttl]]:font-medium [&>[data-role=ttl]]:tabular-nums [&>[data-role=ttl]]:text-foreground/70 sm:[&>[data-role=ttl]]:float-left sm:[&>[data-role=ttl]]:-ml-10 sm:[&>[data-role=ttl]]:min-w-10 sm:[&>[data-role=ttl]]:pr-1.5`,
  // Letters, points and dash-items ("– ...") share one list grain, a step
  // apart: at a tighter step the gap between two litere matched the leading
  // inside one, so multi-line items (the definitions articles — the densest,
  // most-consulted part of most laws) fused into an unparseable column.
  litera: ITEM,
  punct: ITEM,
  liniuta: ITEM,
  paragraf: "mt-3",
  // A structurally-classified quotation — the same container the
  // OPENS_QUOTED heuristic approximates when the parser didn't mark one.
  citat: QUOTED,
  // The Portal's notes are apparatus, not provisions: the site's sans, a
  // size down, on a quiet ground. A served note holds its lines as notes of
  // their own: one ground for the whole, none for the lines.
  nota: `mt-4 rounded-md bg-muted/60 px-4 py-3 ${UI} text-sm leading-6 text-muted-foreground [&>[data-role=ttl]]:text-foreground [&_[data-kind=paragraf]]:mt-1.5 [&_[data-kind=nota]]:mt-1.5 [&_[data-kind=nota]]:rounded-none [&_[data-kind=nota]]:bg-transparent [&_[data-kind=nota]]:p-0`,
  // Publication metadata plate (EMITENT / Publicat în) — kept quiet; the
  // fișa above states the same facts with provenance.
  emitent: `mt-3 ${UI} text-sm leading-6 text-muted-foreground [&>[data-role=ttl]]:font-medium`,
  publicare: `mt-1 ${UI} text-sm leading-6 text-muted-foreground [&>[data-role=ttl]]:font-medium`,
  // The signatures as the act's closing: the text's own face and colour, the
  // outermost signature block under a short rule (a nested one cancels it).
  // The lines stay one under the other, in source order: the text does not
  // say which line is an office and which a name ("Contrasemnează:", an
  // office on two lines), so pairing them would be a guess.
  semnatura:
    "mt-8 w-fit min-w-56 border-t border-foreground/25 pt-4 text-base leading-7 text-foreground [&_[data-kind=semnatura]]:mt-0 [&_[data-kind=semnatura]]:w-auto [&_[data-kind=semnatura]]:min-w-0 [&_[data-kind=semnatura]]:border-t-0 [&_[data-kind=semnatura]]:pt-0",
  // Column-aligned content: a proportional serif destroys the alignment.
  // For `tabel` this slot is only the OFF-CONTRACT fallback — a well-formed
  // v1.1 table takes the real `<table>` path in BlockView; a malformed one
  // renders flat, where monospace keeps any space-padded alignment readable.
  tabel: "mt-4 font-mono text-sm",
  // Drawn layouts keep their columns: no wrapping, the box scrolls sideways
  // (and is a focusable, named region — see BlockView). Served texts carry
  // each line as a `paragraf` child: they touch, so the drawn strokes join.
  // A row of dashes inside it is not clipped at the column (as `displayClass`
  // clips one in running text): it scrolls with the box. On paper nothing
  // scrolls: the lines wrap, an unbroken row breaks, every character prints.
  preformatat:
    "mt-4 overflow-x-auto rounded-md border bg-muted/40 px-4 py-3 font-mono text-[0.8125rem] leading-5 whitespace-pre [&_[data-kind=paragraf]]:mt-0 [&_[data-kind=paragraf]]:overflow-visible print:overflow-visible print:whitespace-pre-wrap print:[overflow-wrap:anywhere]",
  // v1.1 source-asserted lists. Native markers are suppressed HERE
  // (`list-none`) — not via Tailwind preflight, which only resets `ol, ul,
  // menu` and would leave an off-contract `element_lista` (an `<li>` outside
  // a `lista`) with a browser-invented bullet on top of the in-stream marker.
  // A marker captured as run text must not be doubled, and an attribute-
  // carried one is restored via LIST_MARKER_CLASS instead. The indent
  // matches the litera/punct grain.
  lista: "mt-2 list-none pl-7 sm:pl-9",
  element_lista: "mt-2 list-none",
};

/**
 * The note a consolidated form adds after a changed provision ("(la
 * 28-07-2022, Litera m) … a fost modificată de …)"): the Portal's record of a
 * change, not a provision. Plain small print in the site's sans, no rule, no
 * inset, so the law's own text reads on without it.
 */
const AMENDMENT_NOTE = `mt-2 ${UI} text-[0.8125rem] leading-5 text-muted-foreground`;

const RUN_ROLE_CLASS: Readonly<Record<string, string>> = {
  // Heading line of a structural unit ("Articolul 1", "CAPITOLUL II").
  // No color here: emitent/publicare mute their whole block, and a forced
  // `text-foreground` made the same label near-black on one act and muted on
  // another depending on class order.
  ttl: "font-semibold",
  // Denomination/label run ("LEGE nr. 17"): its face comes from its block —
  // the heading kinds and the masthead set it in the sans.
  den: "",
  // Body text — the default reading style.
  bdy: "",
};

/**
 * Display heuristics over the block's OWN text (children excluded). Both are
 * presentation-only: the characters render exactly as served.
 * - An all-dashes paragraph is the portal's section separator — kept in the
 *   character stream, visually receded to a rule-like line.
 * - A block opening with a quotation mark inside an amending act is the
 *   QUOTED NEW WORDING ("va avea următorul cuprins: «...»") — it is set in
 *   like a `citat` (QUOTED) so instruction and inserted law stop reading as
 *   the same voice.
 */
const ownText = (block: TldfBlock): string =>
  block.content.map((run) => (run.sep ?? "") + run.text).join("");

/**
 * Enumeration grains whose marker run ("(1)", "a)", "1.", "–") joins its
 * body on one line: the `\n` between them renders as a space (the separator
 * character itself is untouched — see the module docblock).
 */
const INLINE_MARKER_KINDS: ReadonlySet<string> = new Set([
  "alineat",
  "litera",
  "punct",
  "liniuta",
]);

const DASH_RULE = /^[\s-–—]{4,}$/;
const OPENS_QUOTED = /^\s*["„«]/;

function displayClass(block: TldfBlock): string | undefined {
  if (block.kind !== "paragraf" && block.kind !== "alineat") return undefined;
  const text = ownText(block);
  if (DASH_RULE.test(text) && text.trim() !== "") {
    return "select-all overflow-hidden text-foreground/25";
  }
  if (OPENS_QUOTED.test(text)) {
    return QUOTED;
  }
  return undefined;
}

type SegmentProps = {
  readonly segment: RunSegment;
};

/**
 * One mark-sliced segment. The ACTIONABLE mark (innermost reference with a
 * link, per the engine) decides the element; the text is always the
 * segment's own — a link wraps the law's words, it never rewrites them.
 */
function MarkedSegment({ segment }: SegmentProps) {
  const mark = actionableMark(segment);
  if (mark === null) return <>{segment.text}</>;
  return <MarkElement mark={mark} text={segment.text} />;
}

function MarkElement({
  mark,
  text,
}: {
  readonly mark: TldfMark;
  readonly text: string;
}) {
  // Emphasis and strike marks are SEMANTIC, not references: before 2026-08-26
  // every non-link mark fell through to the dotted "unresolved reference"
  // face, so an italic drug name read as a broken citation. `struck` draws
  // the source strike (user decision: visible strikethrough); legal meaning
  // is asserted only by the BLOCK's struck_repealed, never by the mark.
  if (mark.kind === "italic") return <em>{text}</em>;
  if (mark.kind === "bold") {
    return <strong className="font-semibold">{text}</strong>;
  }
  if (mark.kind === "underline") {
    return <span className="underline underline-offset-[3px]">{text}</span>;
  }
  if (mark.kind === "struck") {
    return <s className={STRUCK_TEXT_CLASS}>{text}</s>;
  }
  const link = mark.link;
  if (link?.kind === "act" && typeof link.target_act_id === "number") {
    return (
      <Link
        to="/legislation/acts/$actId"
        params={{ actId: String(link.target_act_id) }}
        className="text-primary underline decoration-primary/30 underline-offset-[3px] hover:decoration-primary"
      >
        {text}
      </Link>
    );
  }
  if (link?.kind === "external" && typeof link.href === "string") {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline decoration-primary/40 decoration-dotted underline-offset-[3px] hover:decoration-solid"
      >
        {text}
      </a>
    );
  }
  // act_missing_id, internal (wired with the ?nod= navigation pass) and
  // unresolved references: visibly a reference, honestly not a link.
  return (
    <span
      className="underline decoration-muted-foreground/50 decoration-dotted underline-offset-[3px]"
      title={t`Referință legislativă (fără țintă navigabilă)`}
    >
      {text}
    </span>
  );
}

function RunSpan({
  run,
  marks,
  collapseSep = false,
}: {
  readonly run: TldfRun;
  readonly marks: MarkIndex;
  /** Render the separator in a `white-space: normal` span so it collapses
      visually — the character stays in the text content untouched. */
  readonly collapseSep?: boolean;
}) {
  const sliced = sliceRun(marks, run);
  const roleClass =
    run.role !== undefined ? RUN_ROLE_CLASS[run.role] : undefined;
  // Role rows fold into runs, so a struck TTL/DEN/BDY arrives here rather
  // than as a block — same visible-strikethrough treatment (2026-08-26).
  const struckClass = run.struck !== undefined ? STRUCK_TEXT_CLASS : undefined;
  return (
    <span
      {...(run.role !== undefined && { "data-role": run.role })}
      {...(run.struck !== undefined && { "data-struck": run.struck })}
      {...(cn(roleClass, struckClass) !== "" && {
        className: cn(roleClass, struckClass),
      })}
    >
      {/* Gated on '\n' exactly: the documented exceptions collapse LINE
          BREAKS only — a ' ' separator must keep rendering as the space
          character it is. */}
      {collapseSep && run.sep === "\n" ? (
        <span className="whitespace-normal">{run.sep}</span>
      ) : (
        (run.sep ?? "")
      )}
      {sliced.segments.map((segment, i) => (
        <MarkedSegment key={i} segment={segment} />
      ))}
    </span>
  );
}

type BlockProps = { readonly block: TldfBlock; readonly marks: MarkIndex };

/**
 * A block's interleaved run/child sequence in FOLD ORDER — runs and children
 * by ascending span start, stable ties keeping document order — plus the
 * visual-only separator collapses. Extracted so every wrapper element (plain
 * div, `<td>`, `<li>`, `<ol>`/`<ul>`, the imagine shell) reproduces exactly
 * the sequence the fold proves; the wrapper varies, the characters never do.
 */
function BlockContent({ block, marks }: BlockProps) {
  // Fold order: runs and children interleave by ascending span start. This is
  // the ONLY ordering that reproduces the proven clean text.
  const items = [
    ...block.content.map((run) => ({ start: run.span[0], run })),
    ...(block.children ?? []).map((child) => ({ start: child.span[0], child })),
  ].sort((a, b) => a.start - b.start);

  // Which separators collapse visually (never textually): a block-leading
  // one — the block-element boundary already breaks the line, so it only
  // painted a phantom blank line — and, on enumeration grains, the one right
  // after the marker run, so "(1)"/"a)" joins its body. The same collapse
  // after a label run joins three more pairs (owner, 26 November 2026, the
  // act page's redesign): an article's number and its name ("Articolul 3" +
  // "Definiții"), the issuer's label and its value, the publication's label
  // and its issue. An article's BODY run is never joined to its number.
  const inlineMarker = INLINE_MARKER_KINDS.has(block.kind);
  const collapseAt = new Set<number>();
  for (const [index, item] of items.entries()) {
    if (!("run" in item)) continue;
    if (index === 0) collapseAt.add(index);
    const previous = items[index - 1];
    if (
      previous === undefined ||
      !("run" in previous) ||
      previous.run.role !== "ttl"
    ) {
      continue;
    }
    if (
      inlineMarker ||
      block.kind === "emitent" ||
      block.kind === "publicare" ||
      (block.kind === "articol" && item.run.role === "den")
    ) {
      collapseAt.add(index);
    }
  }

  return (
    <>
      {items.map((item, index) =>
        "run" in item ? (
          <RunSpan
            key={`r${String(item.start)}`}
            run={item.run}
            marks={marks}
            collapseSep={collapseAt.has(index)}
          />
        ) : (
          <BlockView key={item.child.id} block={item.child} marks={marks} />
        ),
      )}
    </>
  );
}

/* ── v1.1 presentation rendering ──────────────────────────────────────────── */

/**
 * The table face: reference material, not prose (the CPV/NACE crosswalk
 * annexes) — the site's sans a size down, figures in columns (`tabular-nums`),
 * ONE hairline weight inside, cells top-aligned. The frame is on the scroll
 * shell (`TableBlock`), so the table's own outer edge is hidden
 * (`border-hidden` under `border-collapse`) and the cell hairlines never
 * double it. A table wider than the column scrolls in its frame and says
 * nothing more (owner, 26 November 2026: the hint and the open-wide dialog
 * were declined).
 */
// `w-full` and NOT `min-w-max`. This was tried and reverted, so the reasoning
// is recorded to stop it being retried: `width: 100%` on a table is a FLOOR,
// not a cap — automatic table layout cannot lay a table out narrower than its
// min-content width, so a wide table already overflows and the `overflow-x-auto`
// shell in `TableBlock` already scrolls. Measured in Chromium 2026-09-01, an
// 81-column table renders 3372px inside a 704px column and scrolls, IDENTICALLY
// with and without `min-w-max`.
//
// What `min-w-max` actually changes is the used width from min-content to
// max-content, i.e. cells stop soft-wrapping. That IS a readability gain for a
// dense mid-width numeric table, so the honest statement is not "it buys
// nothing" but "it buys less than it costs": it does nothing for the very wide
// tables it was aimed at, and it breaks ordinary ones. A 2-column table holding
// one Romanian legal sentence goes from 704px and readable to 1861px and
// horizontally scrolling — the common case on a phone. In print the overflow is
// clipped rather than paginated, which is silent data loss on a document people
// print.
//
// Sampled evidence (independent review, `TABLESAMPLE SYSTEM (3)` over
// `legal.document_render`, 11,101 tables in 1,406 documents, 2026-09-01):
// 791 tables have >=12 columns — the set this would help — against 1,835 with
// <12 columns but a cell line >80 chars, which is the set it breaks. Roughly
// 2.3x more harmed than helped. Full analysis:
// scrapper `prod-db/PORTAL_V6_SERVING_INTEGRATION_ANALYSIS_2026-09-01.md`.
//
// If the mid-width readability win is wanted later, make it conditional on a
// measured column count rather than unconditional, and validate at 320px and
// 704px against narrow-prose, 12-, 20- and 81-column artifacts.
/** Announced for the scrollable table region. An attribute, never a text node
 * — the fold invariant forbids adding characters to the DOM. */
const TABLE_REGION_LABEL = "Tabel din act, derulabil orizontal";

const TABLE_CLASS = `w-full border-collapse border-hidden ${UI} text-sm leading-5 tabular-nums`;

/**
 * Cell text is "a stack of row-synchronized visual lines", not prose
 * (PORTAL_TABLE_CAPTURE_DESIGN, gaphunt-tables amendment 2: row 8 of the
 * 178667 crosswalk carries 34 hard-wrapped lines per cell) — so the reading
 * column's paragraph margin collapses to a line stack inside cells. Descendant
 * scope on purpose: a nested table's cells want the same.
 */
const CELL_CLASS = "border px-3 py-2 align-top [&_[data-kind=paragraf]]:mt-0";

/** Serving smallint bound — mirrors `tldfGridSchema`. The API boundary already
    validates it; re-checked here because tests (and any future caller) can
    feed blocks straight into the renderer. */
const GRID_SPAN_MAX = 32767;

/**
 * `grid` → `colSpan`/`rowSpan`. ABSENT is the one canonical 1×1 encoding
 * (spec §3.2 — `grid` is emitted iff it differs from (1,1)), so 1 — or
 * anything malformed (0, negative, fractional, non-numeric) — emits NO
 * attribute: a plain cell, never a throw.
 */
function gridSpanProps(grid: TldfBlock["grid"]): {
  readonly colSpan?: number;
  readonly rowSpan?: number;
} {
  const spanOf = (value: unknown): number | undefined =>
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 1 &&
    value <= GRID_SPAN_MAX
      ? value
      : undefined;
  const colSpan = spanOf(grid?.cols);
  const rowSpan = spanOf(grid?.rows);
  return {
    ...(colSpan !== undefined && { colSpan }),
    ...(rowSpan !== undefined && { rowSpan }),
  };
}

/** Children in fold order (ascending span start; stable ties keep document
    order — exactly `foldTldfBlocks`'s merge, so cell placement is the proven
    character order). */
const spanOrdered = (
  children: readonly TldfBlock[] | undefined,
): readonly TldfBlock[] =>
  [...(children ?? [])].sort((a, b) => a.span[0] - b.span[0]);

type TableGuardClause =
  | "owns_runs"
  | "no_rows"
  | "non_rand_child"
  | "rand_owns_runs"
  | "non_celula_child";

type TableGuardRejection = {
  readonly clause: TableGuardClause;
  readonly childKinds: readonly string[];
};

/**
 * The foster-parenting guard (PORTAL_TABLE_CAPTURE_DESIGN, panel verdict 10):
 * the browser's HTML parser relocates ANY non-table content out of
 * `<table>`/`<tr>`, so a server-rendered table with stray runs or non-row
 * children would reparse — and hydrate — into a different tree, with
 * characters out of order in the live DOM. Only a subtree matching the v1.1
 * contract (`tabel`/`rand` own no runs; rows are `rand`; cells are `celula`)
 * renders as a real table; anything else keeps the plain-div rendering —
 * same characters, nothing for the parser to move. Returns the rejecting
 * clause (and the offending child kinds) so a contract drift is logged
 * instead of silently flattening every table in the corpus.
 */
function tableGuardRejection(block: TldfBlock): TableGuardRejection | null {
  const rows = block.children ?? [];
  const childKinds = rows.map((row) => row.kind);
  if (block.content.length !== 0) {
    return { clause: "owns_runs", childKinds };
  }
  if (rows.length === 0) {
    return { clause: "no_rows", childKinds };
  }
  if (rows.some((row) => row.kind !== "rand")) {
    return { clause: "non_rand_child", childKinds };
  }
  if (rows.some((row) => row.content.length !== 0)) {
    return { clause: "rand_owns_runs", childKinds };
  }
  const cellKinds = rows.flatMap((row) =>
    (row.children ?? []).map((cell) => cell.kind),
  );
  if (cellKinds.some((kind) => kind !== "celula")) {
    return { clause: "non_celula_child", childKinds: cellKinds };
  }
  return null;
}

function warnUnrenderableTable(rejection: TableGuardRejection): void {
  const fingerprint = `${rejection.clause}:${rejection.childKinds.join(",")}`;
  if (warnedTableShapes.has(fingerprint)) return;
  warnedTableShapes.add(fingerprint);
  logger.warn(
    "TLDF tabel failed the renderable-table guard, rendering as plain block",
    {
      clause: rejection.clause,
      childKinds: rejection.childKinds,
    },
  );
}

/** The last cell of a row in reading order: where a repealed row says so. */
const lastCellOf = (row: TldfBlock): TldfBlock | undefined => {
  const cells = spanOrdered(row.children);
  return cells[cells.length - 1];
};

function TableBlock({ block, marks }: BlockProps) {
  // The scroll shell is chrome (a 6-column annex table can outgrow the
  // 78ch column); the table element itself stays the addressable block.
  //
  // KEYBOARD REACHABILITY (WCAG 2.1.1). A wide table is only readable if the
  // shell can be scrolled, and a scroll container that cannot take focus
  // cannot be scrolled from the keyboard — the columns past the fold are
  // simply unreachable. This matters more since TLDF v1.1: measured on the
  // live corpus 2026-09-01, 24,505 tables carry 12+ columns (widest 81)
  // across 5,351 documents, and an 81-column table lays out ~3372px inside a
  // 704px column.
  //
  // Chromium already does this natively — measured in Chromium 151, the
  // shell takes focus with no tabIndex at all — but that is a recent default
  // and Safari does not do it. `tabIndex={0}` is therefore a no-op on Chrome
  // and the fix everywhere else. `role="region"` + a label is what turns the
  // focus stop into something a screen reader announces rather than an
  // unexplained landing point; without the accessible name a focusable
  // generic div is arguably worse than none.
  //
  // The label is an ATTRIBUTE, never a text node: the renderer's invariant is
  // that DOM text equals the fold, so a <caption> would break it. Same trick
  // as the imagine placeholder.
  return (
    <>
    <div
      className="mt-5 overflow-x-auto rounded-md border"
      tabIndex={0}
      role="region"
      aria-label={TABLE_REGION_LABEL}
    >
      <table
        id={`tldf-${block.id}`}
        data-kind="tabel"
        className={cn(TABLE_CLASS, "scroll-mt-24")}
      >
        {/* Explicit <tbody>: without it the SSR string serializes `table > tr`,
            the browser reparses it WITH a parser-inserted tbody, and hydration
            mismatches (panel verdict 10). */}
        <tbody>
          {spanOrdered(block.children).map((row) => (
            <tr
              key={row.id}
              id={`tldf-${row.id}`}
              data-kind="rand"
              {...struckAttrsOf(row)}
              className={cn("scroll-mt-24", struckClassOf(row))}
            >
              {spanOrdered(row.children).map((cell) => (
                <td
                  key={cell.id}
                  id={`tldf-${cell.id}`}
                  data-kind="celula"
                  {...struckAttrsOf(cell)}
                  className={cn(
                    CELL_CLASS,
                    "scroll-mt-24",
                    struckClassOf(cell),
                  )}
                  {...gridSpanProps(cell.grid)}
                >
                  {/* A cell MAY own runs (bare `<td>` text) and may carry
                      whole child blocks — including a nested table, which
                      re-enters BlockView and is judged on its own shape. An
                      empty celula renders an empty <td>: dropping it would
                      shift every later cell left (the §3.2 exemption). */}
                  <BlockContent block={cell} marks={marks} />
                  {/* The repealed state in words: a cell's own, or its row's
                      (said in the row's last cell: nothing but cells may sit
                      under a `<tr>`). */}
                  {isRepealed(cell) ||
                  (isRepealed(row) && cell === lastCellOf(row)) ? (
                    <RepealedMark />
                  ) : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {/* A repealed table says so under its frame, outside the `<table>`. */}
    {isRepealed(block) ? <RepealedMark /> : null}
    </>
  );
}

/**
 * The `imagine` placeholder face: ONE line with an icon (owner, 26 November
 * 2026 — a frame of the figure's size showed only emptiness). The visible
 * label is CSS generated content from `data-figure-label` — with `aria-label`
 * carrying the same text for assistive tech — and NEVER a text node: the
 * column's textContent must stay exactly the fold, and an imagine block is a
 * zero-character block. (CSS `attr()` also needs no escaping, unlike a
 * literal `content` string.) The icon is an SVG with no text of its own.
 * Sans type on purpose: the placeholder is our chrome speaking, not the law's
 * serif voice.
 */
const FIGURE_LINE_CLASS = `flex min-h-11 items-center gap-2.5 whitespace-normal rounded-md border border-dashed border-foreground/25 px-3 py-2 ${UI} text-sm text-muted-foreground before:order-2 before:content-[attr(data-figure-label)]`;

/**
 * v1.1 `imagine` — an anchored zero-character block. Its asset deliberately
 * carries no locator (no portal URL, no object-store key: the server resolves
 * an image by BLOCK ID, which keeps the reader's browser away from the origin
 * and the privacy gate enforceable). Until that asset endpoint serves bytes,
 * the honest rendering is a placeholder that SAYS what it is — never an empty
 * div, never a broken `<img>`. `alt`, when the source carried one, is the
 * document's own description and leads the label; the compiler can emit
 * `alt: ''`, which counts as absent here. The declared dimensions no longer
 * shape anything: the one-line placeholder has no footprint to keep.
 */
function ImagineBlock({ block, marks }: BlockProps) {
  const rawAlt = block.asset?.alt;
  const alt =
    typeof rawAlt === "string" && rawAlt.trim() !== ""
      ? rawAlt.trim()
      : undefined;
  const label =
    alt !== undefined
      ? t`Figură din actul original: ${alt}`
      : t`Figură din actul original (imagine indisponibilă)`;
  return (
    <div
      id={`tldf-${block.id}`}
      data-kind="imagine"
      {...struckAttrsOf(block)}
      className={cn(
        "mt-5 scroll-mt-24",
        block.struck === "full" && "opacity-60",
      )}
    >
      <div
        role="img"
        aria-label={label}
        data-figure-label={label}
        className={FIGURE_LINE_CLASS}
      >
        <ImageOff className="size-4 shrink-0" aria-hidden="true" />
      </div>
      {/* Contract: imagine owns no text. If a malformed artifact carries runs
          or children anyway, fidelity outranks the contract — render them
          (outside the role="img" shell, so nothing hides from the a11y tree).
          Normally renders nothing. */}
      <BlockContent block={block} marks={marks} />
      {isRepealed(block) ? <RepealedMark /> : null}
    </div>
  );
}

/**
 * `element_lista` markers. In the scrapper pipeline BOTH of `markerTextOf`'s
 * paths leave the marker in the character stream: `portal-html-sanitize.ts`
 * `materializeListMarkers` injects the `data-list-text` attribute value as
 * REAL TEXT inside the li's first p/h*, and `preparePortalHtml` — the single
 * preparation both parsers apply — always calls it; `structure-parser.ts`
 * `markerTextOf` then returns that same attribute as the block's `label`
 * (the other path is a leading classless span, also real text). The check
 * below is therefore not a belt-and-braces net for an exotic case: it is
 * the ONLY thing standing between `label` and a doubled marker. Native list
 * markers are suppressed locally (`list-none`); when the item's folded text
 * does not already open with the label as a marker, the label is restored
 * as CSS generated content — visible, zero textContent. Never both, and
 * never a browser-invented number.
 *
 * The materialiser injects the attribute VERBATIM while `markerTextOf`
 * TRIMS it, so a `data-list-text=" I."` divergence (leading space in the
 * stream, trimmed label) is the realistic doubling shape this check exists
 * to catch. Do not "simplify" it away.
 */
function listMarkerOf(block: TldfBlock): string | undefined {
  const label = block.label?.trim();
  if (label === undefined || label === "") return undefined;
  return foldedTextOpensWithMarker(foldTldfBlocks([block]), label)
    ? undefined
    : label;
}

/**
 * True when the item's folded text already opens with `label` as a MARKER,
 * not as a coincidental prefix. `1.` matches `1. Textul` (boundary after the
 * label: end-of-text or a non-alphanumeric) and does not match `1.5% dobanda`.
 * The body is trimStart'd — same trim behaviour `listMarkerOf` has always
 * used; `label` is the already-trimmed value.
 */
function foldedTextOpensWithMarker(folded: string, label: string): boolean {
  const body = folded.trimStart();
  if (!body.startsWith(label)) return false;
  const remainder = body.slice(label.length);
  return remainder === "" || !/^[\p{L}\p{N}]/u.test(remainder);
}

/** Applied only alongside `data-list-marker`: an empty `::before` with a
    margin would still paint stray leading space. */
// The marker is an inline block, which the item's own strike does not cross:
// a fully struck item strikes it by its own rule.
const LIST_MARKER_CLASS =
  "before:mr-2 before:inline-block before:min-w-6 before:font-medium before:text-foreground/70 before:content-[attr(data-list-marker)] [&[data-struck=full]]:before:text-muted-foreground [&[data-struck=full]]:before:line-through [&[data-struck=full]]:before:decoration-1 [&[data-struck=full]]:before:decoration-foreground/40";

/* ── v1.1 source-state rendering (user decision 2026-08-26) ──────────────── */

/**
 * Visible strikethrough, maximum fidelity first: nothing hidden, nothing
 * moved — with a thin, pale line, so struck text stays readable (owner, 26
 * November 2026). A strike alone is SOURCE EVIDENCE — only `struck_repealed`
 * (the validated narrow rule) is allowed to say "abrogat".
 */
const STRUCK_TEXT_CLASS =
  "text-muted-foreground line-through decoration-1 decoration-foreground/40";

function struckClassOf(block: TldfBlock): string | undefined {
  // 'partial' draws via exact `struck` marks; the block face stays upright.
  return block.struck === "full" ? STRUCK_TEXT_CLASS : undefined;
}

/** The validated narrow rule, and the only thing allowed to say "abrogat". */
const isRepealed = (block: TldfBlock): boolean =>
  block.struck !== undefined && block.struck_repealed === true;

function struckAttrsOf(block: TldfBlock): {
  readonly "data-struck"?: "partial" | "full";
  readonly title?: string;
} {
  if (block.struck === undefined) return {};
  return {
    "data-struck": block.struck,
    ...(isRepealed(block) && { title: t`Text abrogat` }),
  };
}

/**
 * The repealed state as the site's status mark (`LegalStatusBadge`): colour
 * in the ring alone, the word in plain text after the struck provision. An
 * EMPTY element: the ring is `::before`, the word is `::after` generated from
 * `data-label`, and assistive tech gets the same word from `role="img"` +
 * `aria-label` — so the column's text content is unchanged. `inline-flex`
 * makes it an atomic inline, so the block's strike line does not run through
 * the word.
 */
const STATE_MARK = `ml-2 inline-flex items-center gap-1.5 whitespace-nowrap ${UI} text-xs text-foreground/80 before:size-2.5 before:shrink-0 before:rounded-full before:border-[1.5px] before:border-status-blocked-fg before:content-[''] after:content-[attr(data-label)]`;

/* ── folded notes of the Portal ──────────────────────────────────────────── */

/**
 * Whether a long note of the Portal shows only its first lines. A context so
 * it reaches notes at any depth (a cell, a list item) without threading a
 * prop through every wrapper; `TldfBlocksView` sets it, `FoldedNote` turns it
 * off for its own content (one fold per note).
 */
/**
 * The repealed state in words: an empty element (the text is unchanged) named
 * for assistive technology, its ring and word drawn as generated content. The
 * word is in the reader's language while the law around it is Romanian, so it
 * says which language it is.
 */
function RepealedMark() {
  const { i18n } = useLingui();
  return (
    <span
      role="img"
      lang={i18n.locale}
      aria-label={t`abrogat`}
      data-label={t`abrogat`}
      className={STATE_MARK}
    />
  );
}

const FoldNotes = createContext(false);

/** A note longer than this many characters (its span) is folded, when notes are folded at all. */
const LONG_NOTE = 600;

/**
 * A long note of the Portal (the transitional provisions of amending acts a
 * consolidated form carries at its head run to a screen or more), folded to
 * its first lines. Every word stays in the DOM in fold order — find-in-page
 * and copy still reach it; the fold is a height clamp, not a removal. The
 * control's words are generated content from `data-label` (its accessible
 * name is `aria-label`), so the column's text content is unchanged.
 */
function FoldedNote({ block, marks }: BlockProps) {
  const { i18n } = useLingui();
  const [open, setOpen] = useState(false);
  const note = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const more = t`Arată toată nota`;
  // Opened, the box scrolls no more and its own offset is gone: the page
  // takes the same distance, so what was brought into view stays in view.
  const openKeepingPlace = (box: HTMLElement) => {
    const moved = box.scrollTop;
    flushSync(() => setOpen(true));
    if (moved > 0) window.scrollBy(0, moved);
  };
  return (
    <div
      ref={note}
      id={`tldf-${block.id}`}
      data-kind="nota"
      {...{ [FOLDED_NOTE_ATTR]: open ? "open" : "closed" }}
      className={cn(BLOCK_CLASS.nota, "scroll-mt-24")}
    >
      <div
        ref={body}
        // Takes the focus when the note is opened from the keyboard (below).
        tabIndex={-1}
        // A hidden-overflow box still scrolls when something inside it is
        // brought into view: a find-in-page hit, a link taking keyboard focus.
        // The note opens then, so the target is never shown inside a clipped
        // box with the note's first lines pushed out. (A `?nod=` jump opens
        // the note first: `revealFoldedNote`.)
        onScroll={(event) => {
          if (!open && event.currentTarget.scrollTop > 0) {
            openKeepingPlace(event.currentTarget);
          }
        }}
        // Focus on something in the faded or clipped part opens the note too,
        // whether or not the box had to scroll to show it.
        onFocus={(event) => {
          const box = event.currentTarget;
          if (open || event.target === box) return;
          const edge = box.getBoundingClientRect().bottom - 40;
          if (event.target.getBoundingClientRect().bottom > edge) {
            openKeepingPlace(box);
          }
        }}
        className={cn(
          "outline-none",
          // The note's label keeps its colour inside this wrapper too.
          "[&>[data-role=ttl]]:text-foreground",
          // The last lines fade by a mask, so the fade is right on any ground
          // (the note's own, a table cell's, either theme). On paper the note
          // is whole.
          !open &&
            "max-h-[8.25rem] overflow-hidden [mask-image:linear-gradient(to_bottom,#000_calc(100%_-_2.5rem),transparent)] print:max-h-none print:overflow-visible print:[mask-image:none]",
        )}
      >
        {/* One fold for the whole note: a long line inside it is not folded again. */}
        <FoldNotes.Provider value={false}>
          <BlockContent block={block} marks={marks} />
        </FoldNotes.Provider>
      </div>
      <button
        type="button"
        // The control speaks the reader's language inside a Romanian text.
        lang={i18n.locale}
        onClick={(event) => {
          if (!open) {
            // Pressed from the keyboard, the control would go to the far end
            // of the opened note with the focus on it, and the next Tab would
            // skip every link of the text just shown: the focus goes to the
            // note's start. A pointer, and a jump that opens the note for its
            // target, leave the focus where it is.
            const fromKeyboard =
              event.detail === 0 &&
              document.activeElement === event.currentTarget;
            flushSync(() => setOpen(true));
            if (fromKeyboard) body.current?.focus({ preventScroll: true });
            return;
          }
          // Closed from far down a long note, the reader would be left below
          // it with the control above the screen: the note comes back in view.
          flushSync(() => setOpen(false));
          note.current?.scrollIntoView({ block: "nearest" });
        }}
        aria-expanded={open}
        aria-label={open ? t`Arată mai puțin din notă` : more}
        data-label={open ? t`Arată mai puțin` : more}
        className="mt-1 inline-flex min-h-11 items-center whitespace-normal font-medium text-foreground underline decoration-foreground/30 underline-offset-4 before:content-[attr(data-label)] hover:decoration-foreground sm:min-h-9 print:hidden"
      />
    </div>
  );
}

function BlockView({ block, marks }: BlockProps) {
  const foldNotes = useContext(FoldNotes);
  if (!KNOWN_KINDS.has(block.kind) && !warnedKinds.has(block.kind)) {
    warnedKinds.add(block.kind);
    logger.warn("Unknown TLDF block kind, rendering as plain block", {
      kind: block.kind,
    });
  }

  if (block.kind === "tabel") {
    const rejection = tableGuardRejection(block);
    if (rejection === null) {
      return <TableBlock block={block} marks={marks} />;
    }
    warnUnrenderableTable(rejection);
  }
  if (
    foldNotes &&
    block.kind === "nota" &&
    block.struck === undefined &&
    block.span[1] - block.span[0] > LONG_NOTE
  ) {
    return <FoldedNote block={block} marks={marks} />;
  }
  if (block.kind === "imagine") {
    return <ImagineBlock block={block} marks={marks} />;
  }

  // v1.1 lists take real list elements with no shape guard: unlike tables,
  // the HTML parser never relocates stray content out of a list, so an
  // off-contract child renders in place — invalid markup at worst, but
  // hydration-consistent and character-exact. `rand`/`celula` outside a
  // renderable table deliberately fall through to the plain div.
  const Tag =
    block.kind === "lista"
      ? block.type === "OL"
        ? "ol"
        : "ul"
      : block.kind === "element_lista"
        ? "li"
        : "div";
  const marker =
    block.kind === "element_lista" ? listMarkerOf(block) : undefined;
  // The Portal's note of a change takes the note face, never the quoted or
  // dash-rule display heuristics.
  const note = block.annotation_role === "amendment_note";
  // A drawn layout scrolls sideways in its box (`whitespace-pre`), so the box
  // must take focus to be scrollable from the keyboard (WCAG 2.1.1) and be
  // named to be announced — same reasoning, and same attribute-only label, as
  // the table shell.
  const scroll = block.kind === "preformatat";
  const repealed = isRepealed(block);

  return (
    <Tag
      id={`tldf-${block.id}`}
      data-kind={block.kind}
      {...(note && { "data-annotation": "amendment_note" })}
      {...(marker !== undefined && { "data-list-marker": marker })}
      {...struckAttrsOf(block)}
      {...(scroll && {
        tabIndex: 0,
        role: "region",
        "aria-label": t`Text aliniat pe coloane, derulabil orizontal`,
      })}
      className={cn(
        note ? AMENDMENT_NOTE : BLOCK_CLASS[block.kind],
        note ? undefined : displayClass(block),
        // An `<li>` never shows the browser's own bullet, whatever face the
        // block takes (the note of a change replaces the kind's classes).
        Tag === "li" && "list-none",
        marker !== undefined && LIST_MARKER_CLASS,
        struckClassOf(block),
        "scroll-mt-24",
      )}
    >
      <BlockContent block={block} marks={marks} />
      {repealed ? <RepealedMark /> : null}
    </Tag>
  );
}

export type TldfBlocksViewProps = {
  readonly blocks: readonly TldfBlock[];
  /** DOCUMENT-level marks (the envelope's; chunk payloads reuse the same array). */
  readonly marks: readonly TldfMark[];
  readonly containsNonBmp: boolean;
  /**
   * Show only the first lines of a long note of the Portal (a `nota` longer
   * than LONG_NOTE characters, not struck), with a control that opens it.
   * Off by default; the act page turns it on.
   */
  readonly foldNotes?: boolean;
};

/**
 * The reading column for one block sequence (a whole envelope, or one chunk
 * group of a giant document). `whitespace-pre-wrap` makes the `\n` separators
 * the visible line structure without touching a character.
 */
/** Recursive character count — sizes the `content-visibility` placeholder. */
function charCount(blocks: readonly TldfBlock[]): number {
  let total = 0;
  for (const block of blocks) {
    for (const run of block.content)
      total += (run.sep?.length ?? 0) + run.text.length;
    if (block.children !== undefined) total += charCount(block.children);
  }
  return total;
}

export function TldfBlocksView({
  blocks,
  marks,
  containsNonBmp,
  foldNotes = false,
}: TldfBlocksViewProps) {
  const index = useMemo(
    () => buildMarkIndex(marks, containsNonBmp),
    [marks, containsNonBmp],
  );
  // ~0.5px per character at this measure (≈78ch lines, 31.5px line height,
  // legal text's short lines push it up) — a flat 1200px placeholder made a
  // 20.000px document collapse to nothing until scrolled, so every anchor
  // jump landed on ground that then moved.
  const intrinsicHeight = useMemo(
    () => Math.max(1200, Math.round(charCount(blocks) * 0.5)),
    [blocks],
  );
  return (
    // The reader's serif (SERIF) at 17px/1.7 on a phone, 18px/1.75 from `sm`
    // — long-form legal reading, distinct from the sans UI around it;
    // headings and apparatus return to Inter via the per-kind classes above.
    // The first block's top margin is dropped only when this column is the
    // first of its parent: in a chunked document every later group keeps the
    // margin its first block takes at the group boundary.
    <div
      className={cn(
        "whitespace-pre-wrap text-[1.0625rem] leading-[1.7] text-foreground [content-visibility:auto] sm:text-lg sm:leading-[1.75] [&:first-child>*:first-child]:mt-0",
        SERIF,
      )}
      style={{ containIntrinsicSize: `auto ${String(intrinsicHeight)}px` }}
    >
      <FoldNotes.Provider value={foldNotes}>
        {blocks.map((block) => (
          <BlockView key={block.id} block={block} marks={index} />
        ))}
      </FoldNotes.Provider>
    </div>
  );
}
