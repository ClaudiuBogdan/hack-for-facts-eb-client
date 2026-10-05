# National budget page — two variants

Brief (owner, 2 October 2026): one national budget page, the explorer kept
separate, both variants built on the reviewed data handoff
(`docs/design/national-budget/data-handoff-20261002/`). Mocks, labelled; the
API readers are pending.

## One contract, two hierarchies

Both variants read the same feature adapter (`features/national-budget/page`),
the same Zod types (`schemas/national-budget-page.ts`) and the same URL keys
(`edition`, `target`, `scope`, `credit`, `release`, `authority`, `q`,
`question`, `compare`; `demo` for states). Only the order of the information
differs.

- **`panorama` — overview first.** One sentence; the plan and the execution
  side by side, each labelled with what it is (`Aprobat pentru 2025 · Legea
  bugetului 2025, trimisă la Monitorul Oficial` against `Execuție · ian.–dec.
  2025 · buletinul MF`), with one line under them that says whether they
  compare and why (a popover of checks). Then the four budgets of the law (not
  added), what the money was spent on and where it came from (the bulletin's
  lines as a tree), every law since 2019 on one chart (each law's own year as
  the ink line, its forecasts dashed, the chosen law's in navy, the draft
  hollow), the authorities with search and a drilldown sheet, what the data
  covers, one source line.
- **`intrebari` — investigation first.** Three questions as the page's spine
  (tabs): *Ce s-a aprobat?* (the law's printed totals with the printed token,
  the descriptor row and a „Dovada" disclosure: annex, record, field,
  publication, file, version, SHA-256; then the authorities), *Ce s-a
  executat?* (a bulletin as a tree with the printed cell and token; a rail with
  the file, period covered, status, finality, release id and hash), *Ce s-a
  schimbat?* (four comparisons, each with a table and a rail that runs the
  comparability checks). Coverage and the source line close the page.

## Data rules both follow

- Edition and target year stay apart; a forecast is labelled „Estimare pentru
  2026 din bugetul 2025", never merged with another law's approval.
- Totals come from one explicit descriptor row per budget
  (`model/descriptors.ts`); rows are never added. Health's two printed totals
  differ by a few million; one is named, the other is not added to it.
- Units: law amounts ×1000 (thousand lei → lei), execution facts as declared.
- No plan-versus-execution rate: the laws are the versions sent to the
  Monitorul Oficial, not the final credits after rectifications
  (`model/comparability.ts`). The two figures stand side by side.
- No BGC plan: the laws approve four separate budgets.
- Authority codes are the law's codes, not CUIs; the drilldown says that
  linking to ANAF execution needs a reviewed mapping.
- Missing is never zero: `not_in_sample`, `not_in_edition`, `not_extracted`,
  `api_pending`, and the six unpublished bulletin months with their reasons.

## What is real and what is not

| Value | Origin | Mark |
|---|---|---|
| Totals of the seven laws 2019–2025, all target years | real rows of `budget.approved_budget_lines` | none |
| Administrația Prezidențială 2025, first records | real rows | none, „incomplete" note |
| BGC bulletin, December 2025 and July 2026 | real `execution_release_facts` | none |
| Release calendar (241 months, six gaps) | handoff counts and status notes | none |
| March 2026 draft: state credits, 55 authorities, their economic split | static PDF extract, unreviewed | `PROIECT` |
| 2025 authority list except the Presidency | invented (seeded) | `DEMO`, code `Dnn` |

## Open choices for the owner

- Panorama or questions (or the panorama with the questions' evidence rail).
- Whether execution defaults to the plan's year (December, as built) or to
  the latest month (July 2026; the questions variant's execution tab does).
- Whether the comparison of the plan with execution should ever show a
  difference against the initial law, labelled as such, or stay as built
  (both figures, no difference) until rectified credits are served.
