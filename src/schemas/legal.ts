import { z } from 'zod'
import { coverageMetaSchema } from './elections'

/**
 * Legal domain — UI-boundary shapes for the `/legislation` module.
 *
 * Field names mirror the server's `Legal*` / `Mo*` GraphQL types
 * (`hack-for-facts-eb-server/src/modules/legal/`) exactly, so going live is an
 * adapter swap in `src/features/legal/api/` rather than a UI rewrite. Anything
 * the server cannot answer today is deliberately absent here — see
 * `docs/design/legal/main-page.md` §6.
 */

/** `legal.acts.status` — the closed 7-value fold vocabulary. */
export const legalActStatusSchema = z.enum([
  'in-vigoare',
  'modificat',
  'abrogat',
  'abrogat-partial',
  'suspendat',
  'iesit-din-vigoare',
  'necunoscut',
])
export type LegalActStatus = z.infer<typeof legalActStatusSchema>

/** `legal.document_summaries.domains` — the controlled 16-value vocabulary. */
export const legalDomainSlugSchema = z.enum([
  'administratie',
  'fiscal-si-bugetar',
  'justitie',
  'economie-si-comert',
  'munca-si-protectie-sociala',
  'proprietate-si-urbanism',
  'sanatate',
  'aparare-si-securitate',
  'transport',
  'educatie',
  'mediu',
  'agricultura',
  'energie',
  'cultura',
  'telecomunicatii-si-digital',
  'altele',
])
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
  status: legalActStatusSchema,
  /** Incoming citation count — the server's default sort key. */
  inDegree: z.number().int(),
})
export type LegalActListItem = z.infer<typeof legalActListItemSchema>

/**
 * Per-status act counts. Each entry is one
 * `legalActs(filter: {status}, first: 1).totalCount` call; `total` is the
 * unfiltered count. A `legalActCounts` aggregate would collapse these into one
 * request — see `docs/design/legal/main-page.md` §6.2.
 */
export const legalActCountsSchema = z.object({
  total: z.number().int(),
  inVigoare: z.number().int(),
  modificat: z.number().int(),
  abrogat: z.number().int(),
})
export type LegalActCounts = z.infer<typeof legalActCountsSchema>

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
 * The canonical document expression.
 *
 * `versionKind` is all but always `original` (221.873 of 226.332 rows); only
 * **3 acts** corpus-wide have two `corp` bodies, which is why there is no
 * version selector — see `docs/design/legal/act-detail.md` §8.
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
 * `renderStatus` is `served` | `content_unavailable` | `superseded_pending`;
 * only `served` documents answer on the REST render route. `chunkCount` is
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
 * page size"), so it is non-nullable here.
 */
export const legalIncomingAnchorGroupSchema = z.object({
  totalCount: z.number().int(),
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
  status: legalActStatusSchema,
  statusEvidence: legalStatusEvidenceSchema,
  entryIntoForce: z.string().nullable(),
  inDegree: z.number().int(),
  aliases: z.array(z.string()),
  /**
   * Incoming `modifica`/`completeaza` edges. Non-zero means the summary and the
   * document we hold describe a superseded text — the staleness warning.
   */
  amendedAfterPublication: z.number().int(),
  canonical: legalDocumentSchema.nullable(),
  summary: legalActSummarySchema.nullable(),
  timeline: z.array(legalTimelineEntrySchema),
  gazettePublications: z.array(legalGazettePublicationSchema),
  outLinks: legalReferenceGroupSchema,
  inLinks: legalReferenceGroupSchema,
  /** Portal-asserted incoming anchors — provenance-distinct from `inLinks`. */
  incomingAnchors: legalIncomingAnchorGroupSchema,
  /** Every document expression of the act, canonical flag included. */
  documents: z.array(legalActDocumentVersionSchema),
  /**
   * Derived, not served: `legal.acts.source_url` equals
   * `https://legislatie.just.ro/Public/DetaliiDocument/{canonicalDocumentId}`
   * for **all 224.540 acts** (verified 2026-08-01), and the GraphQL surface does
   * not expose the column. Recheck that identity before trusting this if the
   * Portal ever changes its URL scheme.
   */
  officialTextUrl: z.string().nullable(),
})
export type LegalActDetail = z.infer<typeof legalActDetailSchema>

/**
 * Act page search params (`/legislation/acts/$actId` — the text lives ON the
 * act page; the old `/text` sibling 301-redirects here).
 *  - `doc` — read a specific (non-canonical) expression instead of the act's
 *    canonical document.
 *  - `nod` — a `document_nodes` PATH deep link (never a node id: ids are
 *    recompile-scoped). A search param, not a hash, so the SSR loader can
 *    target the chunk containing it on giant documents.
 */
export const legalReaderSearchSchema = z.object({
  doc: z.string().min(1).optional(),
  nod: z.string().min(1).optional(),
})
export type LegalReaderSearch = z.infer<typeof legalReaderSearchSchema>

/**
 * One page of the acts directory (`legalActs` connection).
 *
 * `totalCount` is nullable on the server connection; when present it is the
 * filtered total (unlike the per-act reference connection, whose totalCount
 * is a page size — different resolvers, different honesty).
 */
export const legalActsPageSchema = z.object({
  items: z.array(legalActListItemSchema),
  endCursor: z.string().nullable(),
  totalCount: z.number().int().nullable(),
})
export type LegalActsPage = z.infer<typeof legalActsPageSchema>

/** Filters the directory sends to the server — verified filter families. */
export const legalActsBrowseFilterSchema = z.object({
  actType: z.string().optional(),
  year: z.number().int().optional(),
  status: legalActStatusSchema.optional(),
  domain: legalDomainSlugSchema.optional(),
})
export type LegalActsBrowseFilter = z.infer<typeof legalActsBrowseFilterSchema>

/**
 * The directory's URL state. `status` additionally admits the sentinel
 * `'toate'`: an absent status DEFAULTS to `in-vigoare` (law in force is what
 * people mean by "the acts"), so "no status filter" must be a stated choice
 * in the URL, never the silent fallback.
 */
export const legalActsBrowseSearchSchema = legalActsBrowseFilterSchema.extend({
  status: legalActStatusSchema.or(z.literal('toate')).optional(),
})
export type LegalActsBrowseSearch = z.infer<typeof legalActsBrowseSearchSchema>

/**
 * `MoPartCode` — the eight gazette parts the server serves. `PIM` is Partea I
 * in Hungarian, a real part code with issues from 2008 on (verified live
 * 2026-08-26: 113 issues in 2010, 22 in 2026).
 */
export const gazettePartCodeSchema = z.enum([
  'PI',
  'PIM',
  'PII',
  'PIII',
  'PIV',
  'PV',
  'PVI',
  'PVII',
])
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

/**
 * URL state for `/legislation/gazette` — filters plus the server's own page
 * number, so a filtered page is a shareable link. `.catch(undefined)` drops a
 * malformed param to its default instead of erroring the route; the year's
 * corpus bounds are enforced by the component (the valid range is a measured
 * constant in `legal-coverage.ts`, which schemas do not import).
 */
export const gazetteBrowseSearchSchema = z.object({
  year: z.number().int().optional().catch(undefined),
  part: gazettePartCodeSchema.optional().catch(undefined),
  page: z.number().int().min(1).optional().catch(undefined),
})
export type GazetteBrowseSearch = z.infer<typeof gazetteBrowseSearchSchema>

/**
 * `legal.act_status_events.event_kind` — the DB CHECK vocabulary (12 values,
 * `act_status_events_kind_check`). Closed at the database, so the FILTER param
 * may be an enum; the ROW field stays an open string (`legalRecentChangeSchema`)
 * so a 13th kind added upstream degrades to a prettified label instead of
 * breaking the page. Census 2026-08-26 (sums to the feed's 84.484):
 * modificare 29.985 · abrogare-totala 27.930 · completare 10.191 ·
 * promulgare 9.310 · abrogare-partiala 2.052 · aprobare-oug 1.799 ·
 * republicare 1.325 · aprobare-og 867 · rectificare 419 · suspendare 344 ·
 * iesire-din-vigoare 262 · incetare-suspendare 0 (in the CHECK, no rows yet).
 */
export const legalEventKindSchema = z.enum([
  'abrogare-totala',
  'abrogare-partiala',
  'modificare',
  'completare',
  'suspendare',
  'incetare-suspendare',
  'republicare',
  'rectificare',
  'iesire-din-vigoare',
  'promulgare',
  'aprobare-oug',
  'aprobare-og',
])
export type LegalEventKind = z.infer<typeof legalEventKindSchema>

/**
 * `act_status_events.event_source` — which pipeline recorded the event. The
 * server surfaces it deliberately and never merges the two (12.790 of 84.484
 * events are `monitorul-oficial`, measured 2026-08-26); the UI shows it on
 * every row. Enum for the FILTER param only — rows carry an open string.
 */
export const legalEventSourceSchema = z.enum(['portal', 'monitorul-oficial'])
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
  sourceAct: z
    .object({ actId: z.string(), displayCitation: z.string() })
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
  kind: legalEventKindSchema.optional(),
  source: legalEventSourceSchema.optional(),
  undated: z.boolean().optional(),
})
export type LegalChangesFilter = z.infer<typeof legalChangesFilterSchema>

/**
 * A calendar-valid `YYYY-MM-DD`. The round-trip guards V8's lenient parse:
 * '2026-02-31' does NOT parse to NaN — it rolls over to March 3rd — and the
 * server rejects such a date as invalid input, so the URL schema must drop it
 * rather than forward it into an erroring request.
 */
const changesFeedDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = Date.parse(value)
    return (
      !Number.isNaN(parsed) &&
      new Date(parsed).toISOString().slice(0, 10) === value
    )
  })

/**
 * URL state for `/legislation/changes`. `.catch(undefined)` drops a malformed
 * param to its default instead of erroring the route (gazette pattern).
 *
 * `view` names the feed's cohorts — the effective-date dimension has real
 * populations a bare window cannot reach (measured 2026-08-26):
 *  - absent (default): already-in-force events, `until = today` (63.210);
 *  - `viitoare`: future-dated events, `since = tomorrow` (8);
 *  - `toate`: the feed exactly as served — future first, undated trailing;
 *  - `nedatate`: the 21.266 events with NO effective date (`undatedOnly`),
 *    which every since/until window excludes.
 * An explicit `since`/`until` is the custom-window mode; when a hand-edited
 * URL carries BOTH a `view` and a window, the component lets `view` win and
 * never sends the rejected `undatedOnly`+window combination to the server.
 */
export const legalChangesSearchSchema = z.object({
  view: z.enum(['viitoare', 'toate', 'nedatate']).optional().catch(undefined),
  since: changesFeedDateSchema.optional().catch(undefined),
  until: changesFeedDateSchema.optional().catch(undefined),
  kind: legalEventKindSchema.optional().catch(undefined),
  source: legalEventSourceSchema.optional().catch(undefined),
})
export type LegalChangesSearch = z.infer<typeof legalChangesSearchSchema>

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
 * URL state for `/legislation/search` — the Caută tab, so a search is a
 * shareable link. TanStack Router JSON-parses search params, so a
 * numeric-looking `q` (`?q=227`) arrives as a NUMBER — coerce it back to text
 * rather than dropping a legitimate query, but treat `null`/booleans as junk
 * (`z.coerce.string()` alone would turn `?q=null` into the literal text
 * "null" and search for it); the same trap and cure as `entity-search.ts`'s
 * `optionalSearchString`.
 *
 * `historical: true` widens the search to abrogated / out-of-force acts (the
 * server's `includeHistorical`, default false — which silently zeroes even an
 * exact-citation lookup of a repealed law). Only `true` is a stored value:
 * the default is URL-absence, so `?historical=false` and junk both drop.
 */
export const legalFinderSearchSchema = z.object({
  q: z
    .preprocess(
      (value) =>
        value === null || typeof value === 'boolean' ? undefined : value,
      z.coerce.string().min(1).max(400).optional(),
    )
    .catch(undefined),
  historical: z.literal(true).optional().catch(undefined),
})
export type LegalFinderSearch = z.infer<typeof legalFinderSearchSchema>

/** The composed payload behind the `/legislation` overview tab. */
export const legislationOverviewSchema = z.object({
  counts: legalActCountsSchema,
  /** `legalActs(sort: IN_DEGREE, dir: DESC)` — the most-cited acts. */
  mostCitedActs: z.array(legalActListItemSchema),
  /** `moIssues(filter: {year}, sort: ISSUE_DATE_DESC)` — latest gazette issues. */
  latestGazetteIssues: z.array(gazetteIssueSchema),
  coverage: coverageMetaSchema,
})
export type LegislationOverview = z.infer<typeof legislationOverviewSchema>
