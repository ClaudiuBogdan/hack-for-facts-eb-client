import { z } from 'zod'
import { coverageMetaSchema } from './elections'
import {
  GAZETTE_PART_CODES,
  LEGAL_ACT_STATUSES,
  LEGAL_DOMAIN_SLUGS,
  LEGAL_EVENT_KINDS,
  LEGAL_EVENT_SOURCES,
} from './legal-search'

// The routes' URL contract (search params), lazy and apart so the route tree
// does not carry this module: `legal-search.ts`, re-exported here.
export {
  legalChangesSearchSchema,
  legalFinderSearchSchema,
  legalReaderSearchSchema,
} from './legal-search'
export type {
  LegalChangesSearch,
  LegalFinderSearch,
  LegalReaderSearch,
} from './legal-search'

/**
 * Legal domain — UI-boundary shapes for the `/legislation` module.
 *
 * Field names mirror the server's `Legal*` / `Mo*` GraphQL types
 * (`hack-for-facts-eb-server/src/modules/legal/`) exactly, so going live is an
 * adapter swap in `src/features/legal/api/` rather than a UI rewrite. Anything
 * the server cannot answer today is deliberately absent here — see
 * `docs/design/legal/main-page.md` §6.
 */

/** `legal.acts.status` — the closed 7-value fold vocabulary (`LEGAL_ACT_STATUSES`). */
export const legalActStatusSchema = z.enum(LEGAL_ACT_STATUSES)
export type LegalActStatus = z.infer<typeof legalActStatusSchema>

/** `legal.document_summaries.domains` — the controlled 16-value vocabulary (`LEGAL_DOMAIN_SLUGS`). */
export const legalDomainSlugSchema = z.enum(LEGAL_DOMAIN_SLUGS)
export type LegalDomainSlug = z.infer<typeof legalDomainSlugSchema>

/**
 * A row of the acts directory — the subset of `LegalAct` that the list surfaces
 * read. `actId` is a string because the server types it `BigInt!`.
 */
export const legalActListItemSchema = z.object({
  actId: z.string(),
  displayCitation: z.string(),
  actType: z.string(),
  actNumber: z.string().nullable(),
  actYear: z.number().int().nullable(),
  issuerSlug: z.string().nullable(),
  /**
   * Null when the server does not know it: on the legal_v2 source status is
   * BRIDGED from the previous corpus, and an act that corpus does not hold has
   * none. Render no badge — never a guessed `necunoscut`.
   */
  status: legalActStatusSchema.nullable(),
  /**
   * Incoming citation count — the server's default sort key. Null when
   * unknown (bridged on legal_v2, like `status`): render nothing, never 0.
   */
  inDegree: z.number().int().nullable(),
})
export type LegalActListItem = z.infer<typeof legalActListItemSchema>

/**
 * The four headline act counts. Since 2026-08-26 they come from ONE
 * `legalActCounts(groupBy: STATUS)` round-trip (main-page.md §6.2) instead of
 * four aliased `legalActs(filter: {status}).totalCount` calls inside the
 * overview query. STATUS partitions the corpus exactly — the 7 buckets sum to
 * `legalActs.totalCount` (verified live 2026-08-26: 224 539) — so `total` is
 * the bucket sum and `abrogat` folds `abrogat` + `abrogat-partial`, exactly
 * the filters it replaced.
 */
export const legalActCountsSchema = z.object({
  total: z.number().int().nonnegative(),
  inVigoare: z.number().int().nonnegative(),
  modificat: z.number().int().nonnegative(),
  abrogat: z.number().int().nonnegative(),
})
export type LegalActCounts = z.infer<typeof legalActCountsSchema>

/**
 * The same four numbers, each independently possibly-unknown — what the KPI
 * strip and the header chips consume. A field is absent when the aggregate
 * could not prove it (truncated buckets, a folded `otherCount`, a malformed
 * bucket): 0 and "unknown" are different claims, and a surface renders
 * nothing — never 0 — for the latter. The live adapter fills true zeros only
 * when the response declares itself complete, mirroring
 * `legalDomainActCountsSchema`.
 */
export const legalStatusActCountsSchema = legalActCountsSchema.partial()
export type LegalStatusActCounts = z.infer<typeof legalStatusActCountsSchema>

/**
 * `legalActCounts(groupBy: DOMAIN)` folded to a slug → count map — the
 * one-round-trip aggregate behind the domain grid's numbers (main-page.md
 * §6.2, live since 2026-08-26). DOMAIN buckets OVERLAP: `domains` is an
 * array on `document_summaries` and an act carries more than two on average,
 * so these counts sum to well over the corpus total — never render them as
 * shares of a whole (STATUS and ACT_TYPE partition the corpus; DOMAIN does
 * not). A missing slug means the server did not assert a count for it —
 * render nothing, never 0; the live adapter fills true zeros only when the
 * response declares itself complete.
 */
export const legalDomainActCountsSchema = z.partialRecord(
  legalDomainSlugSchema,
  z.number().int().nonnegative(),
)
export type LegalDomainActCounts = z.infer<typeof legalDomainActCountsSchema>

/**
 * One Monitorul Oficial issue.
 *
 * There is deliberately **no** `hasFullText` and **no** per-issue act count:
 * the server's `MoIssue` carries neither (`MoActPublicationConnection` has no
 * `totalCount`). Text availability may only be inferred as far as "an official
 * PDF exists" — never as "the text is available".
 */
export const gazetteIssueSchema = z.object({
  moIssueId: z.string(),
  partCode: z.string(),
  issueLabel: z.string(),
  issueNumber: z.number().int().nullable(),
  issueYear: z.number().int(),
  issueDate: z.string().nullable(),
  pdfUrl: z.string().nullable(),
  hasEmonitorLink: z.boolean(),
})
export type GazetteIssue = z.infer<typeof gazetteIssueSchema>

/**
 * `legal.acts.status_evidence` — the JSON blob behind a status verdict.
 *
 * `contradictedAbrogations` is the one that matters to a reader: 354 acts carry
 * a non-zero value, meaning the sources disagree about whether parts of the act
 * are repealed. `modifiedByCount` drives the staleness warning (10.033 acts).
 */
export const legalStatusEvidenceSchema = z.object({
  modifiedByCount: z.number().int(),
  contradictedAbrogations: z.number().int(),
  abrogatedByCount: z.number().int(),
  futureEventCount: z.number().int(),
})
export type LegalStatusEvidence = z.infer<typeof legalStatusEvidenceSchema>

/**
 * One entry of `document_summaries.key_dates`.
 *
 * `date` is nullable and genuinely null in the data — the model routinely emits
 * an entry whose date lives only in the prose ("Data de 19 martie 2019 a
 * adoptării OUG nr. 17/2019"). Those render as undated notes rather than being
 * dropped or given a fabricated date.
 */
export const legalKeyDateSchema = z.object({
  date: z.string().nullable(),
  description: z.string(),
})
export type LegalKeyDate = z.infer<typeof legalKeyDateSchema>

/** `LegalActSummary` — the AI enrichment layer that is actually publishable. */
export const legalActSummarySchema = z.object({
  description: z.string().nullable(),
  plainLanguageSummary: z.string().nullable(),
  documentCategory: z.string().nullable(),
  domains: z.array(z.string()),
  affectedAudiences: z.array(z.string()),
  keywords: z.array(z.string()),
  keyDates: z.array(legalKeyDateSchema),
  penaltiesMentioned: z.boolean().nullable(),
  fiscalImpact: z.string().nullable(),
  confidence: z.number().nullable(),
})
export type LegalActSummaryData = z.infer<typeof legalActSummarySchema>

/**
 * The legal_v2 form fields a document expression carries (all null on the
 * legacy `legal` source):
 *
 *  - `readable` — the form's text is published and servable;
 *  - `caveat` — `unofficial_consolidation` on every consolidation (LEG-X3AV):
 *    wherever its text is shown, the reader shows the consolidation banner;
 *  - `portalLabelRaw` / `portalLabelDate` — the Portal's own consolidation
 *    note as written, and its date, where filled;
 *  - `held` — a Portal capture claiming this form is held, conflicting or
 *    unresolved;
 *  - `formKey` — the form's key within its act (`cons:2024-01-01`);
 *  - `sourceUrl` — the form's Portal page (its newest bound capture).
 */
function legalFormFieldsShape() {
  return {
    readable: z.boolean().nullable(),
    caveat: z.string().nullable(),
    portalLabelRaw: z.string().nullable(),
    portalLabelDate: z.string().nullable(),
    held: z.boolean().nullable(),
    formKey: z.string().nullable(),
    sourceUrl: z.string().nullable(),
  }
}

/** The caveat every legal_v2 consolidation carries (LEG-X3AV). */
export const LEGAL_UNOFFICIAL_CONSOLIDATION_CAVEAT = 'unofficial_consolidation'

/**
 * The canonical document expression.
 *
 * On the legacy source `versionKind` is all but always `original`. On
 * legal_v2 the canonical is the act's DEFAULT FORM (the latest readable
 * consolidation dated up to today, else the original) and `documentId` is
 * `f<form_id>` — an opaque string either way.
 */
export const legalDocumentSchema = z.object({
  documentId: z.string(),
  versionKind: z.string(),
  versionDate: z.string().nullable(),
  den: z.string().nullable(),
  title: z.string().nullable(),
  issuerRaw: z.string().nullable(),
  publicationRaw: z.string().nullable(),
  firstPublicationDate: z.string().nullable(),
  extractionStatus: z.string().nullable(),
  compatibilityTier: z.string().nullable(),
  /** legal_v2 only (null on the legacy source) — see `legalFormFieldsShape`. */
  ...legalFormFieldsShape(),
})
export type LegalDocument = z.infer<typeof legalDocumentSchema>

/** A merged timeline entry — status events and amendment edges in one stream. */
export const legalTimelineEntrySchema = z.object({
  kind: z.string(),
  effectiveDate: z.string().nullable(),
  label: z.string(),
  eventSource: z.string().nullable(),
  relatedActId: z.string().nullable(),
})
export type LegalTimelineEntry = z.infer<typeof legalTimelineEntrySchema>

/**
 * `act_references.resolution` — how confidently a citation was resolved.
 *
 * Only `unique` may render as a firm link. `cluster` and `unresolved` render as
 * "potrivire posibilă" with the raw cited text, per
 * `docs/design/legal/act-detail.md` §4.5.
 */
export const legalReferenceResolutionSchema = z.enum([
  'unique',
  'cluster',
  'unresolved',
  'external',
])
export type LegalReferenceResolution = z.infer<
  typeof legalReferenceResolutionSchema
>

/** One edge of the citation graph, in either direction. */
export const legalReferenceSchema = z.object({
  relation: z.string(),
  resolution: legalReferenceResolutionSchema,
  confidence: z.number().nullable(),
  /** The citation exactly as it appears in the source text. */
  targetRaw: z.string().nullable(),
  /**
   * The resolved act, when the server found one. The server also populates it
   * for `cluster` matches, so presence is **not** sufficient to render a link —
   * check `resolution === 'unique'` too, as `ActReferencesBand` does.
   */
  act: legalActListItemSchema.nullable(),
})
export type LegalReference = z.infer<typeof legalReferenceSchema>

/**
 * A page of citation edges plus an honest account of how many there are.
 *
 * `LegalReferenceConnection.totalCount` on the server is **the page size, not a
 * total** — verified 2026-08-01: for act 66150, `first: 3` → 3, `first: 12` →
 * 12, `first: 50` → 50, while the true incoming count is 2.621. It is only
 * meaningful when it comes back *below* the requested page size.
 *
 * So `totalCount` here is nullable and means what it says: a number when we know
 * it, `null` when we do not. `hasMore` carries the rest. Rendering the server's
 * value directly would have put "12 trimiteri" on an act with 2.621 of them.
 */
export const legalReferenceGroupSchema = z.object({
  totalCount: z.number().int().nullable(),
  hasMore: z.boolean(),
  items: z.array(legalReferenceSchema),
})
export type LegalReferenceGroup = z.infer<typeof legalReferenceGroupSchema>

/**
 * Where an act was published in the gazette — the proof it produces effects.
 *
 * `moIssueId` is nullable on the server (`MoActPublication.moIssueId: string |
 * null`): a publication row can exist without ever being tied to an issue.
 * Coercing that to `''` would both fabricate an id and collide as a React key
 * across every unmatched row, so it stays null and the surface says less.
 */
export const legalGazettePublicationSchema = z.object({
  moIssueId: z.string().nullable(),
  partCode: z.string().nullable(),
  issueNumber: z.number().int().nullable(),
  issueYear: z.number().int().nullable(),
  issueDate: z.string().nullable(),
  pdfUrl: z.string().nullable(),
  /** `unique` | `cluster` | … — how the act↔issue join was established. */
  resolution: z.string().nullable(),
  matchedVia: z.string().nullable(),
})
export type LegalGazettePublication = z.infer<
  typeof legalGazettePublicationSchema
>

/**
 * TLDF render availability for one document expression.
 *
 * `renderStatus` is `served` | `content_unavailable` | `superseded_pending`,
 * and on legal_v2 also `not_loaded` (no published text) | `label_missing` | `source_not_bound` |
 * `composition_not_served` (a header plus a body, not served yet); only
 * `served` documents answer on the REST render route. `chunkCount` is
 * null when a generation exists but render rows are missing (the route
 * answers 409 there).
 */
export const legalRenderAvailabilitySchema = z.object({
  renderStatus: z.string(),
  chunkCount: z.number().int().nullable(),
})
export type LegalRenderAvailability = z.infer<
  typeof legalRenderAvailabilitySchema
>

/**
 * One document expression in the act's version list (`LegalAct.documents`).
 *
 * `render` null means the expression was never compiled — for
 * `versionKind: 'consolidare'` timeline anchors that is the expected state
 * (dates without bodies) and the UI must say "text indisponibil încă", never
 * imply the text exists.
 */
export const legalActDocumentVersionSchema = z.object({
  documentId: z.string(),
  versionKind: z.string(),
  versionDate: z.string().nullable(),
  isCanonical: z.boolean(),
  title: z.string().nullable(),
  firstPublicationDate: z.string().nullable(),
  render: legalRenderAvailabilitySchema.nullable(),
  ...legalFormFieldsShape(),
})
export type LegalActDocumentVersion = z.infer<
  typeof legalActDocumentVersionSchema
>

/**
 * One incoming anchor — a link the portal itself asserts in a citing
 * document's text (`document_link_edges`). A DIFFERENT graph from
 * `inLinks`/`outLinks` (LLM-inferred normative relations): they disagree by
 * construction and both disagreements are informative, so the UI labels the
 * two provenances and never merges them.
 */
export const legalIncomingAnchorSchema = z.object({
  sourceDocumentId: z.string(),
  /** The anchor's own words on the citing page. */
  linkText: z.string().nullable(),
  /** e.g. `art. 5` when the anchor points at a provision, not the whole act. */
  targetFragment: z.string().nullable(),
  targetResolution: z.string().nullable(),
  sourceAct: legalActListItemSchema.nullable(),
})
export type LegalIncomingAnchor = z.infer<typeof legalIncomingAnchorSchema>

/**
 * A page of incoming anchors. Unlike `legalReferenceGroupSchema`, the server's
 * `LegalIncomingAnchorConnection.totalCount` is a REAL count (SDL: "never the
 * page size") when served. Null means unknown — never coerced to the page
 * length or to zero (a missing bridge on legal_v2 is not "no anchors").
 */
export const legalIncomingAnchorGroupSchema = z.object({
  totalCount: z.number().int().nullable(),
  items: z.array(legalIncomingAnchorSchema),
})
export type LegalIncomingAnchorGroup = z.infer<
  typeof legalIncomingAnchorGroupSchema
>

/**
 * One heading entry of a document's outline (`legalDocumentOutline`).
 *
 * The server is THE outline authority — role-null heading nodes in document
 * order, generation-pinned (SDL: "the reader derives no structure from render
 * blocks"). `path` doubles as the reader's DOM anchor (`#tldf-{path}`) and the
 * `?nod=` deep-link value. `charStart`/`charEnd` locate the heading in the
 * folded clean text, which is what picks the physical chunk on giant
 * documents.
 */
export const legalOutlineEntrySchema = z.object({
  documentId: z.string(),
  path: z.string(),
  nodeKind: z.string(),
  label: z.string().nullable(),
  numberKey: z.string().nullable(),
  /** `parsed` | `unparsed` | `ambiguous` — an unparsed number is reported, never faked. */
  numberStatus: z.string().nullable(),
  /** Fixed grammar-rank depth (carte=1 … articol=7; anexa restarts at 1). */
  depth: z.number().int(),
  orderIndex: z.number().int(),
  charStart: z.number().int().nullable(),
  charEnd: z.number().int().nullable(),
})
export type LegalOutlineEntry = z.infer<typeof legalOutlineEntrySchema>

/**
 * The full payload behind `/legislation/acts/$actId` — one `legalAct` query.
 *
 * There is deliberately **no `text` field and no article body anywhere**: the
 * server does not serve node text (`LegalNode` comment, §3.4), so the shape
 * makes it impossible for the UI to imply we hold the law. The route to the
 * official text is `officialTextUrl`.
 */
export const legalActDetailSchema = z.object({
  actId: z.string(),
  displayCitation: z.string(),
  actType: z.string(),
  actNumber: z.string().nullable(),
  actYear: z.number().int().nullable(),
  issuerSlug: z.string().nullable(),
  /** Null when unknown — bridged on legal_v2 (see `bridgedFields`). */
  status: legalActStatusSchema.nullable(),
  /** Null when unknown — bridged and nullable like `status`. */
  statusEvidence: legalStatusEvidenceSchema.nullable(),
  entryIntoForce: z.string().nullable(),
  /** Null when unknown — bridged and nullable like `status`. */
  inDegree: z.number().int().nullable(),
  aliases: z.array(z.string()),
  /**
   * Incoming `modifica`/`completeaza` references on the act, of any date: not
   * dated against the canonical text, so some may predate it (I-22). Non-zero
   * shows the staleness warning: the summary and the document we hold may
   * describe a superseded text. Null when unknown (bridged on legal_v2).
   */
  amendedAfterPublication: z.number().int().nullable(),
  /** Which source served the act: `legal` (previous corpus) or `legal_v2`. */
  dataSource: z.enum(['legal', 'legal_v2']),
  /**
   * legal_v2 only: the fields read from the previous corpus by act_id
   * (status, links, timeline, summary, …). Empty on the legacy source, and
   * on legal_v2 when the previous corpus does not hold the act.
   */
  bridgedFields: z.array(z.string()),
  /**
   * legal_v2 only: consolidations dated up to today that exist on the Portal
   * but cannot be shown (no text, not accepted, held). Null on legacy.
   */
  newerNotAvailable: z.number().int().nonnegative().nullable(),
  /**
   * legal_v2 only: the default form's posture under the owner's policy
   * `latest_any_kind` (latest form of any kind, republications included):
   *  - `current` — `canonical` is the latest form, and it has text;
   *  - `latest_not_available` — the latest form has no text, so NO form is
   *    current and `canonical` is null; `latestAvailableDocumentId` names the
   *    latest form that has text, shown as "not the current version";
   *  - `no_known_form`.
   * Null on the legacy source. An unknown value is kept as served.
   */
  defaultBasis: z.string().nullable(),
  /**
   * legal_v2 only: false when two or more forms share the latest date and a
   * reviewer has not ranked them all — the fixed tie rule chose. Null when
   * not applicable (legacy, no forms).
   */
  defaultOrderReviewed: z.boolean().nullable(),
  /** legal_v2 only: the latest form with text, when the latest form has none. */
  latestAvailableDocumentId: z.string().nullable(),
  /**
   * legal_v2 only: the form the `latest_any_kind` rule picks as latest,
   * whether or not it has text (`f<id>`). Names the latest form in the "not
   * current" notice and the selector; null on legacy or an older server.
   */
  latestDocumentId: z.string().nullable(),
  canonical: legalDocumentSchema.nullable(),
  summary: legalActSummarySchema.nullable(),
  /**
   * Null when not available for this act (legal_v2 bridges it from the
   * previous corpus) — never an empty, complete history.
   */
  timeline: z.array(legalTimelineEntrySchema).nullable(),
  /**
   * False when the server's timeline bound cut the list (I-20); null when the
   * server did not say — unknown, never read as a complete history.
   */
  timelineComplete: z.boolean().nullable(),
  gazettePublications: z.array(legalGazettePublicationSchema),
  /** Null when not available for this act (bridged on legal_v2) — never "no links". */
  outLinks: legalReferenceGroupSchema.nullable(),
  inLinks: legalReferenceGroupSchema.nullable(),
  /**
   * Portal-asserted incoming anchors — provenance-distinct from `inLinks`.
   * Null when not available for this act (bridged on legal_v2).
   */
  incomingAnchors: legalIncomingAnchorGroupSchema.nullable(),
  /** Every document expression of the act, canonical flag included. */
  documents: z.array(legalActDocumentVersionSchema),
  /**
   * The canonical text's Portal page. On legal_v2 it is the canonical form's
   * served `sourceUrl` (null when none is bound). On the legacy source it is
   * derived: `legal.acts.source_url` equals
   * `https://legislatie.just.ro/Public/DetaliiDocument/{canonicalDocumentId}`
   * for **all 224.540 acts** (verified 2026-08-01). Never derived from a
   * legal_v2 `f<form_id>` id, which is not a Portal page.
   */
  officialTextUrl: z.string().nullable(),
})
export type LegalActDetail = z.infer<typeof legalActDetailSchema>

/**
 * One page of the acts directory (`legalActs` connection).
 *
 * `totalCount` is nullable on the server connection; when present it is the
 * filtered total (unlike the per-act reference connection, whose totalCount
 * is a page size — different resolvers, different honesty).
 */
export const legalActsPageSchema = z.object({
  // `name`: the Portal's name of the act's canonical document, read where the citation names nothing („Doc nr."), as
  // the search's hits carry it (Codex review, 27 November 2026).
  items: z.array(legalActListItemSchema.extend({ name: z.string().nullable() })),
  endCursor: z.string().nullable(),
  totalCount: z.number().int().nullable(),
})
export type LegalActsPage = z.infer<typeof legalActsPageSchema>

/** `MoPartCode` — the eight gazette parts the server serves (`GAZETTE_PART_CODES`). */
export const gazettePartCodeSchema = z.enum(GAZETTE_PART_CODES)
export type GazettePartCode = z.infer<typeof gazettePartCodeSchema>

/**
 * One row of the gazette directory — `gazetteIssueSchema` plus
 * `hasArchiveIndex`, which gates the contents expansion: `false` means the
 * corpus holds no per-issue table of contents (all of Parts III–VII), so the
 * row must not offer one.
 */
export const gazetteDirectoryIssueSchema = gazetteIssueSchema.extend({
  hasArchiveIndex: z.boolean(),
})
export type GazetteDirectoryIssue = z.infer<typeof gazetteDirectoryIssueSchema>

/**
 * One page of the gazette directory. `moIssues` paging is the server's own
 * page/pageSize — numbered pages are honest here (a year holds at most ~1.9k
 * issues), unlike the cursor-only acts directory.
 *
 * `total` is the filtered total when the server asserts one, null when it does
 * not. A past-the-end page returns `total: 0` WITH empty edges (verified live
 * 2026-08-26: page 55 of 54 → `total: 0`, no error), so an empty page beyond
 * page 1 must not be read as "the year is empty".
 */
export const gazetteIssuesPageSchema = z.object({
  items: z.array(gazetteDirectoryIssueSchema),
  total: z.number().int().nullable(),
  hasNextPage: z.boolean(),
})
export type GazetteIssuesPage = z.infer<typeof gazetteIssuesPageSchema>

/**
 * One entry of an issue's archive index (`MoIssue.contents`). Only
 * `resolution === 'unique'` may render a firm link to `act` — `ambiguous`
 * stays a title, exactly like `cluster` references on the act page.
 */
export const gazettePublicationEntrySchema = z.object({
  moActKey: z.string(),
  title: z.string().nullable(),
  actType: z.string().nullable(),
  actNumberNorm: z.string().nullable(),
  actYear: z.number().int().nullable(),
  issuerSlug: z.string().nullable(),
  actDate: z.string().nullable(),
  /** `unique` | `ambiguous` | `unmatched` — the act↔publication join confidence. */
  resolution: z.string(),
  act: z
    .object({
      actId: z.string(),
      displayCitation: z.string(),
      status: legalActStatusSchema,
    })
    .nullable(),
})
export type GazettePublicationEntry = z.infer<
  typeof gazettePublicationEntrySchema
>

/**
 * An issue's contents page. The server's `MoActPublicationConnection` has no
 * totalCount, so `hasMore` is all that can honestly be said past the first
 * page — the UI says "primele N", never a total it does not have.
 */
export const gazetteIssueContentsSchema = z.object({
  items: z.array(gazettePublicationEntrySchema),
  hasMore: z.boolean(),
})
export type GazetteIssueContents = z.infer<typeof gazetteIssueContentsSchema>

/** Filters the gazette directory sends to the server (`MoIssuesFilter`). */
export const gazetteBrowseFilterSchema = z.object({
  /** Mandatory server-side: `moIssues` refuses to browse without a year bound. */
  year: z.number().int(),
  part: gazettePartCodeSchema.optional(),
})
export type GazetteBrowseFilter = z.infer<typeof gazetteBrowseFilterSchema>

/** `legal.act_status_events.event_kind` — the DB CHECK vocabulary (`LEGAL_EVENT_KINDS`). */
export const legalEventKindSchema = z.enum(LEGAL_EVENT_KINDS)
export type LegalEventKind = z.infer<typeof legalEventKindSchema>

/** `act_status_events.event_source` — which pipeline recorded the event (`LEGAL_EVENT_SOURCES`). */
export const legalEventSourceSchema = z.enum(LEGAL_EVENT_SOURCES)
export type LegalEventSource = z.infer<typeof legalEventSourceSchema>

/**
 * One row of the global change feed (`LegalRecentChange`). BigInt scalars
 * (`eventId`, `actId`) travel as strings. `sourceAct` is the ACTING act (the
 * amending law) — null when the event records none or the id dangles, which
 * is the norm on the undated cohort. `eventKind`/`eventSource` are open
 * strings here (see the filter enums above for why).
 */
export const legalRecentChangeSchema = z.object({
  eventId: z.string(),
  eventKind: z.string(),
  effectiveDate: z.string().nullable(),
  eventSource: z.string(),
  // The acting act, with its automatic summary's description (null when it has none) — the Modificări page says
  // what each changing act is about (owner, 28 November 2026).
  sourceAct: z
    .object({ actId: z.string(), displayCitation: z.string(), description: z.string().nullable() })
    .nullable(),
  actId: z.string(),
  displayCitation: z.string(),
  status: legalActStatusSchema,
})
export type LegalRecentChange = z.infer<typeof legalRecentChangeSchema>

/**
 * One cursor page of the change feed. Deliberately NO `totalCount`: the
 * server resolves it lazily and a count failure arrives as `totalCount: null`
 * PLUS a field-level `errors[]` entry — and the shared `graphqlQuery` throws
 * on any non-empty `errors[]`, so selecting the count in the feed query would
 * let a count timeout kill the feed. The count is its own query
 * (`fetchRecentChangesCount`), keyed on the filter, not the cursor.
 */
export const legalChangesPageSchema = z.object({
  items: z.array(legalRecentChangeSchema),
  /** Null when the cursor is exhausted, even if the server minted one. */
  endCursor: z.string().nullable(),
})
export type LegalChangesPage = z.infer<typeof legalChangesPageSchema>

/**
 * The filter the changes feed sends to the server (`legalRecentChanges`).
 * `since`/`until` are INCLUSIVE `YYYY-MM-DD` bounds on `effective_date`.
 * `undated: true` serves the no-effective-date cohort — the server REJECTS
 * combining it with a window (the intersection is empty by construction), so
 * the live adapter strips `since`/`until` whenever `undated` is set.
 */
export const legalChangesFilterSchema = z.object({
  since: z.string().optional(),
  until: z.string().optional(),
  /** Absent or empty = every kind. */
  kinds: z.array(legalEventKindSchema).readonly().optional(),
  source: legalEventSourceSchema.optional(),
  undated: z.boolean().optional(),
})
export type LegalChangesFilter = z.infer<typeof legalChangesFilterSchema>

/**
 * One `legalResolve` hit. `value` is the filter value the hit resolves to —
 * for `dim: "act"` it is the actId to navigate to. Ambiguity is the feature:
 * 'codul fiscal' returns MULTIPLE hits and the user picks; the UI never
 * silently takes the first.
 */
export const legalResolveHitSchema = z.object({
  kind: z.string(),
  value: z.string(),
  label: z.string(),
  score: z.number().nullable(),
  hint: z.string().nullable(),
})
export type LegalResolveHit = z.infer<typeof legalResolveHitSchema>

/**
 * legal_v2 only: the form a text was served from or verified against — the
 * render's REST `meta.servedForm` and a search hit's `servedForm`
 * (`LegalVersionProvenance` on GraphQL): document id, kind, date, caveat, the
 * Portal's label and date, source URL. Wherever its text is shown, a
 * consolidation carries its label (LEG-X3AV). Every field is optional: a
 * partial value only fills what it carries.
 */
export const legalServedFormSchema = z.object({
  documentId: z.string().nullable().optional(),
  versionKind: z.string().nullable().optional(),
  versionDate: z.string().nullable().optional(),
  caveat: z.string().nullable().optional(),
  portalLabelRaw: z.string().nullable().optional(),
  portalLabelDate: z.string().nullable().optional(),
  sourceUrl: z.string().nullable().optional(),
})
export type LegalServedForm = z.infer<typeof legalServedFormSchema>

/**
 * One provision hit of `legalSearch` (`LegalSectionHit`), served only from
 * the OpenSearch engine, where sections are content matches (the Postgres
 * path's sections echo the act's name, so the adapter drops them). On
 * legal_v2 every hit was verified against `servedForm` before its text was
 * served. `snippet` is the engine's highlight fragment (`<em>` marks the
 * matched words) — rendered as text, never as HTML.
 */
export const legalSearchSectionHitSchema = z.object({
  actId: z.string(),
  documentId: z.string(),
  /**
   * The provision's path in `documentId` (`document_nodes` path, the act page's `?nod=`), so a hit links to its
   * provision. Null when the engine names none: the hit is then shown without a link.
   */
  nodePath: z.string().nullable(),
  nodeLabel: z.string().nullable(),
  snippet: z.string().nullable(),
  servedForm: legalServedFormSchema.nullable(),
  /**
   * The act's citation (`act.displayCitation`): a provision whose act is in none of the answer's act rows is drawn
   * under that name. Optional, so the fixtures and the mock lane, which carry none, still parse.
   */
  actCitation: z.string().nullable().optional(),
})
export type LegalSearchSectionHit = z.infer<typeof legalSearchSectionHitSchema>

/**
 * One act hit of `legalSearch` — the server's `LegalDocHit`, whose act is
 * NESTED (`{ score, act, summary }`), never a flat act row. `description` is
 * `summary.description` flattened by the adapter: the result card quotes one
 * enrichment sentence, and carrying the whole 10-field summary object through
 * the UI boundary for that one line would be weight without a reader.
 */
export const legalSearchActHitSchema = z.object({
  score: z.number(),
  act: legalActListItemSchema,
  description: z.string().nullable(),
  /**
   * The Portal's name of the act's canonical document (`canonical.den`, else `canonical.title`), as written —
   * often in capitals. The page uses it only where the citation names nothing („Doc nr. 41627", LEG-PDYY).
   */
  name: z.string().nullable(),
})
export type LegalSearchActHit = z.infer<typeof legalSearchActHitSchema>

/**
 * The English machine sentinel the server pushes into `legalSearch.caveats`
 * when the semantic leg cannot run — byte-exact copy of `SEMANTIC_CAVEAT` in
 * `hack-for-facts-eb-server/src/modules/legal/core/usecases.ts`. The finder
 * translates THIS ONE caveat into the phrase-honesty messaging and renders
 * every other caveat verbatim; keying the messaging on `degraded` instead
 * would double-message on the engine path, whose own semantic caveat is
 * already Romanian prose.
 */
export const LEGAL_SEMANTIC_UNAVAILABLE_CAVEAT = 'semantic search unavailable'

/**
 * Byte-exact copy of the server's `LEGAL_ORIGINAL_TEXT_CAVEAT`
 * (`hack-for-facts-eb-server/src/modules/legal/core/provenance.ts`) — the
 * caveat the LEGACY source attaches to served texts: what it holds is the
 * PUBLISHED version of an act. Not true on legal_v2, which serves Portal
 * consolidations too and attaches its own consolidation caveat instead — so
 * no surface renders this constant on its own any more (the guide stopped,
 * 2026-11-20); it remains for the search mock lane, which mirrors the legacy
 * server. Deliberately NOT run through Lingui: it mirrors server bytes.
 */
export const LEGAL_ORIGINAL_TEXT_CAVEAT =
  'Textele și rezumatele servite sunt versiunile publicate ale actelor și nu garantează forma consolidată curentă — verificați forma în vigoare pe legislatie.just.ro.'

/**
 * The `legalSearch` answer the Caută tab consumes — acts channel only. The
 * tab asks `channel: docs` deliberately: measured on production 2026-08-26,
 * the sections channel matches the act's NAME and echoes that act's sections
 * back ("codul muncii" → 5 sections of the code itself), while genuine text
 * phrases ("concediu de odihna", "salariul minim") return nothing — so
 * serving sections would dress a name lookup as the text search that does
 * not exist yet. Re-open the channel when the OpenSearch engine ships and
 * sections become content matches.
 *
 * The honesty fields travel untouched:
 *  - `actsTotal` null means the answering path CANNOT count (the Postgres
 *    path serves a bounded slice) — render "unknown", never 0;
 *  - `totalsExhaustive` false makes any served total a lower bound;
 *  - `degraded` true means a leg the request wanted could not run, and
 *    `caveats` says which (including the sentinel above);
 *  - `unhydratedHits` > 0 means the page is SHORTER than the engine ranking;
 *  - `engine` names the answering path ('opensearch' | 'postgres');
 *  - `asOf` is the index build stamp, null on the Postgres path.
 */
export const legalSearchResultSchema = z.object({
  acts: z.array(legalSearchActHitSchema),
  /** Provision hits — opensearch only (see `legalSearchSectionHitSchema`). */
  sections: z.array(legalSearchSectionHitSchema),
  caveats: z.array(z.string()),
  engine: z.string(),
  actsTotal: z.number().int().nullable(),
  totalsExhaustive: z.boolean(),
  degraded: z.boolean(),
  asOf: z.string().nullable(),
  unhydratedHits: z.number().int(),
})
export type LegalSearchResultData = z.infer<typeof legalSearchResultSchema>

/**
 * The corpus' live frontiers and the one count the module's caveats cite,
 * read in ONE request (`legal-freshness-api.ts`) in place of the measured
 * constants they replaced. Each field is null when the server could not
 * prove it: a surface then drops the figure or date, never prints a stale
 * one.
 *
 *  - `latestIssueDate` — the newest Monitorul Oficial issue in the corpus;
 *  - `latestEffectiveChangeDate` — the newest change already in force
 *    (`legalRecentChanges(until: today)`);
 *  - `ccrDecisionCount` — Constitutional Court decisions held as acts
 *    (`decizie` × `curtea-constitutionala`, a complete STATUS partition).
 */
export const legislationFreshnessSchema = z.object({
  latestIssueDate: z.string().nullable(),
  latestEffectiveChangeDate: z.string().nullable(),
  ccrDecisionCount: z.number().int().nonnegative().nullable(),
})
export type LegislationFreshness = z.infer<typeof legislationFreshnessSchema>

/**
 * The composed payload behind the `/legislation` overview tab. The headline
 * `counts` are NOT here (since 2026-08-26): they ride their own
 * `legalActCounts(groupBy: STATUS)` request (`legal-status-counts-api.ts`) so
 * a failed aggregate degrades the chips and the KPI strip instead of failing
 * the route, exactly like the domain grid's counts.
 */
export const legislationOverviewSchema = z.object({
  /** `legalActs(sort: IN_DEGREE, dir: DESC)` — the most-cited acts. */
  mostCitedActs: z.array(legalActListItemSchema),
  /** `moIssues(filter: {year}, sort: ISSUE_DATE_DESC)` — latest gazette issues. */
  latestGazetteIssues: z.array(gazetteIssueSchema),
  coverage: coverageMetaSchema,
})
export type LegislationOverview = z.infer<typeof legislationOverviewSchema>

/**
 * The `/legislation` front door's payload: the overview without the
 * citation ranking, which only the analytics tab renders and which costs the
 * slowest part of the overview's request.
 */
export const legislationFrontDoorSchema = legislationOverviewSchema.omit({ mostCitedActs: true })
export type LegislationFrontDoor = z.infer<typeof legislationFrontDoorSchema>
