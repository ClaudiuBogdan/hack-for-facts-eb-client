# Fact check: the curated series on `/ins`

Checked on 26 September 2026. Scope: the main page's chosen datasets, hardcoded histories and locality snapshot, headlines, map legends, definitions, historical comparisons, and suggested analyses. The dataset explorer and the rest of the INS catalog are outside scope.

**The page reproduces Chronos accurately, but Chronos is behind the live INS source in several places. Three hardcoded historical points are outdated. The water legend makes an unsupported infrastructure claim, with ten concrete counterexamples.**

This was a read-only audit. No application code, database data, deployment, branch, or credentials were changed.

Follow-up: the [water missing-data correction](ins-water-missing-data-fix-2026-09-26.md)
and [housing missing-data correction](ins-housing-missing-data-fix-2026-09-26.md)
were implemented and reviewed after this audit. The findings below record the
audited state; the remaining corrections are separate follow-up work.

## Evidence and limits

- Inspected the open Zeus `/ins` page and a fresh page at `https://zeus-agents-01.basa-discus.ts.net:3000/ins`.
- Inspected the local client at `82e2c13520e2b3f17fd91f529ad3c7e007981dea`. Some rendered Zeus copy differs from this checkout; the tourism sentence below was observed in the browser and is absent from the local page file.
- Verified Chronos with the repository's cluster identity guard. Queried `transparenta_prod`, using `BEGIN READ ONLY`, `SET LOCAL ROLE transparenta_prod_agent_readonly`, and 15–30 second statement timeouts. Queries used exact dataset, period, unit, and classification coordinates.
- Retrieved live metadata and national pivot CSVs for 21 public TEMPO matrices, plus the six county tables and ten water counterexamples. The source API is `http://statistici.insse.ro:8077/tempo-ins/`; the repository's documented public endpoint serves HTTP. No TLS validation was disabled.
- **GPT/Web-Flow did not complete.** Both `web-flow search --provider=chatgpt` attempts failed with `ChatGPT Web search mode did not activate`. A separate ChatGPT page also remained at “Loading profile”, with Send disabled, including after a reload. No GPT answer is used as evidence. Ordinary web search corroborated the salary successor; direct INS responses provide the numerical/source verification.
- Initial automatic approval review rejected sending the full application claim inventory to ChatGPT as internal data. The narrower request containing only public INS codes and general definitions was approved, then encountered the activation failure above.
- “Latest” below means **the newest period returned by the live TEMPO endpoint during this audit**. It does not establish the newest press release across every INS publication channel.

[Download the evidence bundle](/Users/claudiuconstantinbogdan/.codex/visualizations/2026/09/26/01a0dbfa-e00c-7f41-bbad-d9f9ada234d0/ins-main-page-fact-check-evidence.zip). It contains the SQL, comparison scripts, database results, exact public API requests/responses, Web-Flow failure logs, and a SHA-256 manifest. No credentials are included.

## Confirmed numerical checks

| Check | Result |
| --- | --- |
| Six hardcoded national histories against Chronos | **204/204 points match** |
| The same histories against live INS | **201/204 match; three 2023 revisions** |
| Six county layers, 42 counties each, against live INS | **252/252 values match** for the displayed years |
| Six locality layers, 3,181 UATs each, against Chronos | **19,086 positions reproduce the snapshot**, subject to the missing-value assumptions below |
| Locality and county snapshot sums | All six sum exactly to their snapshot national total |
| Five named declining counties | All **170 consecutive annual comparisons** decline, 1992–2026, in Chronos POP107D |
| “Deaths exceed births since 1992” | Supported through **2025**, including the live INS revisions |

The locality comparison includes 544 null water positions, 1,251 missing housing cells converted to zero, and nine missing birth cells converted to zero before calculating natural change. Reproducing those rules does **not** independently validate their interpretation. It was not a full live-source comparison of all locality cells.

## Findings and recommended corrections

### 1. Update the selected salary series and distinguish stored freshness from source freshness

The displayed older-period numbers are valid for those periods. They are not the newest TEMPO figures available now.

| Main-page selection | Page / Chronos | Live TEMPO | What needs attention |
| --- | --- | --- | --- |
| Annual inflation, IPC102E minus 100 | **10.85%, May 2026** | **8.16%, July 2026**; index 108.16 | Chronos is missing June/July. The subtraction and same-month-last-year label are correct. |
| Average net salary, FOM106D | **5,914 lei, December 2025** | Successor **FOM106G: 5,820 lei, July 2026** | FOM106D ends in December 2025. Chronos already has FOM106G through May 2026, **5,684 lei**, so the hardcoded selection is also behind data already stored. |
| Registered unemployment, SOM103B | **3.2%, May 2026** | **3.2%, July 2026** | The value happens to match; the period is stale. |
| Resident population, POP105A | **19,043,151, 1 January 2025** | **19,041,322, 1 January 2026** | New reference year not stored. This remains a resident-population measure. |
| Domestic-use water, GOS108A / member 7416 | **609,743 thousand m³, 2024** | **607,313 thousand m³, 2025** | The locality snapshot and Chronos are a year behind the source. Refresh the complete layer, not just its national total. |

Sources: live [IPC102E](http://statistici.insse.ro:8077/tempo-ins/matrix/IPC102E?lang=ro), [FOM106G](http://statistici.insse.ro:8077/tempo-ins/matrix/FOM106G?lang=ro), [SOM103B](http://statistici.insse.ro:8077/tempo-ins/matrix/SOM103B?lang=ro), [POP105A](http://statistici.insse.ro:8077/tempo-ins/matrix/POP105A?lang=ro), and [GOS108A](http://statistici.insse.ro:8077/tempo-ins/matrix/GOS108A?lang=ro), with numeric pivot responses in the bundle. The [official FOM106D page](https://statistici.insse.ro/tempoins/index.jsp?ind=FOM106D&lang=ro&page=tempo3) also explicitly names FOM106G as its continuation.

Client locations: `src/features/statistics/lib/landing-constants.ts` and `src/features/statistics/data/uat-map-values.json`. Fixing the selected salary code alone would improve the headline but would not repair the upstream freshness gap.

### 2. Three hardcoded 2023 points miss published revisions

| Series | Hardcoded chart and Chronos | Live INS |
| --- | ---: | ---: |
| POP201D, live births, 2023 | 164,004 | **168,079** |
| POP206D, deaths, 2023 | 244,624 | **245,115** |
| POP217A, life expectancy, 2023 | 75.52 years | **75.50 years** |

The chart's 2023 natural decrease is consequently **−80,620**, while the revised source gives **−77,036**. The gap is 3,584 people. Latest 2025 birth/death/life-expectancy values still match INS.

The live metadata explicitly identifies 2023 as revised. The source update dates are 9 September 2026 for births and life expectancy, and 8 September for deaths. The hardcoded history's capture stamp is **22 September 2026**: that stamp describes a read from an older stored corpus, not verification against the source on that day.

`src/features/statistics/lib/hub-national-series.ts:7` says closed years are rarely revised; that is not a safe maintenance assumption for these series. `seriesFor` in `src/features/statistics/api/graphql/statistics-hub-fetchers.ts:126` only appends a newer year. It neither replaces revised earlier years nor refreshes an existing final year. A database refresh alone will therefore leave these charts stale.

**Recommendation:** refresh the affected stored source data through its normal pipeline, replace the full selected histories, and make refreshes respond to source revisions. Keep capture time distinct from source update time.

Sources: [POP201D](http://statistici.insse.ro:8077/tempo-ins/matrix/POP201D?lang=ro), [POP206D](http://statistici.insse.ro:8077/tempo-ins/matrix/POP206D?lang=ro), [POP217A](http://statistici.insse.ro:8077/tempo-ins/matrix/POP217A?lang=ro).

An additional POP105A 2024 revision exists in Chronos versus INS (19,067,576 → 19,068,290), but that historical point is not one of the main page's six hardcoded histories.

### 3. Missing domestic-water volume does not prove absence of a public network

The snapshot marks **544 UATs** as `network`. The legend says “544 fără rețea publică”; the tooltip says “fără rețea publică de apă raportată”. The generator reaches this conclusion from an absent **domestic-use volume** cell, without consulting a network-infrastructure indicator.

Ten of those UATs have positive **total drinking-water distribution** in both Chronos and the live INS 2024 table:

| UAT | County | Total distributed, thousand m³ |
| --- | --- | ---: |
| Seleuș | Arad | 155 |
| Ruscova | Maramureș | 116 |
| Racovița | Sibiu | 78 |
| Bara | Timiș | 37 |
| Priponești | Galați | 10 |
| Vutcani | Vaslui | 5 |
| Corni | Botoșani | 4 |
| Berzunți | Bacău | 1 |
| Vălișoara | Hunedoara | 1 |
| Burla | Suceava | 1 |

INS defines the volume as supply through distribution networks **or directly through supply conduits**. These rows do not independently establish each locality's network configuration, but they demonstrate why “missing domestic-use volume → no public network” is an invalid inference.

**Recommendation:** use “fără valoare raportată pentru uz casnic” or “date indisponibile pentru uz casnic”. Only claim absence of a network when a separate infrastructure source supports it. Do not replace the missing domestic values with total distribution: they measure different things.

Locations: `src/features/statistics/components/uat-map/uat-map-series.ts:47`, `uat-map-legend.tsx` (`Keys`), and `src/features/statistics/lib/territory-derived.ts` (`yearInputs` / `computeDerived`). Source: [GOS108A](http://statistici.insse.ro:8077/tempo-ins/matrix/GOS108A?lang=ro); exact ten-place source response is `water-examples.csv` in the bundle.

### 4. Explain the breaks in long-run comparisons

The displayed endpoint arithmetic is correct: births **−53.7%**, deaths **−3.0%**, life expectancy **+7.9 years**, employees **−33.1%**, dwellings **+27.1%**.

However, a plain unqualified comparison can imply more continuity than the source supports:

- **Housing:** INS says 2021–2023 were recalculated following the 2021 census. The stock jumps from 9,156,311 in 2020 to 9,930,134 in 2021. The full **+27.1%** since 1990 is a comparison of published stock estimates; it is not a clean count of dwellings newly built. Add a visible census-recalculation note and mark the break on the chart.
- **Births/deaths:** the source scope changes in 2012, adding usual residence alongside domicile. Add a short comparability note for the 1990–2025 chart.
- **Employees:** FOM104D's definition changes in 2003 to exclude suspended employment contracts from the daily counts. Its long-run decline should carry a definition-change note.

Sources: [LOC101B](http://statistici.insse.ro:8077/tempo-ins/matrix/LOC101B?lang=ro), [POP201D](http://statistici.insse.ro:8077/tempo-ins/matrix/POP201D?lang=ro), [POP206D](http://statistici.insse.ro:8077/tempo-ins/matrix/POP206D?lang=ro), [FOM104D](http://statistici.insse.ro:8077/tempo-ins/matrix/FOM104D?lang=ro).

### 5. Make the time references and trend prose precise

| Current wording | Assessment / suggested wording |
| --- | --- |
| “Din 1990 până azi” | Observed endpoints are 2024 or 2025, not September 2026. Prefer “Din 1990 până la ultimele date disponibile”. The individual comparison rows already show their years. |
| “Din 1992, în fiecare an…” | Verified for **1992–2025**. Say “În fiecare an din 1992 până în 2025…”; derive the endpoint from the available common period. |
| “Vârsta medie a populației după domiciliu, 2025” | POP110A is a **1 July** snapshot. Prefer “Vârsta medie a populației după domiciliu la 1 iulie 2025”. |
| Life-expectancy explanation uses “născut acum” / “mortalitatea de azi” | The concept is sound, but the data refer to a historical reference period. Prefer “Un nou-născut, dacă mortalitatea pe vârste ar rămâne cea din anul de referință.” |
| “Primim mai mulți turiști” (rendered Zeus page) | Ambiguous without a comparison window, and contrary to the latest annual movement: arrivals fall from **14,569,794 in 2024 to 14,258,382 in 2025**, **−2.14%**. A long-run statement needs its base year. This sentence was not present in the audited local page source. |
| “Locuri de muncă salariate” | FOM104D measures the **average number of employees**, with part-time employees weighted by contracted working time. Prefer “Salariați, număr mediu anual, la locul de muncă”. It is not a vacancy or total-employment measure. |
| “Județele care pierd populație… an de an” | Verified for all five named counties over POP107D **1992–2026**. Add “populație după domiciliu” to keep the concept explicit. |

Sources: [POP110A](http://statistici.insse.ro:8077/tempo-ins/matrix/POP110A?lang=ro), [POP217A](http://statistici.insse.ro:8077/tempo-ins/matrix/POP217A?lang=ro), [TUR104E](http://statistici.insse.ro:8077/tempo-ins/matrix/TUR104E?lang=ro), [FOM104D](http://statistici.insse.ro:8077/tempo-ins/matrix/FOM104D?lang=ro), [POP107D](http://statistici.insse.ro:8077/tempo-ins/matrix/POP107D?lang=ro).

### 6. Correct an exact boundary label in the locality legend

The housing layer's highest category is labelled **“peste 81”**, but `stepIn` in `uat-map-scales.ts` assigns **81 itself** to that category. Ștefănești (SIRUTA 13392) and Lumina (63152) both have exactly 81 completed dwellings in the snapshot.

**Recommendation:** label that category “81 sau mai mult” / “≥81”, and make open/closed boundaries explicit in the shared interval representation. County and signed-balance scales use different boundary rules; do not change every upper label blindly.

This is a small legend wording error, not an error in either locality's underlying value.

## Inventory of the curated indicators

### National rows

| Series | Main-page value | Verdict |
| --- | --- | --- |
| FOM104D, average employees | 5,453,155, 2024 | Latest source period and value match. Workplace allocation is correct. |
| POP217A, life expectancy | 77.45 years, 2025 | Latest value matches; revise the 2023 chart point and “today” explanation. |
| LOC101B, existing dwellings | 10,177,161, 2025 | Matches; means **end of year**, includes census recalculation. |
| TUR104E, tourist arrivals | 14,258,382, 2025 | Matches; arrivals are not a deduplicated count of unique visitors. The source includes apartments/rooms in revised 2021–2022 data and covers establishments with at least five bed places. |
| POP201D, live births | 145,725, 2025 | Latest matches; revise 2023 and explain the scope break. |
| POP206D, deaths | 239,691, 2025 | Latest matches; revise 2023 and explain the scope break. |

The four headline indicators and their source freshness are covered in finding 1. “Registered unemployment” is correctly distinguished from the labour-force-survey unemployment rate. The resident-population headline is correctly distinguished from domicile population on the locality map.

### County layers

All 42 county values for each layer match current INS at the selected period.

| Layer | National reference | Definition / legend assessment |
| --- | --- | --- |
| POP217A | 77.45 years, 2025 | Life expectancy at birth; reference-period wording needs adjustment. Vâlcea 82.01 is actually published, not a client calculation error. |
| FOM106E | 4,959 lei, 2024 | Annual measure of monthly average net earnings. Add “media anului” to distinguish it from the monthly headline. |
| CON103H | 83,437.3 lei per inhabitant, 2023 | Correct GDP-per-capita/current-price series. Whole-lei rounding to 83,437 is presentation only. |
| SOM103A | 3.3%, 2025 | Registered unemployment. All 34 overlapping annual values equal December SOM103B; therefore consistent with a year-end interpretation, not an annual average. The inspected metadata did not explicitly state year-end, so verify that wording against the methodological publication before changing it. |
| POP215A | −4.4‰, 2025 | Correct official natural-increase rate. Its population denominator is **domicile population at 1 July**, not the resident headline. Add that distinction. |
| POP110A | 43.1 years, 2025 | Mean age by domicile at **1 July**. Vâlcea 47.0 and Ilfov 39.9 match the source. |

County colour thresholds are calculated by the application relative to the published national reference. They are not official INS “good/bad” categories. The units and reference values are appropriate for the selected cells; higher age/unemployment use reversed colours as a design choice.

Sources: each code's captured live metadata and `county-<code>.csv` in the evidence bundle; [CON103H](http://statistici.insse.ro:8077/tempo-ins/matrix/CON103H?lang=ro), [FOM106E](http://statistici.insse.ro:8077/tempo-ins/matrix/FOM106E?lang=ro), [SOM103A](http://statistici.insse.ro:8077/tempo-ins/matrix/SOM103A?lang=ro), [POP215A](http://statistici.insse.ro:8077/tempo-ins/matrix/POP215A?lang=ro).

### Locality layers

| Layer | Snapshot national total | Assessment |
| --- | ---: | --- |
| Population, POP107D | 21,646,220; 1 January 2026 | Value, date, and domicile caveat correct. |
| Natural increase, POP201D − POP206D | −93,966; 2025 | Correct count and subtraction. Nine absent birth cells are treated as zero locally. |
| Domicile moves, POP307A − POP308A | −35,329; 2025 | Correct: 400,238 − 435,567. Includes **international** as well as internal domicile changes. Internal movements alone cannot explain a national negative balance. Add the international scope to the main-page caveat. |
| Average employees, FOM104D | 5,453,155; 2024 | Values reproduce Chronos; prefer the source's employee terminology. |
| Completed dwellings, LOC104B | 59,062; 2025 | Total matches INS. **1,251 UAT zeros are inferred from absent rows**, not explicit source zeros. Aggregates cross-foot, but that does not prove every missing cell is zero. Verify/document the sparse-table contract or disclose the assumption. |
| Domestic-use water, GOS108A / 7416 | 609,743 thousand m³; 2024 | Correct old-period value and unit. New 2025 data exist; fix the missing-data legend separately. |

Snapshot capture date **25 September 2026** is correctly described as the day the application took the figures, but does not establish upstream freshness. The snapshot records the Chronos API as its origin.

Sources: [POP107D](http://statistici.insse.ro:8077/tempo-ins/matrix/POP107D?lang=ro), [POP307A](http://statistici.insse.ro:8077/tempo-ins/matrix/POP307A?lang=ro), [POP308A](http://statistici.insse.ro:8077/tempo-ins/matrix/POP308A?lang=ro), [LOC104B](http://statistici.insse.ro:8077/tempo-ins/matrix/LOC104B?lang=ro), and the sources cited above.

## Suggested order

1. Correct the water absence claim and switch the salary headline to the supported successor.
2. Refresh the stale source periods/revisions through the data pipeline, then rebuild the histories and locality snapshot. No live data refresh was authorized or performed by this audit.
3. Add the census/methodology notes, exact reference dates, population bases, and clearer employee/migration wording.
4. Correct the housing legend's inclusive upper boundary and qualify the tourism trend sentence where it is still deployed.
5. Replace append-only history freshness with a revision-aware refresh process. Confirm missing-row semantics before continuing to present inferred zeroes as reported figures.

## Validation

The project's `check` script passed through **`yarn run check`**: TypeScript and ESLint, zero ESLint warnings. The initial literal `yarn check` invoked Yarn Classic's built-in dependency check instead of the project script and failed on registry DNS; the explicit script invocation avoided that ambiguity. No application tests were added or source files modified for this audit.
