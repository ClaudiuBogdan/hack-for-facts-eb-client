# Feature: Request this dataset

> Domain: statistics · Cross-cutting dialog action (explorer rows, dataset
> detail, indicator/switcher catalog-only states) · High-value next #8
> Consumes: `docs/design/statistics/design.md`, `docs/design/statistics/ux.md`.

## Feature owner profile

Frontend feature implementer (React 19 + shadcn `Dialog`/`Form` + TanStack
Query mutation). Strength: a small accessible form with a submit adapter and
optimistic feedback. Turns the 27-vs-1,871 coverage gap into a prioritization
signal.

## Summary

On any catalog-only dataset, a `RequestDatasetAction` lets a user ask for that
dataset's observations to be loaded. It captures the matrix code, optional
territory/level of interest, and an optional contact/reason, then submits to a
request channel and confirms. This is both a user escape hatch ("I need this
data") and a product input ("which of the ~1,871 to load next").

## Facts, decisions, assumptions

- **Fact:** ~1,871 datasets are `metadata_only`/`PENDING` (UX doc §6); the
  loading pipeline exists server-side (`ins:load-prod --matrix-codes`) but
  loading is operational, not instant.
- **Fact:** A feedback submission path already exists (`useSendFeedback`,
  `src/hooks/useSendFeedback`; `FeedbackFab`). It can back this request channel.
- **Decision:** Build a dedicated, typed request action rather than the generic
  feedback FAB, so requests carry structured fields (matrix code, territory).
  The submit adapter `submitDatasetRequest(payload)` lives under
  `src/features/statistics/request-dataset/api`. **Decision:** default
  implementation routes through the existing feedback/notification channel (reuse
  `useSendFeedback` transport) with a structured payload; if a dedicated endpoint
  later exists, swap inside the adapter only.
- **Decision:** The action is a **`Dialog`**, opened from a `RequestDatasetAction`
  button on catalog-only datasets and via the URL state `?request=<matrixCode>`
  (so explorer/detail deep links can open it directly).
- **Decision:** Available datasets do **not** show the request action (data is
  already loaded). The action is strictly a catalog-only affordance.
- **Assumption:** No auth is required to submit; an optional email field allows
  follow-up. Anonymous submissions are accepted. Marked Assumption — implementer
  confirms whether Clerk identity should be attached when signed in (attach if
  available, never require).
- **Assumption:** Rate-limiting/spam handling is the channel's responsibility;
  the UI debounces double-submits and disables the button while pending.

## Route and URL state

- **No new route.** Dialog state via the host route's search params:
  - `request` — matrix code to request (presence opens the dialog).
  Optional prefill (read-only context, not persisted): the host territory
  (`siruta`) and `level` already in the URL seed the form's "interest" fields.
- **Decision:** Closing the dialog clears `?request`; the URL otherwise stays
  intact.

## Data contract and mock states

```ts
type DatasetRequestPayload = {
  matrixCode: string
  datasetName: string            // resolved Romanian name for context
  interest?: {                   // optional, prefilled from host context
    siruta?: string
    level?: 'LAU' | 'NUTS3' | 'NUTS2' | 'NATIONAL'
  }
  reason?: string                // free text, max ~500 chars
  email?: string                 // optional contact
  locale: 'ro' | 'en'
  source: 'explorer' | 'dataset-detail' | 'territory-hub'
}
type DatasetRequestResult = { ok: true; id?: string } | { ok: false; error: string }
```

Mock states (`src/features/statistics/request-dataset/mocks`):
- **Open from explorer:** matrix code + name prefilled; no territory interest.
- **Open from dataset detail with territory:** interest siruta/level prefilled.
- **Submit success:** confirmation state + "request another" reset.
- **Submit error:** inline error, form values preserved, retry enabled.
- **Validation:** invalid email rejected; reason length capped.

## UI structure

```
<Dialog> (sm:max-w-lg)
  <DialogHeader> "Cere acest set de date"
    subtitle: "{datasetName} ({matrixCode}) nu are încă date încărcate."
  <Form>
    read-only context: matrix code + name + (if present) territory of interest
    <Textarea> "De ce ai nevoie de acest set?" (optional, counter)
    <Input email> "Email pentru notificare (opțional)"
    note: "Cererea ne ajută să prioritizăm ce seturi încărcăm."
  <DialogFooter> [Anulează] [Trimite cererea] (disabled while pending)
  success view: check icon + "Cerere trimisă. Mulțumim!" + [Închide] / [Cere alt set]
```

Trigger surfaces (`RequestDatasetAction` button, Romanian "Cere set"):
- Explorer catalog-only rows; dataset-detail header + observations-empty block;
  hub indicator tiles + time-series switcher catalog-only states.

## Component reuse and proposed new components

- **Reuse:** `Dialog`, `Form`/`form-field`, `Textarea`, `Input`, `Button`,
  `toast` (sonner) for confirmation, `useSendFeedback` transport,
  `useErrorHandler` (`ErrorContext`) for failures.
- **New (domain):** `RequestDatasetAction` (trigger button + badge pairing with
  `DataStatusBadge`), `RequestDatasetDialog`, `submitDatasetRequest` adapter,
  `useDatasetRequest` mutation hook (TanStack `useMutation`).

## Interactions

- Click "Cere set" (or `?request=<code>`) → opens dialog with prefilled context.
- Submit → mutation pending (button disabled, spinner text); on success → success
  view + `toast.success`; on error → inline error + `toast.error`, values kept.
- "Cere alt set" resets the form; "Închide"/Anulează clears `?request`.
- Keyboard: dialog focus-trapped, Esc closes, submit on Enter from inputs.

## Loading, empty, error, partial, stale states

- **Loading (submit):** button shows "Se trimite…", disabled; form read-only.
- **Empty:** not applicable (action always has a target matrix code).
- **Error:** inline error message + retry; `handleError(error, 'dataset-request')`.
- **Success:** confirmation panel; optional email acknowledged ("Te anunțăm când
  e disponibil" only if email provided).
- **Stale:** not applicable.
- **Guard:** if opened for an already-available dataset (stale deep link), show
  "Acest set are deja date" + link to the dataset detail instead of the form.

## Accessibility and i18n

- `Dialog` manages focus, has a labelled heading and close control.
- Form fields labelled; error text associated via `aria-describedby`; email
  validation message announced.
- Trigger buttons have text (not icon-only); pair with `DataStatusBadge` text.
- Romanian labels: "Cere acest set de date", "Cere set", "De ce ai nevoie de
  acest set?", "Email pentru notificare (opțional)", "Trimite cererea",
  "Anulează", "Închide", "Cerere trimisă. Mulțumim!", "Cere alt set",
  "Acest set are deja date", "Te anunțăm când e disponibil",
  "Cererea ne ajută să prioritizăm ce seturi încărcăm."

## Privacy, provenance, source citation

- Collect the **minimum**: matrix code + optional reason/email. Email is optional
  and only used for availability notification; state this in the form. No
  sensitive data. Attach Clerk identity only if already signed in; never require
  it. The request references the dataset by matrix code (provenance-consistent
  with the rest of the domain).

## Acceptance checklist

- [ ] Catalog-only datasets (and only those) expose `RequestDatasetAction`.
- [ ] Dialog opens from buttons and from `?request=<matrixCode>`; context
      prefilled; closing clears the param.
- [ ] Submit goes through `submitDatasetRequest` (reusing the feedback transport
      by default) with the structured payload; success and error states handled.
- [ ] Email optional; anonymous allowed; Clerk identity attached only if present.
- [ ] Stale deep link for an available dataset shows the "already has data" guard.
- [ ] `yarn typecheck` clean; Lingui extracted/compiled; dialog a11y verified.

## Non-goals

- Showing a public request queue/leaderboard or per-dataset request counts
  (could be a later product signal surface).
- Triggering the actual server load pipeline from the client.
- Account-gated requests.

## Open questions (blockers only)

None. The submission transport defaults to the existing feedback channel behind a
swappable adapter; identity attachment is an Assumption with a safe default.
