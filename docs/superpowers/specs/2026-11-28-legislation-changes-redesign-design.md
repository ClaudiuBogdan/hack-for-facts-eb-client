# Modificări redesign — design

Date: 28 November 2026. Owner decisions taken in the conversation of 27–28 November 2026 (question dialogs).
Follows [the section trim](2026-11-27-legislation-section-trim-design.md), which kept Modificări as its own page.

## Intent

`/legislation/changes` is for **watching what is changing in Romanian law**: a journalist, lawyer or compliance
officer comes to see what changed lately and what is about to come into force (owner: "Watch what's changing").
It is not the place to look up one act's history (each act page has its timeline) nor to study trends (that is
Analiză).

Today the page lists 64,153 events, one row each, newest first. Its first screen is mostly promulgations of new
laws and approvals of emergency ordinances (13 of 20 rows on 28 November), which push out the amendments and
repeals a watcher is looking for; a law that changes three acts takes three rows; the filters are the old boxed
controls with a „Sursa" choice that names our pipeline.

## Goals

1. Lead with **changes to existing acts**; new laws and approved ordinances stay one click away (owner:
   "Separate them").
2. **One block per act that makes the change** (owner chose layout B from a picture of three): the changing act,
   its date, what it is about, and every act it changes.
3. **What is coming into force sits on top, always shown** when there is any (owner), above what is already in
   force.
4. Each block says **what the changing act is about**, in one or two lines (owner wanted this enough to wait for
   it; the API already serves it, see Data).

## Non-goals

- Looking up the changes to one act (the act page's timeline does it).
- Counts over time, by kind or by issuer (Analiză; the Monitorul Oficial counts are the next piece there).
- Any server change. This page uses what `legalRecentChanges` serves today.

## Anti-goals

- Hiding the undated quarter: 21,275 changes have no date of entry into force; they keep a tab of their own, as
  today, never silently dropped.
- Presenting the data as fresher than it is: the newest change already in force is dated 25 September 2026; the
  page keeps saying how far the data goes.
- Mixing new laws back into the main list by default.

## Data (dev API, measured 28 November 2026)

`legalRecentChanges(since, until, kinds, eventSource, undatedOnly, first, after)`, keyset-paged, ordered by
effective date then event id, the cursor bound to the filter. `kinds` takes a list.

| Cohort | kinds | Count |
|---|---|---|
| Changes to existing acts, in force (`until = today`) | abrogare-totala, abrogare-partiala, modificare, completare, suspendare, incetare-suspendare, republicare, rectificare, iesire-din-vigoare | 52,179 |
| The same, coming into force (`since = tomorrow`) | same | 7 |
| The same, undated (`undatedOnly`) | same | 21,275 |
| New laws and approved ordinances, in force | promulgare, aprobare-oug, aprobare-og | 11,974 (0 undated) |

- `sourceAct` is a full `LegalAct`, so `sourceAct { summary { description } }` gives the changing act's description
  (the same summary the search rows show). Every changing act sampled (60) had one, e.g. „Legea nr. 33/2026
  modifică și completează Legea nr. 236/2022 privind supravegherea prudențială…". The formal name
  (`canonical.den`) says nothing about the subject.
- The changed act comes only as `actId`, `displayCitation` and `status` (no description).
- About 1 in 9 change events **in force** has no changing act (republications, corrections; 22 of the newest
  200). The **undated** cohort is different: all 300 newest undated change events are total repeals with no
  changing act recorded.
- New laws and approved ordinances: 0 dated in the future, 0 undated. In a promulgation the affected act is the new
  law and the changing act is the decree (sometimes missing); in an approval of an OUG the affected act is the OUG
  and no changing act is recorded (the approving law is not linked).
- One changing act's events on one date are not always next to each other in the feed (ordered by event id
  within a date): in the newest 400, 46 groups reappear after another group.
- The counts answered in 0.1–0.8 s on 28 November (the current code still treats a count failure as possible).
- Volume: 200 recent changes span April–September 2026, about 40 a month; they form 146 blocks of
  (changing act, date), so most blocks hold one line.
- A joint order of several ministries comes back as one act per ministry (e.g. Ordinul nr. 382, 1640 and
  925/2025, each changing Ordinul nr. 321/2003 on the same day), with the same description.

## Approaches considered

- **A. By day**: a heading per day, one sentence per change. Recommended by me; not chosen.
- **B. By the act that changes**: one block per changing act. **Chosen by the owner** from a picture of the three.
- **C. Compact table**: a column per fact. Dense, but repeats the date and changing act on every row and becomes two
  lines per change on a phone.

How it is built: a `/development` prototype on live data first, reviewed by the owner at desktop and phone width;
it replaces the page only after the owner approves it (owner: "Design doc, then prototype"). Building straight
into the page would skip that look; a static mockup cannot show paging or real descriptions.

## The design

### Page

The legislation shell stays (title, data line with „date până la …", the bar Caută · Analiză · Modificări). Below
it:

```
[Schimbări ale actelor · 52.179]  [Legi noi și OUG aprobate · 11.974]  [Fără dată · 21.275]      [Filtre]

Urmează să intre în vigoare · 7
┌ Legea nr. 2/2026 · intră în vigoare la 5 ianuarie 2027 ─────────────────────────┐
│ Legea nr. 2/2026 reglementează plata pensiilor private în România, …            │
│   completează  Legea nr. 204/2006      ● Modificat                              │
│   completează  Legea nr. 411/2004      ◐ Abrogat parțial                        │
│   completează  Legea nr. 1/2020        ● Modificat                              │
└─────────────────────────────────────────────────────────────────────────────────┘

Intrate în vigoare
┌ Legea nr. 35/2026 · de la 25 septembrie 2026 ───────────────────────────────────┐
│ Legea nr. 35/2026 completează Legea nr. 678/2001 privind prevenirea …           │
│   completează  OG nr. 58/1998          ◐ Abrogat parțial                        │
└─────────────────────────────────────────────────────────────────────────────────┘
┌ Republicări · 29 iulie 2026 ────────────────────────────────────────────────────┐
│   Instrucțiunile din 15 octombrie 2009 · Ordinul nr. M.110 din 15 octombrie 2009│
└─────────────────────────────────────────────────────────────────────────────────┘
                                  [Încarcă mai multe]
```

### Tabs (one URL key)

1. **Schimbări ale actelor** (default): the change kinds. „Urmează să intre în vigoare" first (since = tomorrow;
   the group is absent when the count is 0), then „Intrate în vigoare" (until = today), paged.
2. **Legi noi și OUG aprobate**: promulgare, aprobare-oug, aprobare-og, with **no date bound** (none is future today;
   if one appears it shows first, its date in the accent, so nothing is dropped), paged. Rows, not blocks (a decree
   promulgates one law, so grouping by the changing act adds nothing): „Legea nr. 117/2026 promulgată prin Decretul
   nr. 371/2026 · 3 iulie 2026", „OUG nr. 55/2025 aprobată · 2 iulie 2026" (no approving law is recorded), status
   mark on the new act.
3. **Fără dată**: the undated change events as **plain rows** („Ordinul nr. 168/2015 abrogat"; „prin …" when a
   changing act is recorded), not blocks: they are total repeals with no changing act, so blocks would collapse into
   one ever-growing „Abrogări" block.

Each tab label carries **its tab's total, unfiltered** (three count queries, once per page load; a failed count
drops the number, never the list). The list's own head says the **filtered** count when a filter is on (one more
count query, keyed on the filter).

### Blocks

- **Grouping key**: (changing act id, effective date). Events with no changing act group by (kind, date) under a
  plain head: „Republicări", „Rectificări", or the kind's name.
- **Head**: the changing act's citation (link to its page) · the date: „de la 25 septembrie 2026" for in force,
  „intră în vigoare la 5 ianuarie 2027" in the accent for future. Undated blocks show no date.
- **Description**: the changing act's `summary.description`, clamped to two lines; absent → no line.
- **Lines**: one per changed act: the change as a verb (completează, modifică, abrogă, abrogă parțial, suspendă,
  încetează suspendarea, republică, rectifică, scoate din vigoare), the changed act's citation (link), its status mark
  (the status mark the search uses). Several kinds on one changed act join: „modifică și completează".
- **Paging and grouping**: pages accumulate under one filter, as today; blocks are built from **all rows loaded so
  far**, keyed as above, in the order a key first appears (a group's events are not always adjacent in the feed,
  and may continue on the next page; the block then grows). „Încarcă mai multe" loads the next page.

### Filters (the search's side panel / phone sheet pattern)

- A date range (de la / până la) for the in-force list. Its end is capped at today (the upcoming group already
  shows what comes later); the upcoming group ignores the range.
- The kind of change (several may be chosen; inside the current tab's kinds). It narrows **both** the upcoming
  group and the in-force list, so the tab reads as one filtered view.
- **„Sursa" is dropped** (my call: it names our pipeline, not something readers look for). Old links with
  `source=` are ignored.
- Old URLs keep working: `view=viitoare` lands on the default tab (upcoming is on top), `view=nedatate` on „Fără
  dată", `view=toate` on the default tab, `kind=` on the matching tab with that kind chosen, `since/until` as the
  range (an `until` past today is capped; the future part is in the upcoming group above).

My calls in this section and the tabs above (owner to check): „Sursa" dropped; tab counts unfiltered; the kind
filter narrows the upcoming group too; the range capped at today; „Fără dată" and the new-laws tab as rows.

### Freshness

The note on the newest change in force (25 September 2026) stays, shorter, above the tabs; the data line keeps its
„Date învechite" mark while the frontier is old.

## Left to the builder

Type sizes, spacing, the empty and error states' wording, the skeleton, the exact panel layout, how the verb and
status columns align on a phone, the URL key names for tab and kinds (Romanian, like the search's).

## Known limits and follow-ups

- **Joint orders** show as one block per ministry; their identical descriptions make them recognisable. Merging
  them is a later option.
- **New laws have no description** in the feed (the changed act is not a full `LegalAct`). Follow-up for the
  legislation session: serve the affected act as `LegalAct` on `LegalRecentChange`, so the new-laws tab can say
  what each law is about; and record the approving law on OUG approvals.
- **Undated repeals** carry no changing act, so the „Fără dată" rows cannot say what repealed them.
- Promotion adds Lingui ids (the verbs, tab names); a catalogue note goes to root before the extract.
