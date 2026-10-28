import { z } from "zod";

/**
 * The /parlament routes' search params, and the enums they share with the
 * data schemas in `parliament.ts` (which re-exports this module). Apart from
 * those, so that the route files, which every page loads, carry only these:
 * the data schemas cost ~50 ms of evaluation on the mobile profile
 * (2026-10-27 audit, PERF-003).
 */

export const MemberVoteChoiceSchema = z.enum([
  "pentru",
  "impotriva",
  "abtinere",
  "nu_a_votat",
]);
export type MemberVoteChoice = z.infer<typeof MemberVoteChoiceSchema>;

/**
 * `adoptat` and `respins` are the SERVER's two values (prod 2026-07-29: 16,916
 * and 3,627, plus 202 rows with no published result). `egalitate` and
 * `necunoscut` are DERIVED here from the tally — a tie the server's
 * pentru>impotriva rule would badge backwards, and the 202 divisions where the
 * source published no result.
 *
 * `amânat` is dropped: it is neither a server value nor a derived one, so
 * filtering by it returned nothing while looking like a supported choice. The
 * source never asserts a postponement, and naming one invents a procedural
 * decision — `necunoscut` is what actually happened.
 */
export const VoteOutcomeSchema = z.enum([
  "adoptat",
  "respins",
  "egalitate",
  "necunoscut",
]);
export type VoteOutcome = z.infer<typeof VoteOutcomeSchema>;

/**
 * Ordering for the votes list. `voteDate` is the reader-meaningful axis;
 * `voteKey` exists because the server offers it as a stable tiebreak, and both
 * directions page correctly.
 */
export const VoteSortSchema = z.enum([
  "voteDate_desc",
  "voteDate_asc",
  "voteKey_desc",
  "voteKey_asc",
]);
export type VoteSort = z.infer<typeof VoteSortSchema>;

export const VoteKindSchema = z.enum([
  "legislative",
  "amendment",
  "procedural",
  "chamber_decision",
  "attendance",
  "unclassified",
]);
export type VoteKind = z.infer<typeof VoteKindSchema>;

export const BillTypeSchema = z.enum([
  "guvern",
  "parlamentar",
  "cetateni",
  "ordonanta",
]);
export type BillType = z.infer<typeof BillTypeSchema>;

export const BillCurrentLocationSchema = z.enum([
  "camera",
  "senat",
  "mediere",
  "presedinte",
  "promulgat",
  "respins",
  "retras",
  // Lapsed/terminated procedure ("clasat" / "procedură legislativă încetată") —
  // a terminal outcome distinct from rejection (parliament.bill-lifecycle.v2).
  "clasat",
]);
export type BillCurrentLocation = z.infer<typeof BillCurrentLocationSchema>;

export const BillSortBySchema = z.enum([
  "title_asc",
  "title_desc",
  "updated_desc",
  "updated_asc",
]);
export type BillSortBy = z.infer<typeof BillSortBySchema>;

export const ParliamentTabSchema = z.enum([
  "prezentare",
  "membri",
  "voturi",
  "grupuri",
  "proiecte",
]);
export type ParliamentTabId = z.infer<typeof ParliamentTabSchema>;

/**
 * A calendar-REAL `YYYY-MM-DD` day, or `undefined`. The regex alone admits
 * impossible values (`2026-99-99`, `2026-02-30`) that then throw RangeError in
 * the Intl date/chip formatters — so we also round-trip through UTC and require
 * the parsed date to re-serialise to the same string. `.catch(undefined)` keeps
 * the lenient contract: any junk (bad shape OR impossible date) falls to
 * undefined, it never throws.
 */
const strictIsoDateParam = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((day) => {
    const parsed = new Date(`${day}T00:00:00Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === day
    );
  })
  .optional()
  .catch(undefined);

/** Unified search params for /parlament — tab drives the active section */
export const ParliamentSearchSchema = z.object({
  tab: ParliamentTabSchema.optional().catch(undefined),
  /**
   * `comun` is a VOTES-only value (joint sittings); member surfaces treat it
   * like `all`, because no member roster belongs to a joint sitting.
   */
  chamber: z
    .enum(["camera", "senat", "comun", "all"])
    .optional()
    .catch(undefined),
  judet: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .catch(undefined),
  grup: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .catch(undefined),
  q: z.string().optional().catch(undefined),
  find: z
    .union([z.literal("1"), z.literal(1)])
    .optional()
    .catch(undefined),
  from: strictIsoDateParam,
  to: strictIsoDateParam,
  outcome: VoteOutcomeSchema.optional().catch(undefined),
  /**
   * Votes narrowed to one GROUP's stance — `grupVot` names the group, `alegere`
   * the stance. Both must be present to constrain anything; either one alone is
   * dropped by `buildVotesFilter`.
   *
   * Deliberately NOT the existing `grup` param, which is a MEMBERS facet on the
   * same unified search object: reusing it would make a group selected on the
   * members tab silently filter the votes tab when a reader switches tabs.
   *
   * `grupVot` is the group name AS THE VOTE DATA SPELLS IT, which is not always
   * how the nomenclator spells it (the vote records say `neafiliat` where the
   * group directory says `Neafiliaţi`). It is not a slug.
   */
  grupVot: z.string().optional().catch(undefined),
  alegere: MemberVoteChoiceSchema.optional().catch(undefined),
  /**
   * Vote KIND — what the chamber was actually voting on.
   *
   * Only `legislative` rests on a column (`bill_key IS NOT NULL`). The other
   * five are classified from the free-text title, so the UI must not present
   * them as equally certain. See `VOTE_KIND_LABELS`.
   */
  tipVot: z
    .union([VoteKindSchema, z.array(VoteKindSchema)])
    .optional()
    .catch(undefined),
  /** Ordering. Absent = the server default, newest vote first. */
  ordine: VoteSortSchema.optional().catch(undefined),
  billType: BillTypeSchema.optional().catch(undefined),
  billLocation: BillCurrentLocationSchema.optional().catch(undefined),
  sortBy: BillSortBySchema.optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
  pageSize: z.coerce.number().int().min(1).max(100).optional().catch(undefined),
});
export type ParliamentSearch = z.infer<typeof ParliamentSearchSchema>;

export const ParliamentHubSearchSchema = ParliamentSearchSchema;
export type ParliamentHubSearch = ParliamentSearch;

export const ParliamentGroupsSearchSchema = ParliamentSearchSchema;
export type ParliamentGroupsSearch = ParliamentSearch;

export const ParliamentMembersSearchSchema = ParliamentSearchSchema;
export type ParliamentMembersSearch = ParliamentSearch;

export const ParliamentVotesSearchSchema = ParliamentSearchSchema;
export type ParliamentVotesSearch = ParliamentSearch;

export const ParliamentBillsSearchSchema = ParliamentSearchSchema;
export type ParliamentBillsSearch = ParliamentSearch;

/**
 * Search params for the member voting-history tab (heatmap + advanced filters).
 * Lenient like `ParliamentSearchSchema` — every field `.optional().catch(undefined)`
 * so a hand-edited/junk URL never throws, it just drops the bad facet.
 *   - `from`/`to`  — inclusive vote-date range (YYYY-MM-DD).
 *   - `choice`     — one or more of pentru|impotriva|abtinere|nu_a_votat.
 *   - `outcome`    — division outcome (adoptat|respins).
 *   - `session`    — proprie (member's own chamber) | comun (joint sitting).
 *   - `an`         — heatmap year (drives the vote-activity aggregate).
 */
export const MemberVotesSearchSchema = z.object({
  // Strict, calendar-REAL YYYY-MM-DD: a junk or impossible date (`?from=abc`,
  // `?from=2026-99-99`) must fall to undefined here, not reach the chip/date
  // formatters (RangeError: Invalid time value).
  from: strictIsoDateParam,
  to: strictIsoDateParam,
  choice: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .catch(undefined),
  outcome: z.enum(["adoptat", "respins"]).optional().catch(undefined),
  session: z.enum(["proprie", "comun"]).optional().catch(undefined),
  an: z.coerce.number().int().optional().catch(undefined),
});
export type MemberVotesSearch = z.infer<typeof MemberVotesSearchSchema>;

/**
 * Search params for the member interventii tab (speech heatmap + filters +
 * free-text). Lenient like `MemberVotesSearchSchema` — every field
 * `.optional().catch(undefined)` so a junk/hand-edited URL never throws.
 *   - `from`/`to`  — inclusive spoken-date range (YYYY-MM-DD).
 *   - `session`    — proprie (member's own chamber) | comun (joint sitting).
 *   - `q`          — free-text over title + summary + verbatim transcript.
 *   - `an`         — heatmap year (drives the speech-activity aggregate).
 */
export const MemberSpeechesSearchSchema = z.object({
  from: strictIsoDateParam,
  to: strictIsoDateParam,
  session: z.enum(["proprie", "comun"]).optional().catch(undefined),
  // Trimmed free-text; empty/oversized junk collapses to undefined so it never
  // reaches the query arg or the chip formatter.
  q: z.string().trim().min(1).max(200).optional().catch(undefined),
  an: z.coerce.number().int().optional().catch(undefined),
});
export type MemberSpeechesSearch = z.infer<typeof MemberSpeechesSearchSchema>;

/**
 * Which of the two stenograme views is showing. SITTINGS IS THE DEFAULT and the
 * default renders with NO param: a stenogram is a document, so the primary unit
 * of the surface is the sitting, not the isolated turn. `interventii` is the
 * cross-sitting search over individual contributions.
 */
export const ParliamentStenogrameViewSchema = z.enum([
  "sedinte",
  "interventii",
]);
export type ParliamentStenogrameView = z.infer<
  typeof ParliamentStenogrameViewSchema
>;

/**
 * Availability facet on the sittings view — the SERVED-READING promise of a
 * capture, surfaced as a filter because "show me only sittings I can actually
 * read" is a real question. Values match the server enum exactly.
 */
export const ParliamentStenogramAvailabilityParamSchema = z
  .enum(["COMPLETE", "PARTIAL", "SOURCE_ONLY"])
  .optional()
  .catch(undefined);

/**
 * Search params for the global stenograme page (/parlament/stenograme).
 * Lenient like the other parliament search schemas — junk never throws.
 *   - `view`     — sedinte (default, omitted from the URL) | interventii.
 *   - `an`       — selected year. On the INTERVENTII view it is load-bearing for
 *                  the list too, not just the heatmap: the server refuses an
 *                  unbounded speeches query, so when neither `vorbitor` nor
 *                  from/to is set the client sends the year window. On the
 *                  SEDINTE view it is a plain facet — the sittings table is one
 *                  row per capture with an indexed date, so it needs no bound
 *                  and the default view is the whole history, newest first.
 *   - `camera`   — camera | senat | comun (joint sittings) — one 3-way facet.
 *   - `vorbitor` — the speaker's mandateKey (picked via the roster combobox).
 *                  On sittings it selects the sittings where that speaker holds
 *                  at least one PUBLIC contribution.
 *   - `from`/`to`— inclusive date range (YYYY-MM-DD).
 *   - `q`        — free-text. The two views search DIFFERENT things and say so:
 *                  sittings run a full-history search over the canonical
 *                  transcript projection; interventions run the depth-reported
 *                  title/summary(+transcript) search.
 *   - `disponibilitate` — sittings-only availability facet.
 */
export const ParliamentSpeechesSearchSchema = z.object({
  view: ParliamentStenogrameViewSchema.optional().catch(undefined),
  an: z.coerce.number().int().optional().catch(undefined),
  camera: z.enum(["camera", "senat", "comun"]).optional().catch(undefined),
  vorbitor: z.string().trim().min(1).optional().catch(undefined),
  from: strictIsoDateParam,
  to: strictIsoDateParam,
  q: z.string().trim().min(1).max(200).optional().catch(undefined),
  disponibilitate: ParliamentStenogramAvailabilityParamSchema,
});
export type ParliamentSpeechesSearch = z.infer<
  typeof ParliamentSpeechesSearchSchema
>;

/**
 * The speaker filter's URL contract: `?vorbitori=`, repeated or single.
 *
 * The VALUES are the names the transcript PRINTED, verbatim — that is the only
 * identity a sitting is guaranteed to carry, and it keeps guests, ministers and
 * anyone the source printed no mandate for just as filterable as resolved
 * members. Names are therefore never comma-split (a printed name may hold one)
 * and never case-folded: a name that does not occur in the sitting simply
 * matches nothing, which the reader states rather than hides.
 *
 * Lenient like every other search param here — non-strings, blanks, duplicates
 * and absurd lengths are dropped, and the param never throws.
 */
const MAX_SPEAKER_NAME_CHARS = 200;

function parseSpeakerFilterParam(value: unknown): string[] | undefined {
  const candidates = Array.isArray(value) ? value : [value];
  const collected: string[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const trimmed = candidate.trim();
    if (!trimmed || trimmed.length > MAX_SPEAKER_NAME_CHARS) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    collected.push(trimmed);
  }

  return collected.length > 0 ? collected : undefined;
}

/**
 * `.optional()` on the OUTSIDE is load-bearing, not decoration: a preprocessed
 * param takes `unknown` as its input type, and without it the router would
 * infer `vorbitori` as a REQUIRED search key — forcing every existing link into
 * the reader (member records, speech detail, sitting cards) to pass a filter it
 * knows nothing about.
 */
const optionalSpeakerNamesParam = z
  .preprocess(parseSpeakerFilterParam, z.array(z.string()).optional())
  .catch(undefined)
  .optional();

/**
 * Search params for the sitting reader
 * (/parlament/stenograme/sedinte/$sessionKey).
 *   - `interventie` — the contribution to highlight and scroll to. Accepts a
 *     CANONICAL `canon:` key or a LEGACY `cdep:`/`senat:` key: a legacy deep
 *     link resolves through the server's speech_redirects, so old shared URLs
 *     keep landing on the right place in the document.
 *   - `vorbitori` — printed speaker names to narrow the reading to. A filtered
 *     reading is an EXCERPT, not the record, so the state is in the URL: what a
 *     reader shares must be exactly what they were looking at, filter included.
 *
 * There is deliberately NO free-text param: find-in-document was a reading aid
 * over an already-loaded document, and pushing every keystroke through the
 * router would rewrite history while the reader types.
 */
export const ParliamentStenogramReaderSearchSchema = z.object({
  interventie: z.string().trim().min(1).optional().catch(undefined),
  vorbitori: optionalSpeakerNamesParam,
});
export type ParliamentStenogramReaderSearch = z.infer<
  typeof ParliamentStenogramReaderSearchSchema
>;

// ── plenary agenda (ordinea de zi) ───────────────────────────────────────────
