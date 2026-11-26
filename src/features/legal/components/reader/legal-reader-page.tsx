/**
 * The act READING LAYOUT — the body of `/legislation/acts/$actId`.
 *
 * One page, portal-legislativ-shaped (user decision 2026-08-10: the text is
 * not a separate route), with the TEXT as the main content (user decision
 * 2026-08-11): a left nav carrying only the served Cuprins, and a main column
 * that runs lead (the summary card, warnings folded in) → the full text
 * (headingless — the page header is its masthead, and the text's own leading
 * masthead lines hide exactly where the header provably repeats them, see
 * `lib/tldf/masthead.ts`) → the fișa (detail bands, passed in as the `fisa`
 * slot) at the bottom. Composes
 * the four committed layers: the render transport (classified failures,
 * mock/live), the mark-slicing engine, the fidelity-gated block renderer, and
 * the served outline (TOC + `?nod=` deep links). What the text section shows
 * IS the proven clean text; everything else on the page is chrome around that
 * claim.
 *
 * CHUNKED DOCUMENTS are never an infinite scroller hiding extent: the
 * manifest declares "partea N din M" up front, groups load progressively
 * (IntersectionObserver sentinel, with an explicit button as the universal
 * fallback), and a failed group offers retry INLINE without discarding what
 * already renders. A `?nod=` deep link auto-chains groups IN ORDER up to the
 * one holding its target — never out of order, so content cannot land above
 * the viewport and shift the reading position.
 *
 * FAILURE STATES ARE CONTENT, not apologies: "no servable text",
 * "restricted", "inconsistent" and "transport" each render their own fact,
 * and only retryable ones offer a retry. The portal source link is the
 * escape hatch on every one of them. An outline failure degrades to a
 * nav-less text — it never blocks the text.
 *
 * `?doc=` reads a specific non-canonical expression — an opaque id: a Portal
 * page id on the legacy source, `f<form_id>` on legal_v2, where an old page id
 * from a shipped link still resolves (`resolveDocOverride`). A version
 * selector heads the text, and a Portal consolidation's text always carries
 * the consolidation banner (LEG-X3AV). `?nod=` (a
 * document_nodes PATH) resolves against the served outline; scroll-position
 * sync highlights the TOC entry only and never writes the URL back (the
 * copy/share mechanism is selecting a TOC entry, not scrolling).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ExternalLink, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { LegalActDetail, LegalOutlineEntry } from '@/schemas/legal'
import { useQueryClient } from '@tanstack/react-query'
import { fetchLegalRender } from '../../api/legal-render-api'
import { useAwayFromHead } from '../../hooks/use-away-from-head'
import { useLegalOutline } from '../../hooks/use-legal-outline'
import { legalRenderQueryKey, useLegalRender } from '../../hooks/use-legal-render'
import { useLegalResolveDocument } from '../../hooks/use-legal-resolve-document'
import {
  isTextNotYetAvailable,
  LegalRenderFailureError,
} from '../../lib/legal-render-error'
import type { LegalRenderFailure } from '../../lib/legal-render-error'
import { uniqueGazettePublication } from '../../lib/act-facts'
import { CONTENTS_FOLD_FROM, isArticleEntry } from '../../lib/legal-outline'
import {
  defaultReadingOf,
  findVersion,
  isConsolidationVersion,
  resolveDocOverride,
  shownVersionDate,
  versionName,
  withServedForm,
} from '../../lib/legal-versions'
import { ActDefaultNotices } from '../act-default-notices'
import { legalIssuerLabel } from '../../lib/legal-vocabulary'
import { splitMasthead } from '../../lib/tldf/masthead'
import type { MastheadFactsInHeader, MastheadSplit } from '../../lib/tldf/masthead'
import { FOLDED_NOTE_ATTR, revealFoldedNote } from '../../lib/tldf/folded-note'
import { domAnchorForPath, resolveNod } from '../../lib/tldf/nod-resolve'
import type { TldfChunkPayload, TldfManifestPayload } from '../../lib/tldf/types'
import { ACT_COLUMN, ACT_GRID, ACT_GRID_THREE, ACT_TITLE_ID } from './act-page-grid'
import { ActReadingBar, ActToStartButton } from './act-reading-bar'
import { ActTextAbout } from './act-text-about'
import { ContentsRecordLink, GoToArticle, LegalReaderToc } from './legal-reader-toc'
import { TldfBlocksView } from './tldf-blocks'

/** The articles from which the contents' box carries the field that jumps to one. */
const JUMP_FROM = 8

type Props = {
  readonly act: LegalActDetail
  /**
   * The page lead — the plain-language summary, no heading. As a function it is
   * told whether the act's warnings are its to show: they are, only when the
   * box about the text shown (which wears them) is not on the page.
   */
  readonly lead: React.ReactNode | ((placement: { readonly withWarnings: boolean }) => React.ReactNode)
  /**
   * The act's warnings, as rows: worn by the box about the text shown whenever
   * it is on the page (the reading column below 88rem, the right column from
   * there), so they are said once at any width.
   */
  readonly warnings?: React.ReactNode
  /** The fișa — the detail accordion, rendered under its own section H2. */
  readonly fisa: React.ReactNode
  /**
   * `?doc=` — read this expression instead of the canonical document. Honoured
   * only when it is one of `act.documents`; another act's document is refused.
   */
  readonly docOverride?: string
  /** `?nod=` — a document_nodes PATH deep link into this text. */
  readonly nod?: string
  /**
   * Fires when the text's masthead is split off: the act's subject
   * ("privind achizițiile publice") completes the page header's den line —
   * the header is this text's masthead now (user decision 2026-08-11), and
   * the subject exists nowhere in the act's metadata — and `lifted` tells
   * the fișa's provenance notes to DISCLOSE the move (the body no longer
   * repeats the official opening lines, and that must be said somewhere).
   * Called with `null` when the expression changes.
   */
  readonly onMasthead?: (
    info: { readonly subject: string | null; readonly lifted: boolean } | null,
  ) => void
}

/**
 * The deep link's passing highlight, important: a note nested in a note would
 * otherwise lose it to the parent note's `[&_[data-kind=nota]]:bg-transparent`.
 * A light tint of the text's own colour: the theme's `accent` is black on the
 * light theme, and 60% of it hid the very passage it pointed at. The block's
 * own text takes the full text colour for as long: muted small print on the
 * tint would fall under 4.5:1.
 */
const NOD_HIGHLIGHT = ['bg-foreground/10!', 'text-foreground!'] as const

/** Scroll to a nod's block, preferring the exact path over its outline anchor. */
function scrollToNodTarget(nod: string, anchorPath: string): boolean {
  const target =
    document.getElementById(domAnchorForPath(nod)) ??
    document.getElementById(domAnchorForPath(anchorPath))
  if (target === null) return false
  // A folded note of the Portal that holds the target opens first: a target
  // near its start would be reached without the clipped box scrolling at all.
  // Its control commits the opening at once (`flushSync`), which React refuses
  // inside an effect — where a deep link lands — so the opening and the
  // scroll then wait for the effect to end.
  const reveal = () => {
    revealFoldedNote(target)
    target.scrollIntoView({ block: 'start' })
  }
  if (target.closest(`[${FOLDED_NOTE_ATTR}="closed"]`) !== null) queueMicrotask(reveal)
  else reveal()
  target.classList.add(...NOD_HIGHLIGHT)
  window.setTimeout(() => target.classList.remove(...NOD_HIGHLIGHT), 1600)
  return true
}

export function ActReadingLayout({
  act,
  lead,
  warnings,
  fisa,
  docOverride,
  nod,
  onMasthead,
}: Props) {
  // `?doc=` must name an expression OF THIS ACT. Any other document id is
  // refused, never rendered under this act's header, summary and official
  // link (I-17: `?doc=54260` put the 1886 Berne Convention under CNSU 2022).
  // On legal_v2 an old numeric page id from a shipped link is resolved by the
  // server's act-scoped lookup (`LegalAct.resolveDocument`), and its answer
  // is kept only when it names one of this act's versions — otherwise the
  // default text is read, with the notice. Nothing renders while it resolves:
  // the default text must not flash in and then be replaced.
  // The default text: the canonical (current) form, or — when the latest
  // form has no text (legal_v2 `latest_not_available`) — the latest form
  // that has one, shown as NOT the current version.
  const defaultReading = defaultReadingOf(act)
  const canonicalId = defaultReading.documentId
  const resolution = docOverride === undefined ? null : resolveDocOverride(act, docOverride)
  const probeId = resolution?.kind === 'probe' ? resolution.documentId : null
  const resolved = useLegalResolveDocument(act.actId, probeId)
  const resolvedId = probeId !== null ? (resolved.data ?? null) : null
  const probeOwn =
    resolvedId !== null && act.documents.some((d) => d.documentId === resolvedId)
  const probePending = probeId !== null && resolved.isPending
  const probeRefused = probeId !== null && !probePending && !probeOwn
  const ownId = resolution?.kind === 'own' ? resolution.documentId : probeOwn ? resolvedId : null
  const documentId = probePending ? null : (ownId ?? canonicalId)
  // legal_v2 renders revalidate on every mount (no-store; content can be
  // withdrawn) — legacy generations stay fresh for 30 minutes.
  const render = useLegalRender(documentId, { legalV2: act.dataSource === 'legal_v2' })
  const override = ownId ?? undefined
  const foreignDoc = resolution?.kind === 'foreign' || probeRefused
  // A `?nod=` belongs to the `?doc=` it came with: when that document is refused, the default text is another
  // version, where the same path may name another provision. It is then neither resolved, scrolled to, marked
  // nor said to be missing (review astra-client-11).
  const targetNod = foreignDoc ? undefined : nod
  // The version on screen. The render's `servedForm` (legal_v2 REST meta) is
  // the authoritative account of the text actually served; the version list
  // fills in what it lacks.
  const shownId = render.data?.servedForm?.documentId ?? render.data?.documentId ?? documentId
  const shownVersion = withServedForm(findVersion(act, shownId), render.data?.servedForm ?? null)
  const sourceUrl = shownVersion?.sourceUrl ?? act.officialTextUrl
  const showConsolidationBanner =
    render.isSuccess && shownVersion !== null && isConsolidationVersion(shownVersion)
  const showsDefault = documentId !== null && documentId === canonicalId
  const notCurrentDefault = showsDefault && defaultReading.basis === 'latest_available'
  const onlyReadableDefault = showsDefault && defaultReading.basis === 'only_readable'
  const outlineQuery = useLegalOutline(documentId)
  const outline = useMemo(() => outlineQuery.data ?? [], [outlineQuery.data])
  const navigate = useNavigate()

  /** Bumped whenever text blocks land in the DOM (envelope render, chunk load). */
  const [domVersion, setDomVersion] = useState(0)
  const [activePath, setActivePath] = useState<string | null>(null)
  const [nodMissed, setNodMissed] = useState(false)

  const manifest =
    render.data !== undefined && render.data.kind === 'manifest' ? render.data.tldf : null

  // `?nod=` resolution over the served outline (null until both arrive).
  const nodResolution = useMemo(() => {
    if (targetNod === undefined || outline.length === 0) return null
    return resolveNod(targetNod, outline, manifest?.chunks)
  }, [targetNod, outline, manifest])

  // Deep-link scroll: retried on every DOM growth until the anchor exists
  // (on chunked documents the target group may still be loading). When the
  // outline gives no resolution — 46.694 paragraph_stream documents serve an
  // EMPTY outline yet render real block ids — the nod itself is tried as a
  // direct DOM anchor, so a shared link still lands. The intent is keyed by
  // DOCUMENT and nod: the same nod on a different `?doc=` is a new scroll,
  // and there is no separate reset effect to erase a fresh landing.
  const scrollIntentKey = `${documentId ?? ''}::${targetNod ?? ''}`
  const scrolledForRef = useRef<string | null>(null)
  useEffect(() => {
    if (targetNod === undefined) return
    if (scrolledForRef.current === scrollIntentKey) return
    if (scrollToNodTarget(targetNod, nodResolution?.entry.path ?? targetNod)) {
      scrolledForRef.current = scrollIntentKey
      setActivePath(nodResolution?.entry.path ?? targetNod)
      setNodMissed(false)
    }
  }, [scrollIntentKey, targetNod, nodResolution, domVersion])

  // An unresolvable nod is an honest notice, never a guessed scroll — but
  // only once the page can actually judge: outline answered, text actually
  // ON SCREEN (a manifest with all slots pending has rendered nothing —
  // domVersion counts real block commits), no anchor landed. (Chunked
  // no-outline docs cannot chain to an unloaded group without an outline;
  // the notice is the honest answer for a target beyond the loaded extent.)
  const renderSettled =
    render.isSuccess && (render.data.kind !== 'manifest' || domVersion > 0)
  const outlineSettled = outlineQuery.isSuccess || outlineQuery.isError
  useEffect(() => {
    setNodMissed(
      targetNod !== undefined &&
        renderSettled &&
        outlineSettled &&
        nodResolution === null &&
        scrolledForRef.current !== scrollIntentKey &&
        document.getElementById(domAnchorForPath(targetNod)) === null,
    )
  }, [targetNod, scrollIntentKey, renderSettled, outlineSettled, nodResolution, domVersion])

  // Scroll-position sync: highlight the TOC entry of the heading nearest the
  // top of the viewport. Highlight only — never a URL writeback.
  useEffect(() => {
    if (outline.length === 0 || typeof IntersectionObserver === 'undefined') return
    const observed: Element[] = []
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (hit !== undefined) {
          setActivePath(hit.target.id.replace(/^tldf-/, ''))
        }
      },
      { rootMargin: '0% 0% -75% 0%' },
    )
    for (const entry of outline) {
      const el = document.getElementById(domAnchorForPath(entry.path))
      if (el !== null) {
        observer.observe(el)
        observed.push(el)
      }
    }
    return () => observer.disconnect()
  }, [outline, domVersion])

  const onTocSelect = useCallback(
    (entry: LegalOutlineEntry, options?: { readonly deferScroll?: boolean }) => {
      void navigate({
        to: '.',
        // After a refused `?doc=`, the provision is chosen in the text on show: that text's id goes with it, so the
        // choice survives a reload and is resolved (and its chunk loaded) like any link (review astra-client-12).
        search: (prev: Record<string, unknown>) => ({ ...prev, ...(foreignDoc && documentId !== null ? { doc: documentId } : {}), nod: entry.path }),
        replace: true,
        resetScroll: false,
      })
      // Same-nod reselection still deserves a scroll.
      scrolledForRef.current = null
      setActivePath(entry.path)
      // From the phone's sheet the scroll waits a frame, until the closing sheet has let go of the page's scroll.
      if (options?.deferScroll === true) requestAnimationFrame(() => scrollToNodTarget(entry.path, entry.path))
      else scrollToNodTarget(entry.path, entry.path)
    },
    [navigate, foreignDoc, documentId],
  )

  // An entry's own address, for a new tab or a copied link: the same `?doc=`
  // and `?nod=` a choice in the contents writes.
  const tocHref = useCallback(
    (entry: LegalOutlineEntry) => {
      const doc = foreignDoc ? documentId : (docOverride ?? null)
      return `?${new URLSearchParams({ ...(doc !== null && { doc }), nod: entry.path }).toString()}`
    },
    [foreignDoc, documentId, docOverride],
  )

  // The contents: folded or whole (a long outline starts folded until the
  // reader chooses), and the phone's sheet that carries them.
  const [folded, setFolded] = useState<boolean | null>(null)
  const collapsed = folded ?? outline.length > CONTENTS_FOLD_FROM
  const [sheetOpen, setSheetOpen] = useState(false)
  const onSheetSelect = useCallback(
    (entry: LegalOutlineEntry) => {
      setSheetOpen(false)
      onTocSelect(entry, { deferScroll: true })
    },
    [onTocSelect],
  )
  const toRecord = useCallback((fromSheet: boolean) => {
    setSheetOpen(false)
    const go = () => document.getElementById('act-fisa')?.scrollIntoView({ block: 'start' })
    if (fromSheet) requestAnimationFrame(go)
    else go()
  }, [])

  // In a long contents the lit place is kept in sight, inside the box only:
  // the box's own scroll is moved, never the window's (`scrollIntoView` would
  // move both).
  useEffect(() => {
    if (activePath === null) return
    const box = document.querySelector('[data-act-contents]')
    const lit = box?.querySelector('[aria-current=location]')
    if (box == null || lit == null) return
    const frame = box.getBoundingClientRect()
    const mark = lit.getBoundingClientRect()
    if (mark.top < frame.top + 8 || mark.bottom > frame.bottom - 48) box.scrollTop += mark.top - frame.top - frame.height / 2
  }, [activePath, collapsed])

  // The ways back to the act's start show once its head has left the screen.
  // At once, not as a glide (a code is a hundred screens long), and the focus
  // goes to the act's title.
  const { markerRef, away } = useAwayFromHead()
  const toStart = useCallback(() => {
    window.scrollTo({ top: 0 })
    document.getElementById(ACT_TITLE_ID)?.focus({ preventScroll: true })
  }, [])

  const onDomGrowth = useCallback(() => setDomVersion((v) => v + 1), [])

  // The VALUES the page header above actually displays — the text's leading
  // masthead lines hide only behind an exact-fact match against these (user
  // decision 2026-08-11: the header owns the act's identity). On a `?doc=`
  // override nothing hides: the header describes the canonical act, and an
  // alternate expression's masthead (a republicare's, say) may legitimately
  // differ. Must assemble EXACTLY what ActDetailHeader renders — a value the
  // header does not show must arrive here as null.
  const mastheadFacts = useMemo<MastheadFactsInHeader>(() => {
    if (override !== undefined) {
      return { den: null, issuerLabel: null, issueNumber: null, issueYear: null }
    }
    const publication = uniqueGazettePublication(act)
    const issueDate = publication?.issueDate ?? null
    return {
      den: act.canonical?.den ?? null,
      issuerLabel: act.issuerSlug !== null ? legalIssuerLabel(act.issuerSlug) : null,
      issueNumber: publication?.issueNumber ?? null,
      // The year the header's "din <date>" fragment displays — without a
      // date the header shows no year, and a bare issue number identifies
      // nothing (MO numbering restarts every year).
      issueYear: issueDate !== null ? Number(issueDate.slice(0, 4)) : null,
    }
  }, [act, override])

  // The masthead split of whatever text is actually on screen goes up to
  // the page (header subject + provenance disclosure). Reset when the
  // expression changes — one text's lift must not describe another.
  useEffect(() => {
    onMasthead?.(null)
  }, [documentId, onMasthead])
  const handleMasthead = useCallback(
    (split: MastheadSplit) => {
      onMasthead?.({ subject: split.subject, lifted: split.lifted })
    },
    [onMasthead],
  )

  // Envelope documents split synchronously from the payload; chunked ones
  // report from group 0 inside ChunkedReader.
  const envelopeSplit = useMemo(
    () =>
      render.data !== undefined && render.data.kind === 'envelope'
        ? splitMasthead(render.data.tldf.blocks, mastheadFacts)
        : null,
    [render.data, mastheadFacts],
  )
  useEffect(() => {
    if (envelopeSplit !== null) handleMasthead(envelopeSplit)
  }, [envelopeSplit, handleMasthead])

  const { i18n } = useLingui()
  // The box about the text shown is on the page whenever a version is shown;
  // it then wears the warnings, and the lead does not.
  const about = shownVersion !== null
  const leadNode = typeof lead === 'function' ? lead({ withWarnings: !about }) : lead
  const outlinePending = probePending || (documentId !== null && outlineQuery.isPending)
  const jump = outline.filter(isArticleEntry).length >= JUMP_FROM

  return (
    <div className="pb-24 print:pb-0">
      {/* Right under the act's head: the ways back to the start show once it has left the screen. */}
      <div ref={markerRef} aria-hidden />
      <a
        href="#reader-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:px-3 focus:py-2"
      >
        <Trans>Sari la textul actului</Trans>
      </a>

      <ActReadingBar
        citation={act.displayCitation}
        outline={outline}
        activePath={activePath}
        shownName={shownVersion === null ? null : versionName(shownVersion.versionKind, shownVersionDate(act, shownVersion), i18n.locale)}
        about={about}
        away={away}
        onToStart={toStart}
        collapsed={collapsed}
        onToggleFold={() => setFolded(!collapsed)}
        sheetOpen={sheetOpen}
        onSheetOpenChange={setSheetOpen}
        sheetContents={
          <>
            <div className="p-4">
              <LegalReaderToc entries={outline} activePath={activePath} onSelect={onSheetSelect} hrefFor={tocHref} touch collapsed={collapsed} openPath={activePath} />
            </div>
            <ContentsRecordLink touch onGo={() => toRecord(true)} />
          </>
        }
      />

      {/* One grid for the contents, the reading column and, from 88rem, the
          box about the text shown. Its children keep ONE tree position each
          whether or not an outline exists or a version is shown — flipping
          between layouts would remount the reader and wipe already-loaded
          chunk state (measured: the TOC arriving mid-read reset a chunked
          document to part 1). Keys pin the reconciliation, and the cells are
          moved by grid placement, never by remounting. */}
      {/* No `items-start`: the side cells span every row, so their sticky
          boxes have room to travel alongside the whole read. The contents'
          column is UNCONDITIONAL even when the outline settles empty: the
          page header above sits on this same grid, so releasing the column
          would tear the header's left edge away from the text's. */}
      <div className={cn(ACT_GRID, ACT_GRID_THREE, 'pt-6 print:block print:max-w-none')}>
        <aside key="nav" className={cn('hidden lg:col-start-1 lg:row-span-3 lg:row-start-1 lg:block print:hidden', outline.length > 0 && '-mt-6')}>
          {outline.length > 0 ? (
            // A box hung from the reading bar, which is its head: the jump
            // field and the way to the record stay, the list scrolls between.
            <div className="sticky top-[3.125rem] flex max-h-[calc(100dvh-4rem)] flex-col overflow-hidden rounded-md rounded-t-none border border-t-0">
              {jump ? <GoToArticle entries={outline} onSelect={onTocSelect} ruled /> : null}
              <div data-act-contents className="overflow-y-auto overscroll-contain px-3 py-3 [scrollbar-width:thin]">
                <LegalReaderToc entries={outline} activePath={activePath} onSelect={onTocSelect} hrefFor={tocHref} bare collapsed={collapsed} openPath={activePath} />
              </div>
              <ContentsRecordLink onGo={() => toRecord(false)} />
            </div>
          ) : outlinePending ? (
            <div aria-hidden className="sticky top-16 space-y-3 pt-1">
              {['w-2/3', 'w-full', 'w-5/6', 'w-1/2'].map((width) => (
                <div key={width} className={cn('h-3.5 animate-pulse rounded bg-muted motion-reduce:animate-none', width)} />
              ))}
            </div>
          ) : outlineQuery.isError ? null : (
            <p className="sticky top-16 text-sm leading-6 text-muted-foreground">
              <Trans>Acest text nu are un cuprins.</Trans>
            </p>
          )}
        </aside>

        <div key="lead" className={cn(ACT_COLUMN, 'border-b pb-6 empty:hidden lg:col-start-2 lg:row-start-1')}>
          {leadNode}
        </div>

        {shownVersion !== null ? (
          <ActTextAbout
            key="about"
            act={act}
            shown={shownVersion}
            shownDocumentId={shownId}
            consolidation={showConsolidationBanner}
            {...(warnings !== undefined && { warnings })}
            className="lg:col-start-2 lg:row-start-2 min-[88rem]:col-start-3 min-[88rem]:row-span-3 min-[88rem]:row-start-1 min-[88rem]:-mt-6"
          />
        ) : null}

        <main key="content" className={cn(ACT_COLUMN, 'lg:col-start-2 lg:row-start-3 print:max-w-none')}>
          {/* No "Textul actului" heading (user decision 2026-08-11): the page
              header IS the text's masthead now, and the chrome between them
              only restated it. The section keeps its id — external links and
              the versions band still target #act-text. */}
          <section id="act-text" aria-label={t`Textul actului`} className="scroll-mt-24 pt-5">
            {/* No standing fidelity caption (user decision 2026-08-12): the
                provenance story lives in the summary footer and the fișa.
                Only CONTEXTUAL notices render here; the version itself is
                named in the box about the text shown. */}
            <div className="space-y-4 pb-5 empty:hidden">
              {(outlineQuery.isError || docOverride !== undefined) && (
                <div className="space-y-1">
                  {outlineQuery.isError && (
                    <p className="text-xs leading-5 text-muted-foreground">
                      <Trans>
                        Cuprinsul nu s-a putut încărca — textul rămâne integral mai jos.
                      </Trans>
                    </p>
                  )}
                  {foreignDoc && (
                    <p role="status" className="text-xs leading-5 text-muted-foreground">
                      <Trans>
                        Documentul cerut nu aparține acestui act, așa că afișăm forma
                        textului afișată în mod normal.
                      </Trans>{' '}
                      <Link to="." search={{}} className="underline underline-offset-2 hover:text-foreground">
                        <Trans>Elimină parametrul din adresă</Trans>
                      </Link>
                    </p>
                  )}
                  {override !== undefined && (
                    <p className="text-xs leading-5 text-muted-foreground">
                      <Trans>Afișezi o versiune anume a textului.</Trans>{' '}
                      <Link to="." search={{}} className="underline underline-offset-2 hover:text-foreground">
                        <Trans>Revino la forma afișată în mod normal</Trans>
                      </Link>
                    </p>
                  )}
                </div>
              )}

              <ActDefaultNotices
                act={act}
                shown={shownVersion}
                notCurrentDefault={notCurrentDefault}
                onlyReadableDefault={onlyReadableDefault}
              />
            </div>

            <div>
              {documentId === null && !probePending && (
                <StateCard title={t`Fără expresie canonică`}>
                  <Trans>
                    Ținem metadatele acestui act, dar nu o expresie de text
                    căreia să îi servim conținutul.
                  </Trans>
                  <SourceLink url={sourceUrl} />
                </StateCard>
              )}
              {nodMissed && (
                <p role="note" className="mb-4 border-l-2 border-status-blocked-fg py-0.5 pl-4 text-sm font-medium leading-6 text-foreground">
                  <Trans>Nu am găsit fragmentul cerut în acest text.</Trans>
                </p>
              )}
              {((documentId !== null && render.isLoading) || probePending) && (
                // A skeleton at the serif's rhythm, not a bare grey line: it
                // reserves real height, so the fișa below doesn't leap
                // thousands of pixels when the text lands.
                <div role="status" aria-label={t`Se încarcă textul…`} className="space-y-4 pt-1">
                  {Array.from({ length: 14 }, (_, i) => (
                    <div
                      key={i}
                      className={cn(
                        'h-4 animate-pulse rounded-sm bg-muted',
                        i % 5 === 4 ? 'w-2/3' : i % 3 === 0 ? 'w-11/12' : 'w-full',
                      )}
                    />
                  ))}
                </div>
              )}
              {render.isError && (
                <RenderFailureCard
                  error={render.error}
                  sourceUrl={sourceUrl}
                  onRetry={() => void render.refetch()}
                />
              )}
              {render.data !== undefined &&
                render.data.kind === 'envelope' &&
                envelopeSplit !== null && (
                  // Keyed by document: what a reader opened in one version's
                  // text (a folded note) must not stay open in another cached
                  // version whose block has the same path. Not by generation:
                  // a revalidation that brings a new generation of the SAME
                  // document must not remount the text under the reader, shut
                  // the note a jump has just opened and leave the jump counted
                  // as done (the chunked reader differs: its chunk slots
                  // belong to one generation).
                  <EnvelopeReader
                    key={documentId ?? ''}
                    blocks={envelopeSplit.blocks}
                    marks={render.data.tldf.marks}
                    containsNonBmp={render.data.tldf.contains_non_bmp}
                    onRendered={onDomGrowth}
                  />
                )}
              {render.data !== undefined && render.data.kind === 'manifest' && (
                // Keyed by document AND generation: chunk slots are
                // per-expression state, a `?doc=` switch over a cached
                // manifest must NEVER carry another document's loaded
                // groups into this one, and a refetched manifest from a
                // NEWER generation must remount with fresh slots rather
                // than mix its marks over already-loaded older blocks.
                <ChunkedReader
                  key={`${documentId ?? ''}:${render.data.tldf.generation.run_id}`}
                  documentId={documentId ?? ''}
                  manifest={render.data.tldf}
                  sourceUrl={sourceUrl}
                  mastheadFacts={mastheadFacts}
                  onMasthead={handleMasthead}
                  chainThroughGroup={nodResolution?.chunkGroupIndex ?? null}
                  onGroupLoaded={onDomGrowth}
                />
              )}
              {/* The base route never answers `kind: 'chunk'`; the schema union simply carries it. */}
            </div>
          </section>

          {/* The fișa closes the page (user decision 2026-08-11): the reader
              who wants the record — publication, versions, references — has
              already decided the text isn't what they came for, and the
              header carries the identity facts a first glance needs. */}
          <section id="act-fisa" aria-labelledby="act-fisa-heading" className="mt-16 scroll-mt-24">
            <h2
              id="act-fisa-heading"
              className="mb-4 border-b-2 border-[var(--pnrr-border)] pb-3 text-3xl font-black tracking-tight text-[var(--pnrr-fg)]"
            >
              <Trans>Fișa actului</Trans>
            </h2>
            {fisa}
          </section>

          {/* The floating way back, beside the text from 72rem. */}
          {away ? <ActToStartButton placement="column" onToStart={toStart} /> : null}
        </main>
      </div>

      {/* The same way back below 72rem, in the window's corner. */}
      {away ? <ActToStartButton placement="corner" onToStart={toStart} /> : null}
    </div>
  )
}

function EnvelopeReader({
  blocks,
  marks,
  containsNonBmp,
  onRendered,
}: {
  readonly blocks: React.ComponentProps<typeof TldfBlocksView>['blocks']
  readonly marks: React.ComponentProps<typeof TldfBlocksView>['marks']
  readonly containsNonBmp: boolean
  readonly onRendered: () => void
}) {
  // Signal DOM growth once after mount so deep links and scroll sync attach.
  useEffect(() => {
    onRendered()
  }, [onRendered])
  return (
    <article id="reader-content" lang="ro">
      {/* The act page folds the Portal's long notes to their first lines. */}
      <TldfBlocksView blocks={blocks} marks={marks} containsNonBmp={containsNonBmp} foldNotes />
    </article>
  )
}

/** The shown text's Portal page — the escape hatch on every failure state. */
function SourceLink({ url }: { readonly url: string | null }) {
  if (url === null) return null
  return (
    <p className="mt-3">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 underline"
      >
        <Trans>Vezi textul pe legislatie.just.ro</Trans>
        <ExternalLink className="size-3" aria-hidden />
      </a>
    </p>
  )
}

function StateCard({
  title,
  children,
}: {
  readonly title: string
  readonly children: React.ReactNode
}) {
  return (
    <div className="rounded-md border bg-muted/30 p-6">
      <p className="flex items-center gap-2 font-medium">
        <TriangleAlert className="size-4 text-muted-foreground" aria-hidden />
        {title}
      </p>
      <div className="mt-2 text-sm text-muted-foreground">{children}</div>
    </div>
  )
}

function RenderFailureCard({
  error,
  sourceUrl,
  onRetry,
}: {
  readonly error: unknown
  readonly sourceUrl: string | null
  readonly onRetry: () => void
}) {
  const failure: LegalRenderFailure =
    error instanceof LegalRenderFailureError
      ? error.failure
      : { kind: 'transport', message: String(error), retryable: true }

  // legal_v2: a form whose text is not loaded yet, or whose text is a
  // composition this version does not serve (a header plus a body), is "not
  // yet available" — a fact about the corpus today, not about the act.
  const notYet = isTextNotYetAvailable(failure)

  const title = notYet
    ? t`Textul nu este încă disponibil`
    : {
        not_found: t`Nu există un text servit pentru acest document`,
        restricted: t`Textul acestui document este restricționat`,
        unavailable: t`Nu avem un text servibil pentru acest act`,
        inconsistent: t`Textul stocat este momentan inconsistent`,
        transport: t`Nu am putut încărca textul`,
      }[failure.kind]

  const body =
    failure.renderStatus === 'composition_not_served'
      ? t`Textul acestei versiuni are mai multe părți (antet și corp), pe care nu le afișăm încă împreună.`
      : failure.renderStatus === 'label_missing'
        ? t`Nu afișăm o formă consolidată fără mențiunea Portalului Legislativ și data ei, care lipsesc încă pentru această versiune.`
        : notYet
        ? t`Versiunea există pe Portalul Legislativ, dar textul ei nu este încă încărcat aici.`
        : {
            not_found: t`Ținem actul, dar nicio generare de text pentru această expresie.`,
            restricted: t`Metadatele rămân publice; textul se consultă la sursa oficială.`,
            unavailable: t`Extracția nu a produs un text servibil pentru această expresie.`,
            inconsistent: t`Am refuzat să afișăm o citire parțială. O regenerare este de regulă pe drum.`,
            transport: t`Eroare de rețea sau de server — existența textului rămâne o întrebare deschisă.`,
          }[failure.kind]

  return (
    <StateCard title={title}>
      <p>{body}</p>
      <SourceLink url={sourceUrl} />
      {failure.retryable && (
        <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          <Trans>Încearcă din nou</Trans>
        </Button>
      )}
    </StateCard>
  )
}

// ── chunked documents ─────────────────────────────────────────────────────────

type ChunkSlot =
  | { readonly state: 'pending' }
  | { readonly state: 'loading' }
  | { readonly state: 'loaded'; readonly payload: TldfChunkPayload }
  | { readonly state: 'failed'; readonly message: string }

/**
 * Progressive reader for a chunked document. Groups load in order as the
 * sentinel becomes visible; the manifest's declared extent is always on
 * screen, so the reader is never inside an unbounded scroller.
 *
 * `chainThroughGroup` (a `?nod=` deep link's target) auto-loads groups
 * SEQUENTIALLY up to that index — in order, reusing the same slots machinery,
 * so the "partea N din M" progress line narrates the chain too.
 */
function ChunkedReader({
  documentId,
  manifest,
  sourceUrl,
  mastheadFacts,
  onMasthead,
  chainThroughGroup = null,
  onGroupLoaded,
}: {
  readonly documentId: string
  readonly manifest: TldfManifestPayload
  /** For the partial-failure card's official-source escape hatch. */
  readonly sourceUrl: string | null
  readonly mastheadFacts: MastheadFactsInHeader
  readonly onMasthead?: (split: MastheadSplit) => void
  readonly chainThroughGroup?: number | null
  readonly onGroupLoaded?: () => void
}) {
  const queryClient = useQueryClient()
  const groupCount = manifest.chunks.length
  const [slots, setSlots] = useState<readonly ChunkSlot[]>(() =>
    Array.from({ length: groupCount }, () => ({ state: 'pending' as const })),
  )

  // The masthead lives in group 0 — split once per loaded payload and hand
  // the subject up for the header's den line.
  const firstSlot = slots[0]
  const firstBlocks = firstSlot?.state === 'loaded' ? firstSlot.payload.blocks : null
  const firstSplit = useMemo(
    () => (firstBlocks === null ? null : splitMasthead(firstBlocks, mastheadFacts)),
    [firstBlocks, mastheadFacts],
  )
  useEffect(() => {
    if (firstSplit !== null) onMasthead?.(firstSplit)
  }, [firstSplit, onMasthead])

  const loadChunk = useCallback(
    (groupIndex: number) => {
      setSlots((prev) => {
        const current = prev[groupIndex]
        if (current === undefined || current.state === 'loading' || current.state === 'loaded') {
          return prev
        }
        const next = [...prev]
        next[groupIndex] = { state: 'loading' }
        return next
      })
      // Physical chunk rows are 1-based; group i is chunk_index i+1.
      fetchLegalRender(documentId, { chunkIndex: groupIndex + 1 })
        .then((data) => {
          // Generation pin (mirrors the server's reassembleTldf head
          // comparison, which the progressive path bypasses): a chunk
          // fetched across a recompile carries another generation's
          // blocks, and the manifest's document-level marks would land
          // on the wrong text. Refuse the slot honestly instead. The
          // comparison and the invalidation live OUTSIDE the state
          // updater — updaters must stay pure (StrictMode double-invokes
          // them).
          const mismatch =
            data.kind === 'chunk' &&
            (data.tldf.generation.run_id !== manifest.generation.run_id ||
              data.tldf.text_sha256 !== manifest.text_sha256 ||
              data.tldf.format_version !== manifest.format_version ||
              data.tldf.document_id !== manifest.document_id)
          if (mismatch) {
            // The cached manifest is stale (30-minute staleTime): a slot
            // retry against it can never succeed, so invalidate the
            // manifest query — the refetched generation remounts the
            // reader (generation-carrying key above) with fresh slots.
            void queryClient.invalidateQueries({
              queryKey: legalRenderQueryKey(documentId),
            })
          }
          setSlots((prev) => {
            const next = [...prev]
            if (data.kind !== 'chunk') {
              next[groupIndex] = { state: 'failed', message: `unexpected payload kind ${data.kind}` }
              return next
            }
            if (mismatch) {
              next[groupIndex] = {
                state: 'failed',
                message: t`Documentul a fost recompilat între încărcări — se reîncarcă varianta curentă.`,
              }
              return next
            }
            next[groupIndex] = { state: 'loaded', payload: data.tldf }
            return next
          })
        })
        .catch((error: unknown) => {
          const message =
            error instanceof LegalRenderFailureError ? error.failure.message : String(error)
          setSlots((prev) => {
            const next = [...prev]
            next[groupIndex] = { state: 'failed', message }
            return next
          })
        })
    },
    [documentId, manifest, queryClient],
  )

  // First group loads immediately; the rest wait for the sentinel.
  useEffect(() => {
    loadChunk(0)
  }, [loadChunk])

  const loadedCount = slots.filter((slot) => slot.state === 'loaded').length
  const nextIndex = slots.findIndex((slot) => slot.state === 'pending')
  const failedIndex = slots.findIndex((slot) => slot.state === 'failed')
  // "Se încarcă" is only true while a fetch is actually in flight — while the
  // reader merely WAITS (for the scroll sentinel, or for a click where
  // IntersectionObserver is unavailable) the line states progress instead.
  const fetching = slots.some((slot) => slot.state === 'loading')

  // Deep-link chaining: keep loading the NEXT pending group (strictly in
  // order) while the target group is not yet loaded. Failures stop the chain
  // — the inline retry card takes over.
  useEffect(() => {
    if (chainThroughGroup === null || failedIndex !== -1) return
    const target = slots[chainThroughGroup]
    if (target === undefined || target.state === 'loaded') return
    if (nextIndex !== -1 && nextIndex <= chainThroughGroup) loadChunk(nextIndex)
  }, [chainThroughGroup, slots, nextIndex, failedIndex, loadChunk])

  // Parent hook for deep-link scroll + TOC sync re-attachment.
  useEffect(() => {
    if (loadedCount > 0) onGroupLoaded?.()
  }, [loadedCount, onGroupLoaded])

  const sentinelRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (nextIndex === -1 || typeof IntersectionObserver === 'undefined') return
    const sentinel = sentinelRef.current
    if (sentinel === null) return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadChunk(nextIndex)
    })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [nextIndex, loadChunk])

  return (
    <>
      {/* The article holds ONLY the law's text — find-in-page, copy and
          citation never pick up loading chrome. */}
      <article id="reader-content" lang="ro">
        {slots.map((slot, i) =>
          slot.state === 'loaded' ? (
            <TldfBlocksView
              key={manifest.chunks[i]?.block_id ?? i}
              // The masthead is a leading-prefix concern, so only group 0 is
              // ever split. Safe under absolute spans: every block and run
              // carries document offsets, so marks on the remaining blocks
              // still land exactly where they did.
              blocks={
                i === 0 && firstSplit !== null ? firstSplit.blocks : slot.payload.blocks
              }
              marks={manifest.marks}
              containsNonBmp={manifest.contains_non_bmp}
              foldNotes
            />
          ) : null,
        )}
      </article>

      {failedIndex !== -1 && (
        <div className="mt-6">
          <StateCard title={t`O parte a textului nu s-a încărcat`}>
            {(() => {
              const failedSlot = slots[failedIndex]
              return failedSlot?.state === 'failed' && failedSlot.message !== '' ? (
                <p className="text-sm text-muted-foreground">{failedSlot.message}</p>
              ) : null
            })()}
            <Button variant="outline" size="sm" onClick={() => loadChunk(failedIndex)}>
              <Trans>Reîncearcă partea {failedIndex + 1}</Trans>
            </Button>
            {/* Every failure state keeps the official-source escape hatch —
                on a summaryless act this card may be the page's only route
                to the law. */}
            <SourceLink url={sourceUrl} />
          </StateCard>
        </div>
      )}

      {loadedCount < groupCount && failedIndex === -1 && (
        <div ref={sentinelRef} className="mt-8 text-center text-sm text-muted-foreground">
          <p aria-live="polite">
            {fetching ? (
              <Trans>
                Se încarcă partea {Math.min(loadedCount + 1, groupCount)} din {groupCount}…
              </Trans>
            ) : (
              <Trans>
                Afișate {loadedCount} din {groupCount} părți — derulează sau
                apasă pentru restul.
              </Trans>
            )}
          </p>
          {nextIndex !== -1 && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => loadChunk(nextIndex)}
            >
              <Trans>Încarcă partea următoare</Trans>
            </Button>
          )}
        </div>
      )}

      {loadedCount === groupCount && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          <Trans>Sfârșitul textului — {groupCount} părți afișate integral.</Trans>
        </p>
      )}
    </>
  )
}
