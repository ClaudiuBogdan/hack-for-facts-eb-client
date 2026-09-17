# Observed report differences: chart gaps

The owner defines monthly/quarterly values as differences between available
cumulative reports. Missing reports stay gaps; real zero and negative differences
stay visible. No new period type or API shape is introduced.

The entity execution adapter now supplies existing missing-period metadata from
the selected period labels and returned points. The commitments dashboard and
execution adapter share the same period-label helper. Rendering, controls and
normalization remain unchanged.

Astra reviewed the change before commit. GLM 5.3 with maximum thinking performed
a security-only review in plan mode with all tools denied; it reported no client
security findings. Focused tests: 42 passed across entity evolution, native
commitments and period utilities. Types and focused lint passed. Commit hooks
run the complete client check.

Release remains coordinated with the server/ETL observed-period changes. This
commit does not certify source completeness or completion of August loading.
