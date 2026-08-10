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
