# National budget — the citizens' page (5 October 2026)

`/development/national-budget/principal`. The front door of the national
budget, for almost every citizen: graphical, one year at a time, live on the
API. The analysis page (`/national-budget/analytics`) opens from every band.
Decisions and data rules: `docs/design/national-budget/design.md` §10.

## How to pick

- `?v=pagina`: the page as a reader sees it. The amber ribbon over the head
  and over each band switches that band's design, and the choice stays in
  the address (`?v=pagina&cap=cifra&cheltuieli=bon&ministere=fata`): a set
  of picks is a link to send back.
- `?v=galerie`: every design of every band, one under the other, named.
  `&banda=<id>` keeps one band (`cheltuieli`, `domenii`, `ministere`,
  `venituri`, `deficit`, `anul`, `bugete`, `lege`).
- `&an=<year>` sets the page's year (2006–2026; 2026 is January–July).

## The bands and their designs

| Band | Question | Source | Designs |
|---|---|---|---|
| `cap` (head) | How big is it? | MF bulletin; ANAF for C | **A `intrebare`** the question as the headline, the year's revenue and spending as two bars with the deficit hatched · **B `cifra`** the year's spending is the headline, the years as clickable columns · **C `cine`** the procurement hub's head, the ministries that spend most beside it |
| figures | — | MF bulletin | spending, revenue, deficit (% of GDP), spending as % of GDP, with the change on a year earlier |
| `cheltuieli` | What is it spent on? | MF bulletin, consolidated | **A `suta`** 100 squares, a leu each · **B `bon`** the citizen's receipt: lei out of 100 per item · **C `treemap`** |
| `domenii` | On which domains? | ANAF, state budget | **A `harta`** treemap · **B `suta`** lei out of 100 per domain · **C `cartonase`** a tile per domain, this year and last on one scale |
| `ministere` | Who spends it? | ANAF, state budget | **A `lista`** ranked rows that open on a ministry's domains · **B `harta`** treemap · **C `fata`** this year against last, a dot each |
| `venituri` | Where does it come from? | MF bulletin, consolidated | **A `suta`** 100 squares · **B `treemap`** · **C `banda`** one strip of shares and ranked rows |
| `deficit` | How much is borrowed? | MF bulletin | **A `lei`** revenue and spending since 2006 as two lines, the deficit shaded between them · **B `pib`** the deficit in % of GDP as columns, with the EU's 3% line (2019 on) · **C `marime`** revenue and spending in % of GDP (2019 on) |
| `anul` | How is this year going? | MF bulletin | **A `cumulat`** from 1 January, month by month, this year against the last (spending or revenue) · **B `deficit`** the deficit as it builds up, month by month, paired columns · **C `carduri`** three cards: revenue, spending, deficit, this year to date against the same months |
| `bugete` | Through which budgets? | MF bulletin, budget columns | **A `punte`** the bridge: each budget a step up to „all budgets", the transfers taken out, the consolidated total left · **B `blocuri`** a treemap of the budgets, then 1.003,1 against 808,7 · **C `lista`** each budget with what it pays for, linking to its history |
| `lege` | What did Parliament approve? | the budget laws | **A `plan`** (7 October, the owner asked for a better design than the cards) the state budget's law as a plan — planned revenue against approved spending, the printed deficit hatched, the change on the previous law; the three funds with laws of their own as rows under the head; then the approved chapters as the treemap, each with its change on the previous law; caveats behind one marker · **B `fonduri`** the four funds as cards · **C `capitole`** the approved chapters as ranked bars · **D `ani`** law after law, 2016–2025, then that law's chapters |
| start | Where to go next | — | six ready questions into the analysis page |

## What holds in every design

- Three sources, never mixed in one chart: the MF bulletin (the whole
  public purse), ANAF (the state budget's ministries and domains, read over
  the bulletin's own window), the laws (the plan). No rate of execution
  against the law.
- Every amount from the exact digits; floats only for geometry. „The rest"
  is the printed total less the lines shown, hatched, last. Lei out of 100
  by the largest remainder, so they make 100.
- A year a source doesn't reach says why, in a sentence: ANAF before 2016,
  the law for 2026, the budget columns before 2019 and in December 2023.
- Each band waits and fails on its own; the page around it stands.
- One accent: the parts take one navy family by rank, darkest for the
  largest, palest for the smallest (the choropleth's two ends mixed in
  OKLab, so dark mode follows); „the rest" is hatched grey. The mix skips
  47–69%, where neither text colour reaches 4.5:1 in either theme.
- The treemap (6 October, at the owner's request: „polish colors, style"):
  rounded tiles with gaps, laid out in the frame's own proportions (near
  square on a phone too). A cell shows what it has room for: name, the
  share in large figures and the amount; or name and share; or the share.
  The reading follows the pointer (or the focused cell) with the amount, the
  share, the change on last year and what the part holds.
