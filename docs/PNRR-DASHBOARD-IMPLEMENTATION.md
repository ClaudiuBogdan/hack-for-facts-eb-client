# PNRR Dashboard Implementation

**Date:** May 2026

The PNRR dashboard uses the official raw JSON files as the source of truth.
The server fetches and caches those files, renders a compact SSR snapshot for
first paint, and exposes same-origin raw endpoints for the browser worker.

## Data Flow

```
Official raw gzip files on Cloudflare
    ↓
SSR raw cache and compact snapshot
    ↓
/api/pnrr/raw/projects, /api/pnrr/raw/payments, /api/pnrr/raw/indicators
    ↓
Browser Web Worker parses, normalizes, groups, filters, sorts, and aggregates
    ↓
React receives only view models, rows, summaries, and selected details
```

## Current Architecture

- `src/server/handlers/pnrr-data-proxy.ts` fetches raw official files, caches
  raw JSON text and gzip bytes, and serves raw same-origin endpoints.
- `src/features/pnrr/seo/pnrr-seo-loader.ts` builds the compact SSR snapshot
  used for header and first-paint metrics.
- `src/features/pnrr/workers/pnrr-data.worker.ts` owns full-data processing in
  the browser: normalization, grouping, filtering, search, pagination,
  beneficiary summaries, map series, anomaly rows, and CSV export.
- `src/features/pnrr/hooks/usePnrrData.ts` exposes worker-backed hooks for
  React view models and detail lookups.
- `src/features/pnrr/lib/data-transform.ts` contains shared pure data helpers
  used by SSR and the worker.

## Data Semantics

- `PnrrProjectRecord` is one official row from `progres_tehnic_proiecte`.
- `PnrrProject` is a grouped project keyed by `id_angajament`.
- Project count is the distinct grouped project count.
- Record count is the raw official row count.
- Listed/contracted values are summed from row-level `valoare_fe`.
- Filters apply to records first, then matching records are regrouped into
  projects for display.

## Endpoints

- `/api/pnrr/raw/projects`
- `/api/pnrr/raw/payments`
- `/api/pnrr/raw/indicators`

These endpoints return `application/json`, set `Vary: Accept-Encoding`, and
serve gzip when the client supports it.
