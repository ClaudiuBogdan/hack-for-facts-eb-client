import { t } from '@lingui/core/macro'
import { Check, X } from 'lucide-react'
import { FIELD, Group, Row, SHEET_CLOSE } from '@/components/filters/filter-sheet/filter-sheet-parts'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import type { LegalEventKind } from '@/schemas/legal'
import type { ChangesState } from '../../lib/legal-changes-address'
import { formatLegalDate } from '../../lib/legal-format'
import { legalEventKindLabel } from '../../lib/legal-vocabulary'

/**
 * The Modificări page's filters (owner, 28 November 2026), in the search's side panel (a sheet on a phone): the kind
 * of change, among the tab's own kinds, and the period of entry into force. „Sursa" is gone: it named our pipeline.
 */

function rangeLabel(since: string | null, until: string | null, locale: string): string {
  if (since !== null && until !== null) return `${formatLegalDate(since, locale)} – ${formatLegalDate(until, locale)}`
  return since !== null ? t`din ${formatLegalDate(since, locale)}` : t`până la ${formatLegalDate(until ?? '', locale)}`
}

export function ChangesActiveFilters({
  state,
  tabKinds,
  onChange,
  locale,
}: {
  readonly state: ChangesState
  readonly tabKinds: readonly LegalEventKind[]
  readonly onChange: (next: ChangesState) => void
  readonly locale: string
}) {
  const chip = (key: string, label: string, clear: () => void) => (
    <button
      key={key}
      type="button"
      onClick={clear}
      aria-label={t`Scoate ${label}`}
      className="group relative inline-flex h-7 items-center gap-1.5 rounded-sm bg-muted pl-2.5 pr-2 text-sm after:absolute after:-inset-y-2 after:inset-x-0 after:content-[''] hover:bg-muted-foreground/20"
    >
      {label}
      <X className="size-3.5 text-muted-foreground group-hover:text-foreground" aria-hidden="true" />
    </button>
  )
  return (
    <div role="group" aria-label={t`Filtre active`} className="flex flex-wrap items-center gap-x-2 gap-y-4">
      {state.kinds.filter((kind) => tabKinds.includes(kind)).map((kind) => chip(kind, legalEventKindLabel(kind), () => onChange({ ...state, kinds: state.kinds.filter((k) => k !== kind) })))}
      {state.since !== null || state.until !== null ? chip('range', rangeLabel(state.since, state.until, locale), () => onChange({ ...state, since: null, until: null })) : null}
      <button
        type="button"
        onClick={() => onChange({ ...state, kinds: [], since: null, until: null })}
        className="relative inline-flex h-7 items-center px-1 text-sm text-muted-foreground underline-offset-4 after:absolute after:-inset-y-2 after:inset-x-0 after:content-[''] hover:text-foreground hover:underline"
      >
        {t`Scoate toate filtrele`}
      </button>
    </div>
  )
}

export function ChangesPanel({
  open,
  onOpenChange,
  returnFocus,
  state,
  tabKinds,
  today,
  onChange,
}: {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly returnFocus: () => void
  readonly state: ChangesState
  readonly tabKinds: readonly LegalEventKind[]
  readonly today: string
  readonly onChange: (next: ChangesState) => void
}) {
  const toggle = (kind: LegalEventKind) => onChange({ ...state, kinds: state.kinds.includes(kind) ? state.kinds.filter((k) => k !== kind) : [...state.kinds, kind] })
  const date = (value: string) => (value === '' ? null : value)
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        closeClassName={SHEET_CLOSE}
        className="w-full overflow-y-auto sm:max-w-md"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          returnFocus()
        }}
      >
        <SheetHeader>
          <SheetTitle>{t`Filtre`}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 divide-y">
          <Group title={t`Felul schimbării`}>
            <div className="grid grid-cols-2 gap-x-1">
              {tabKinds.map((kind) => {
                const on = state.kinds.includes(kind)
                return (
                  <button
                    key={kind}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(kind)}
                    className="flex min-h-11 w-full items-start gap-2.5 rounded-sm px-2 py-3 text-left text-sm leading-5 hover:bg-muted sm:min-h-9 sm:py-2"
                  >
                    <span
                      aria-hidden="true"
                      className={cn('mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[3px] border', on ? 'border-primary bg-primary text-primary-foreground' : 'border-foreground/30 bg-background')}
                    >
                      {on ? <Check className="size-3" strokeWidth={3} /> : null}
                    </span>
                    <span className={cn('min-w-0 break-words', on && 'font-medium')}>{legalEventKindLabel(kind)}</span>
                  </button>
                )
              })}
            </div>
          </Group>
          {state.tab !== 'fara-data' ? (
            <Group title={t`Când intră în vigoare`}>
              <Row label={t`De la`}>
                <input
                  type="date"
                  aria-label={t`De la`}
                  className={FIELD}
                  value={state.since ?? ''}
                  // On the first tab the period ends today at the latest, so it cannot start later.
                  max={state.tab === 'schimbari' ? (state.until !== null && state.until < today ? state.until : today) : (state.until ?? undefined)}
                  onChange={(event) => onChange({ ...state, since: date(event.target.value) })}
                />
              </Row>
              <Row label={t`Până la`}>
                <input
                  type="date"
                  aria-label={t`Până la`}
                  className={FIELD}
                  value={state.until ?? ''}
                  min={state.since ?? undefined}
                  max={state.tab === 'schimbari' ? today : undefined}
                  onChange={(event) => onChange({ ...state, until: date(event.target.value) })}
                />
              </Row>
              {state.tab === 'schimbari' ? <p className="text-xs text-muted-foreground">{t`Perioada privește schimbările intrate deja în vigoare; cele care urmează sunt mereu sus.`}</p> : null}
            </Group>
          ) : (
            <p className="py-4 text-xs text-muted-foreground">{t`Schimbările fără dată nu pot fi alese după perioadă.`}</p>
          )}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button type="button" onClick={() => onOpenChange(false)} className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
            {t`Vezi schimbările`}
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...state, kinds: [], since: null, until: null })}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {t`Scoate toate filtrele`}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
