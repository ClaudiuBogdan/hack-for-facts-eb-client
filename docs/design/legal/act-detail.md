# Normative document — detail page (`/legislation/acts/$actId`)

> Design concept + iteration log. Measured against the **production database**
> (`transparenta_prod`, 2026-08-01) and the **live redesign GraphQL surface**, not
> against mocks. Every number below was queried, not estimated.
>
> Supersedes `docs/design/legal/features/act-detail-status-summary.md` where they
> disagree — that spec was written in June against the plan, this one against the
> data. Disagreements are called out in §8.

---

## 1. What this page is

The server **deliberately does not serve the text of the law**. `LegalNode`
carries `charStart`/`charEnd` as forward-compatible locators and the SDL says it
outright: *"node TEXT is not served (§3.4)"*. There is no field anywhere on
`LegalAct` that returns a paragraph of the act.

That is not a gap to design around — it is the brief. The page is:

> **Everything about this law except its text, plus a reliable route to the text.**

Understand it without reading it; know exactly where to go when you must read it.

---

## 2. The decisive measurement — design for the empty act

| Layer | Acts that have it | Share |
| --- | --- | --- |
| Plain-language summary, key dates, audiences, domains | 224.950 | **~100%** |
| Publication proof in Monitorul Oficial | 98.518 | 44% |
| Any status event at all | 39.425 | 18% |
| Incoming citations (`in_degree > 0`) | 45.686 | 20% |
| Article tree worth browsing (≥10 nodes) | 24.502 | 11% |
| More than one real body version (`corp`) | **3** | **0,001%** |

`in_degree` percentiles: **p50 = 0**, p75 = 0, p90 = 2, p99 = 29. The Codul
Fiscal's 2.621 is not the top of a curve, it is a different universe.

**The typical normative document is a lonely, uncited act with a good summary and
nothing else.** A page built around citation graphs and amendment timelines would
be magnificent for about twenty acts and derelict for 180.000.

This is why the page is **one scrolling column with progressive layers**, not the
four-tab parliament twin (decided 2026-08-01). Tabs would give the median act
three empty rooms. A block that has no content does not render at all — and its
absence is stated in words, once, at the bottom.

---

## 3. The disclosure ladder

Five rungs. A reader who stops at rung 1 has a true answer; each rung below adds
precision, never correction.

### Rung 0 — Verdict strip · always, no interaction

`displayCitation` as `h1`, `den` beneath it ("CODUL FISCAL din 8 septembrie
2015"), the 7-value status badge, entry into force, aliases as chips.

### Rung 1 — Ce spune, pe scurt · always, leads the page

`summary.plainLanguageSummary` — 400–800 characters, present for ~100% of acts,
and the only block that is always substantial. Decided 2026-08-01 over a
status-first and an audience-first lead.

Carries `AIProvenanceNotice` with model + confidence. It is never presented as
the law.

### Rung 2 — Te privește? · always

`affectedAudiences` and `domains` as chips, `penaltiesMentioned` as a flag,
`fiscalImpact` where present (25% of acts). Turns the page into a relevance
check without making the reader parse the summary.

### Rung 3 — Dovada · always

Key dates, the Monitorul Oficial publication card (issue, part, date, official
PDF), and the outbound link to the official text on `legislatie.just.ro`. This is
the rung that discharges §1: it is the route to the text.

### Rung 4 — Mecanica · collapsed, and only when non-empty

Amendment timeline · what this act changes · who cites it · article structure.
Each renders only above its own threshold (§5). For most acts this rung does not
exist, and the page ends at rung 3 without looking truncated.

---

## 4. The honesty problem this page has and the landing page does not

**The summary describes the act as first published. Amendments are not folded in.**

Verified on the Codul Fiscal: its canonical document `171282` is
`version_kind = 'corp'`, `version_date = 2015-09-10` — the original. Yet
`amendedAfterPublication = 295` and `statusEvidence.modified_by_count = 216`. The
plain-language summary duly says "TVA 20% în 2016, 19% din 2017", which is a
decade stale, and says it in the confident voice of a summary.

**10.033 acts** are in this position (`modified_by_count > 0`). For every one of
them the page must carry, *above the summary and not below it*:

> ⚠ Rezumatul descrie actul așa cum a fost publicat la {date}. De atunci a fost
> modificat de {n} ori. Nu deținem textul consolidat la zi.

Ranked list of what else must be said, by how badly it would mislead:

1. **Stale summary** (above) — 10.033 acts. An over-claim, stated in the
   confident register, about the thing most people will read. Worst on the page.
2. **CCR decisions do not touch status** — corpus-wide. An act showing
   "În vigoare" may have provisions struck down as unconstitutional.
3. **Contradicted abrogations** — 354 acts carry
   `statusEvidence.contradicted_abrogations > 0`; the Codul Fiscal has 10. The
   sources disagree about whether parts are repealed. Say so on those acts.
4. **We never hold the text.** No phrasing may imply otherwise — see §1.
5. **Unresolved / cluster references** are "potrivire posibilă", never a hard
   link. `resolution` is one of `unique` | `cluster` | `unresolved` | `external`;
   only `unique` renders as a confident link.
6. **`extraction_status = 'suspicious'`** on 3.649 documents — surface it on
   those, in the provenance footer.

---

## 5. Render thresholds

A block appears only when it clears its bar. Below the bar it is absent, not
empty.

| Block | Renders when | Cap |
| --- | --- | --- |
| Staleness warning | `amendedAfterPublication > 0` | — |
| Contradiction warning | `statusEvidence.contradicted_abrogations > 0` | — |
| Fiscal impact | `summary.fiscalImpact` non-empty | collapsed past 3 lines |
| Publication card | `gazettePublications` non-empty | first 3 |
| Timeline | `timeline` non-empty | first 12, then "vezi toate" |
| Out-links | `links(OUT).totalCount > 0` | first 10 |
| In-links | `inDegree > 0` | first 10 of 2.621 — count leads |
| Structure | `tree.length >= 10` | depth 1, lazy children |
| Versions | ≥2 `corp`/`republicare` docs | **3 acts corpus-wide — see §8** |

---

## 6. What carries over from `/parlament`, and what must not

**Carries over.** The shell (large title, muted lede, meta line, stat chips), 2px
borders, `rounded-none`, radius ≤ 8px, tabular figures, one accent per page
(`--legislation-accent`, `#512178`), the section-band composition, the horizontal
tab-nav idiom for the module level.

**Must not.**

- **The four-tab detail layout.** A bill has four genuinely populated tabs; an
  act does not (§2).
- **The stage tracker.** A bill's passage is linear and finite — first chamber,
  second chamber, promulgation. An act's amendment history is unbounded and
  unordered by process; forcing it into a tracker implies a progression that does
  not exist. It is a reverse-chronological list.
- **Vote surfaces.** No equivalent exists for an act.

---

## 7. Route and state

- `/legislation/acts/$actId` — `$actId` is `legal.acts.act_id`, the same id
  parliament `actLinks` and entity-search `legal_act` hits carry.
- Sub-routes stay English, per the `/legislation` decision in `main-page.md` §1.
- Server data: a single `legalAct(actId:)` query. Every block above is a field on
  it — no second round-trip, no new server work.
- `legalAct(citation:)` also resolves free text ("legea 227/2015", "codul
  fiscal"), which is what the landing-page search box will use once the resolver
  lands.

---

## 8. Where this contradicts the June spec

- **Tabs → one page.** `act-detail-status-summary.md` specifies
  `Rezumat / Cronologie / Referințe / Structură` sub-routes. Rejected on §2.
- **Version selector → cut.** `version-cluster-consolidation.md` designs a
  `?versiune=` header control. Only **3 acts** in the corpus have two real body
  versions; 3.153 of the 3.529 non-`original` documents are `stub-header` stubs,
  several flagged `suspicious`. A selector over one option on 99,999% of pages is
  furniture. Revisit if consolidation ever lands.
- **Route slug.** June says `/legislatie/acte/$id`; the module settled on English
  paths (`main-page.md` §1).
- **`explanation_documents` → unavailable.** The June specs lean on
  `explicatie_simpla`, `idei_principale`, `pe_cine_afecteaza`, the glossary, the
  audio player, and `typed_obligations`. **All of it is gated off**:
  `legal.enrichment_field_gate_status` marks every one of those fields
  `publishable = false` (`inference_only` / `grounded_extraction`, gated
  2026-06-20/22, no `gate_name` set), and the GraphQL surface exposes none of
  them. 72.218 explanations, 714.064 typed obligations, 140.926 defined terms and
  26.395 audio files exist and **cannot be published**. The servable beginner
  layer is `document_summaries`, which is not in the gate table.
  `explanation-audio-player.md` and any obligation surface are blocked on the
  gate, not on the client.

---

## 9. Server traps found while building

Both were found by rendering production data, not by reading the SDL. Neither is
visible from the schema.

### 9.1 `LegalReferenceConnection.totalCount` is the page size, not a total

Measured on act 66150: `first: 3` → 3, `first: 12` → 12, `first: 50` → 50, while
the true incoming count is **2.621**. It only tells the truth when it comes back
*below* what you asked for.

The first build shipped it straight to the UI and rendered **"12 trimiteri" on an
act with 2.621 of them** — precisely the class of over-claim this page exists to
prevent. Fixed by:

- taking the incoming total from `LegalAct.inDegree`, which is a stored column
  and the closest thing to authoritative;
- treating a saturated `totalCount` as **unknown** (`null`) rather than a number,
  which renders "cel puțin N" instead of a false exact;
- asking for `first: 60` outgoing, comfortably above the real out-degree, so the
  outgoing count is trustworthy for essentially every act.

`inDegree` is trusted only while it agrees with what came back. It is a stored
column and can lag the edge table, and a total *below* the rows on screen is not
a total — believing it would print "0 trimiteri" above a list of them. Any
disagreement, and an absent count of either kind, degrades to unknown rather than
to zero.

**Do not render `totalCount` from this connection anywhere else without the same
treatment.**

### 9.2 `act_type` and `issuer_slug` are open vocabularies

256 distinct act types and **6.005 distinct issuer slugs**, the latter with
unreconciled near-duplicates (`guvernul` · `guvernul-romaniei` · `guvern` ·
`guvernul-prim-ministrul` are the same institution). The first build assumed a
closed set and invented `hg`, which does not exist — the real value is
`hotarare`, and at 52.521 acts it is the single most common type in the corpus.

Labels now map the head (top 22 types = 96,5%; top 12 issuers = 63,6%) and
prettify the tail from the source's own spelling. `unknown` is a real stored
`act_type` on 1.985 acts and renders as "Act normativ", never as the English
word.

---

## 10. Iteration log

- **2026-08-01 · concept.** Architecture and lead block decided with the user
  from real-data options: one page with progressive layers; plain-language
  summary leads.
- **2026-08-01 · v1 against production.** Built and iterated with `agent-browser`
  against the live redesign API on the prod DB. Probes: the median act
  (`103524`), the outlier (`66150`), an act with no summary (`1511465`), a
  `suspicious` extraction (`192880`), a CCR decision (`33996`), `abrogat`
  (`191245`), `suspendat` (`3662`), `necunoscut` (`1512621`), `unknown` act type
  (`1513020`), and a nonexistent id. All render; the provenance footer adapts
  from 2 to 4 notes depending on what the act is missing.
  Fixed in this pass: §9.1 and §9.2.
