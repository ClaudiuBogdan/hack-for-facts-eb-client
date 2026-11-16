# Budget balance on the landing map: method and legal basis

As of 16 November 2026.

## In short

The landing map's *Sold bugetar* is 2025 reported cash receipts minus
reported cash payments, as a share of receipts. It uses the annual main-creditor
execution report published through ANAF's Forexebug portal. The map keeps
reported transfers and financing flows. A separate year-end figure, the
local-budget surplus carried forward under Article 58, comes from the
Treasury's closing account or a council decision that identifies that balance.

## The formula

For each primărie (SIRUTA on the map), year 2025:

```text
Sold % = (încasări raportate − plăți raportate) / încasări raportate × 100
```

- **Receipts and payments.** Receipts are the sum of the primărie's reported
  receipts (`vn`). Payments are the sum of its reported payments (`ch`).
- **Scope.** The report *Executie bugetara agregata la nivel de ordonator
  principal*, territorial executives only (`is_territorial_executive`). Amounts
  are in lei, nominal, and not per capita.
- **No exclusions.** Neither series carries an `exclude` filter.
- **No value** where receipts or payments are missing, or where receipts are
  zero or negative. Those primării are drawn in the no-data grey.
- **Colour classes.** The percentage is rounded to one decimal, as printed, then
  placed in seven fixed classes:
  - under −20
  - −20 to under −10
  - −10 to under −3
  - −3 to under 3
  - 3 to under 10
  - 10 to under 20
  - 20 or more

  Each class holds its lower bound. The red bands are below −3% and the blue
  bands start at +3% on the rounded scale.
- **București.** The capital's own budget has no shape on the map, which draws
  the six sectors instead. The legend says so.

## Legal basis and what the figures measure

- **Article 57 — annual execution account.** By 31 May of the following year,
  principal credit authorising officers present the account to their councils
  for approval. It lists initial and final revenue estimates and actual receipts,
  plus initial and final spending appropriations and actual payments. The map uses
  the comparable cash fields in the Forexebug XML. The council-approved account
  is a separate document. [Law 273/2006, Article 57][law]
- **Article 58 — local-budget closing surplus.** At closing, the operating and
  development sections are settled after the required adjustments for specified
  state revenue allocations and transfers from state or other budgets, and after
  overdue payments are settled. The council can direct the surplus carried
  forward to development spending, temporary cash gaps, or definitive coverage
  of section deficits. Some project funds retain their original purpose. Under
  Article 58(1⁴), an authorising officer may approve definitive coverage within
  the amounts the council already approved for development and temporary cash gaps.
  [Law 273/2006, Article 58][law]
- **Articles 2, 3 and 59 — scope.** Articles 2(1), points 15 and 28, and 3(1)
  distinguish consolidation and the annual budget surplus. Consolidation removes
  a matched internal receipt and payment. It reduces both totals by the same
  amount and preserves their cash difference within the agreed scope. Article 59
  covers local cash execution through the Treasury, including debt transactions.
  [Law 273/2006, Articles 2, 3 and 59][law]

## Reconciling the surplus carried forward

Under the 2025 closing rules, the Treasury credits section surpluses to
`82.A.98.00.00` (*Excedent al bugetului local*) and debits it when prior
surplus covers a section deficit. The closing balance includes prior years'
remaining surplus. It can be positive in a year in which payments exceed
receipts. It can also include funds earmarked for specific projects.
[Ministry of Finance Order 1,983/2025, closing rules §§5.16–5.18][closing]

For the sample, take signed actual receipts minus actual payments separately
for operating and development in **source A (local budget)**. This is narrower
than the main-creditor totals used on the map. The XML supplies the annual
section movements. It has no opening surplus, closing-account balance, or
complete ledger of closing adjustments. With an official opening amount and
the final, same-scope movements, the reconciliation is:

```text
Closing surplus = official opening surplus
                + final operating result + final development result
                + other surplus-account movements outside those results
```

Use the Treasury closing account or a council decision that identifies that
balance to verify the result. Apply only adjustments and uses that the reported
movements do not already include. A council decision authorising use may cover
only part of the balance.

### December 2025 XML checks

The sample contains four `FXB-EXB-901` main-creditor XMLs dated 31 December 2025. Each file matched
its archived SHA-256 hash. The sums use the signed `RULAJ_CH_VN` rows in
one report level (`NIVEL=1`), excluding printed total rows. All amounts are in
lei.

- **Cluj-Napoca.** Source A operating **+539,160,277.18** and development
  **−232,799,852.53** give a 2025 result of **+306,360,424.65**. Adding the
  opening **706,860,880** gives **1,013,221,304.65**. The council approved
  **1,013,221,305** for use in 2026, a match to the nearest leu.
  [ANAF XML][cluj-xml] · [HCL 27/2025][cluj-open] · [HCL 45/2026][cluj-close]
- **Timișoara.** The XML matches the Treasury's operating surplus
  **+51,254,858.60** and development deficit **−73,448,776.24** to the ban.
  The 2025 result of **−22,193,917.64** reduced the opening **118,081,961.29**
  to **95,888,043.65**, the closing balance of `82.A.98`.
  [ANAF XML][tm-xml] · [2024 Treasury balance][tm-open] ·
  [2025 Treasury balance][tm-close] · [Deficit coverage decision][tm-deficit]
- **Bucharest Sector 4.** Operating **+8,209,720.93** and development
  **−4,195,896.70** give **+4,013,824.23**. The opening **5,726,189.98**
  combines **5,570,989.16** from the first decision and **155,200.82** from
  the later decision. The result is **9,740,014.21**, exactly the amount
  released for 2026. [ANAF XML][s4-xml] · [HCL 4/2025][s4-open] ·
  [HCL 67/2025, Article 5][s4-opening-adjustment] · [HCL 3/2026][s4-close]
- **Bucharest City Hall (PMB).** Source A operating **+18,083,736.38** and
  development **−22,573,948.16** give **−4,490,211.78**. Adding this to the
  **23,678,587** opening local-budget cash gives **19,188,375.22**, matching
  the **19,188,375** closing cash reported in Annex 03 to the nearest leu.
  This checks the local-budget cash-flow statement. The Article 58 surplus
  account was not verified for PMB. [ANAF XML][pmb-xml] ·
  [Treasury Annex 03, local-budget column, rows 03013–03015][pmb-cash]

## Why the default exclusions were removed

The map now requests the reported receipts and payments used by the entity
page. The earlier map request excluded rows that the entity page retained.

On 16 November 2026 the landing map stopped applying the app's analytics
defaults (`withDefaultExcludes`):

- **Spending:** economic codes 51.01 and 51.02 (transfers paid between budgets).
- **Receipts:** functional codes 36.02.05, 37.02.03, 37.02.04 and 47.02.04.

Those filters drop rows by code prefix. They don't remove a transfer paid by one
budget together with the same transfer received by another, inside a fixed
scope, so they are not an Article 3 consolidation. On a single primărie's budget
they only removed part of its reported flows, and the map stopped agreeing with
the entity page it links to.

Live check on Chronos dev, 2025, main credit holder: the map request without
exclusions compared with the entity page's `budgetEntitySummary`. Receipts,
payments and balance are equal to the ban in all three.

| Primărie | Receipts (lei) | Payments (lei) | Balance now (lei) | Before, with exclusions (lei) |
| --- | --- | --- | --- | --- |
| Cluj-Napoca | 2,656,460,197.71 | 2,347,672,937.67 | +308,787,260.04 (+11.6%) | +397,218,946.03 (+15.0%) |
| Timișoara | 3,015,432,569.84 | 3,043,733,325.16 | −28,300,755.32 (−0.9%) | +103,080,124.48 (+3.4%) |
| Sector 4 | 2,967,308,928.39 | 2,962,686,393.44 | +4,622,534.95 (+0.2%) | +38,013,363.90 (+1.3%) |

A replay of both map requests found 185 colour-class changes among 3,186
municipalities. The live entity-page parity check covered the three examples above.

## What stays in, and how to read the map

The map retains transfers and financial operations as recorded in the selected
report, including loan principal repayments (economic code `81`). Functional
chapters `40` and `41` contain several distinct flows. For example, Sector 4
reported **291,309,110.56 lei** under `40.16.00` for settlements of payment
requests and **428,912,110.22 lei** under `41.02.01` for internal borrowing.
These are reported flows. The opening surplus comes from the prior closing
account. [Sector 4 ANAF XML][s4-xml]

A sensitivity check applied all FN `40`/`41` and EC `81` exclusions on top of
the former transfer filters. It changed 363 colour classes and gave Sector 4
−28.8% of adjusted receipts. This was a test of filters. The map and the
reconciliations above use the reported cash amounts.

How to read a colour:

- **Blue:** the primărie collected more than it paid in 2025, by the share shown.
- **Red:** it paid more than it collected.
- **Neutral (−3% to under 3%):** close to even.

A colour is not a verdict on good or bad management. Both a surplus and a
deficit can come from timing, financing or an investment cycle.

The legend's source line reads: „Sursa: Ministerul Finanțelor, execuția de casă
2025 a primăriilor (ordonator principal): încasările și plățile raportate,
inclusiv transferurile și finanțările, în lei, valori nominale.”

## Implementation

| File | Role |
| --- | --- |
| [Map request](../src/features/landing/api/budget-map.ts) | Two grouped series for receipts `vn` and payments `ch` |
| [Map request test](../src/features/landing/api/budget-map.test.ts) | Guards the absence of exclusions and preserves year, report type, scope and normalization |
| [Map measures](../src/features/landing/lib/budget-map-measures.ts) | The formula and the seven colour classes |
| [Legend](../src/features/landing/components/budget-map/map-legend.tsx) | The legend and its source line |

The app's analytics defaults (`withDefaultExcludes`), the other maps and the
`/development` prototype are unchanged.

## Live data references

The landing map used Chronos dev's `advanced-map-analytics/grouped-series`
endpoint. The 16 November 2026 parity check compared it with GraphQL
`budgetEntitySummary` for the same report type and year.

[law]: https://legislatie.just.ro/Public/DetaliiDocument/305510
[closing]: https://legislatie.just.ro/Public/DetaliiDocumentAfis/305860
[cluj-xml]: https://static.anaf.ro/rapfxb/LOT660/20251231_FXB-EXB-901_TREZ216_4305857_4305857_02_110400761.xml
[cluj-open]: https://primariaclujnapoca.ro/consiliu-local/hotarare-de-consiliu/hotararea-27-din-2025/
[cluj-close]: https://primariaclujnapoca.ro/consiliu-local/hotarare-de-consiliu/hotararea-45-din-2026/
[tm-xml]: https://static.anaf.ro/rapfxb/LOT660/20251231_FXB-EXB-901_TREZ621_14756536_14756536_02_110406413.xml
[tm-open]: https://assets.primariatm.ro/4f9dbc15-d3aa-4141-b807-8beebd3fee09/Direc%C8%9Bia%20Economic%C4%83.pdf
[tm-close]: https://assets.primariatm.ro/667bd4fd-6c54-4bc6-9cb5-e15fbfb868ec/Direc%C5%A3ia%20Economic%C4%83.pdf
[tm-deficit]: https://www.primariatm.ro/hcl/2026/1
[s4-xml]: https://static.anaf.ro/rapfxb/LOT660/20251231_FXB-EXB-901_TREZ704_4316422_4316422_02_110400785.xml
[s4-open]: https://ps4.ro/wp-content/uploads/2025/04/Documente-contabile-T4-2024.pdf
[s4-opening-adjustment]: https://ps4.ro/wp-content/uploads/2025/05/H_67-af.pdf
[s4-close]: https://ps4.ro/wp-content/uploads/2026/01/H_3.pdf
[pmb-xml]: https://static.anaf.ro/rapfxb/LOT660/20251231_FXB-EXB-901_TREZ700_4267117_4267117_02_110400317.xml
[pmb-cash]: https://doc.pmb.ro/institutii/cgmb/situatii_financiare_anuale/2026/3.pdf
