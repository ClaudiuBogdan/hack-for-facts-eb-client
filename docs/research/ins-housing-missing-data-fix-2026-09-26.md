# Completed housing: missing records and zeroes

The `/ins` locality map previously displayed 1,270 zeroes for completed
dwellings in 2025. Only 19 are zero-valued records in Chronos. The other
1,251 came from treating absent records as zero.

## Evidence

Read-only checks on 2026-09-26 queried Chronos `transparenta_prod`,
`ins.observations`, dataset `LOC104B`, ownership Total (`dim1_member_id = 7982`).
Results were joined to the map's 3,181 SIRUTA codes. Queries ran as
`transparenta_prod_agent_readonly` inside a read-only transaction with a
30-second statement timeout.

| Record in Chronos | 2024 | 2025 |
|---|---:|---:|
| Absent | 1,260 | 1,251 |
| Explicit zero | 16 | 19 |
| Positive value | 1,905 | 1,911 |
| Present but null, negative or flagged | 0 | 0 |

All 1,930 numeric 2025 records match the previous snapshot. Examples of
missing records are Năsturelu (`153400`), Bujoru (`152314`) and Zimnicea
(`151978`). Samarinești (`81656`), Aninoasa (`78604`) and Bărbătești
(`78828`) have explicit zeroes. Absence in the serving database does not
establish whether the original source omitted a true zero or whether data
is unavailable; the client must not infer a number from it.

The bounded query for each year was:

```sql
SELECT territory_siruta_code, value, value_status
FROM ins.observations
WHERE dataset_code = 'LOC104B'
  AND period_start = '2025-01-01' -- also checked 2024-01-01
  AND dim1_member_id = 7982
  AND territory_siruta_code IS NOT NULL;
```

Raw query results, the exact classification and the pre-fix snapshot are in
the ignored task directory `tmp/ins-housing-fix-20260926/`.

## Correction

- Remove the shared completed-housing rule that converted absent records to
  zero. This applies to territory calculations for any year and to future
  map generation.
- Change only the 1,251 inferred zeroes in the current 2025 snapshot to
  missing values. Preserve the 19 numeric zeroes, 1,911 positive values,
  national total of 59,062, county totals and capture date.
- Reuse water's single combined SVG hatch layer for missing values; exclude
  them from rankings. Keep a dedicated grey `0` class even when zeroes are rare.
- Explain missing versus recorded zero in the source note and identify
  unavailable completed-housing data in the tooltip, in Romanian and English.

The other five map series are unchanged. The map continues to display 2025;
2024 was checked for comparison, not substituted for missing 2025 values.

## Validation

- 60 tests pass across the shared calculation, snapshot, map reading,
  scale and territory-rendering suites, including absent/null/zero housing cases in 2024 and 2025.
- `yarn run check` passes (TypeScript and ESLint); Lingui extraction and
  compilation pass, and both new messages are translated.
- Exact snapshot comparison confirms only the intended housing cells and
  their missing reasons changed; all other values and metadata are preserved.
- Local browser review confirms hatching, the separate zero class, the
  explicit UAT-count key, the unchanged national total and explanatory copy.

Opus 5.5 approved the correction. Its follow-up suggestions were applied:
the zero-display policy lives in series metadata, and the territory-rendering
suite was added to validation. The user then requested an explicit UAT count in the legend: housing now
reads `1.251 de UAT-uri fără date`, with singular/plural forms and English
translation. Opus 5.5 also approved the final wording with no actionable findings.
