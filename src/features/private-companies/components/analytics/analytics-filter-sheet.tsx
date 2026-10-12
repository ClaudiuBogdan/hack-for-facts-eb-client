import { t } from '@lingui/core/macro'
import { keepEscapeForOpenList } from '@/components/filters/filter-sheet/filter-sheet-focus'
import { Group, Row, SHEET_CLOSE, TALL } from '@/components/filters/filter-sheet/filter-sheet-parts'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useWindowSize } from '@/hooks/useWindowSize'
import { cn } from '@/lib/utils'
import { offeredMetricsIn, releaseOffersActivity, type CompanyAnalysisRelease, type CompanyAnalysisScope, type CompanyAnalysisStats } from '@/schemas/company-analytics'
import type { ResolvedQuestion } from '../../api/company-analytics-plan'
import type { UatIndex } from '../../hooks/use-uat-index'
import { keyToggled, toggled } from '../../lib/company-analytics-filter-model'
import { countText, localeOf } from '../../lib/company-analytics-format'
import { filterCount, withScope, type CompanyAnalyticsState } from '../../lib/company-analytics-url'
import { FiscalYearSelect, MeasureSelect } from './analytics-choices'
import { ActivityField, CaenField, CodesField, CompanyField, CountyField, FilingField, FlagField, OnrcField, RangeField, SizeField, UatField } from './analytics-filter-fields'

/** Escape in an open list, or in a list's search with words in it, is the field's: it clears them; the sheet closes on the next. */
function keepEscapeForSearch(event: KeyboardEvent) {
  keepEscapeForOpenList(event)
  const active = document.activeElement
  if (active instanceof HTMLInputElement && active.dataset.clearsOnEscape === 'true') event.preventDefault()
}

/** A dropdown in a panel's row: the row's full width, as tall as its fields. */
const ROW_CHOICE = 'h-11 w-full rounded-none px-2.5 text-sm shadow-none sm:h-10'

/**
 * Every filter the question takes, in one panel, in a sheet: from the right
 * on a wide screen, from the bottom on a phone. Seven groups — first the
 * financial situation (the fiscal year and the measure, as in the head, then
 * a range of values, starting on that measure, the filing and the size),
 * then which companies, where (the edition's common value), what they are,
 * what one ONRC entry observes, what ANAF observed — each row
 * a label and its control; a change applies at once (the address is the
 * state). OR within a field, AND across fields.
 */
export function AnalyticsFilterSheet({
  state,
  release,
  question,
  stats,
  uats,
  statusNames,
  locale,
  open,
  onOpenChange,
  onChange,
}: {
  readonly state: CompanyAnalyticsState
  readonly release: CompanyAnalysisRelease | undefined
  readonly question: ResolvedQuestion | null
  readonly stats: CompanyAnalysisStats | undefined
  readonly uats: UatIndex
  /** Observed status names by code, where read (the year's population). */
  readonly statusNames: ReadonlyMap<string, string>
  readonly locale: string
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onChange: (next: CompanyAnalyticsState) => void
}) {
  const { width } = useWindowSize()
  const phone = width > 0 && width < 640
  const scope = state.scope
  const set = (next: CompanyAnalysisScope) => onChange(withScope(state, next))
  const count = filterCount(scope)
  const limits = release?.limits
  const year = question?.year ?? release?.defaults.fiscalYear ?? null
  // The derived activity where the release has it — and wherever the address already filters on it, so it can be cleared.
  const activity = (release ? releaseOffersActivity(release) : false) || Boolean(scope.activity || scope.activityBasis)
  const metric = question?.metric ?? state.metric ?? release?.defaults.metric ?? null
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={phone ? 'bottom' : 'right'}
        onOverlayClick={() => onOpenChange(false)}
        onEscapeKeyDown={keepEscapeForSearch}
        closeClassName={SHEET_CLOSE}
        className={cn('flex flex-col gap-0 p-0', phone ? 'max-h-[90vh] rounded-t-2xl' : 'w-full sm:max-w-md')}
      >
        <div className="flex items-baseline gap-2 border-b px-4 py-3">
          <SheetTitle className="text-base font-semibold">{t`Filtre`}</SheetTitle>
          {count > 0 ? <span className="bg-primary px-1.5 text-xs tabular-nums text-primary-foreground">{count}</span> : null}
        </div>
        <div className="min-h-0 flex-1 divide-y divide-border/70 overflow-y-auto px-4 py-4">
          {year !== null && release ? (
            <Group title={t`Situația financiară`}>
              <Row label={t`Anul fiscal`}>
                <FiscalYearSelect release={release} year={year} onChange={(next) => onChange({ ...state, year: next })} triggerClassName={ROW_CHOICE} />
              </Row>
              {metric ? (
                <Row label={t`Indicator`}>
                  <MeasureSelect release={release} year={year} metric={metric} onChange={(next) => onChange({ ...state, metric: next })} triggerClassName={ROW_CHOICE} />
                </Row>
              ) : null}
              <RangeField scope={scope} offered={offeredMetricsIn(release, year)} preferred={metric} max={limits?.maxFinancialRanges ?? 6} onChange={set} />
              <FilingField scope={scope} year={year} onChange={set} />
              <SizeField scope={scope} onChange={set} />
            </Group>
          ) : null}
          <Group title={t`Ce firme`}>
            <CompanyField scope={scope} max={limits?.maxSelectedCuis ?? 500} source={release?.release.source ?? null} onChange={set} />
          </Group>
          <Group title={t`Unde au sediul (valoarea comună din ediția ONRC)`}>
            <CountyField scope={scope} onChange={set} />
            <UatField scope={scope} uats={uats} onChange={set} />
          </Group>
          <Group title={t`Ce sunt`}>
            <CodesField label={t`Formă juridică`} dimension="LEGAL_FORM" question={question} open={open} values={scope.legalForms ?? []} onToggle={(code) => set({ ...scope, legalForms: toggled(scope.legalForms, code) })} />
            <CodesField
              label={t`Stare comună ONRC`}
              dimension="OBSERVED_STATUS"
              question={question}
              open={open}
              values={scope.observedStatus?.in ?? []}
              unknown={scope.observedStatus?.includeUnknown}
              onToggle={(code) => set({ ...scope, observedStatus: keyToggled(scope.observedStatus, code) })}
              onUnknown={() => set({ ...scope, observedStatus: keyToggled(scope.observedStatus, null) })}
              note={t`Starea observată e cea mai avansată stare văzută în registru, nu dovada că firma e activă azi.`}
            />
            <p className="text-xs text-muted-foreground">{t`Starea comună e cea pe care o au toate înscrierile firmei din ediția ONRC; nu e dovada că firma e activă azi. Pentru „are o înscriere cu starea 1048", folosește observațiile ONRC de mai jos.`}</p>
            <CaenField scope={scope} max={limits?.maxCaenCodes ?? 200} onChange={set} />
          </Group>
          {activity ? (
            <Group title={t`Activitatea selectată (derivată, prioritate ONRC)`}>
              <ActivityField scope={scope} max={limits?.maxCaenCodes ?? 200} onChange={set} />
            </Group>
          ) : null}
          <Group title={t`Observații ONRC (pe aceeași înscriere)`}>
            <OnrcField
              scope={scope}
              limits={{ statuses: limits?.maxObservedStatuses ?? 60, counties: limits?.maxCounties ?? 60, caen: limits?.maxCaenCodes ?? 200, legalForms: limits?.maxLegalForms ?? 30 }}
              statusNames={statusNames}
              onChange={set}
            />
          </Group>
          <Group title={t`Ce a observat ANAF`}>
            <FlagField label={t`Plătitor de TVA`} values={scope.vatPayer} onChange={(vatPayer) => set({ ...scope, vatPayer })} />
            <FlagField
              label={t`Inactiv fiscal`}
              values={scope.fiscallyInactive}
              onChange={(fiscallyInactive) => set({ ...scope, fiscallyInactive })}
              note={t`„Necunoscut" înseamnă că ANAF nu are o observație: nu e citit ca „nu".`}
            />
          </Group>
        </div>
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 border-t px-4 py-3">
          <button type="button" onClick={() => set({})} disabled={count === 0} className={cn(TALL, 'border px-3 text-sm hover:bg-muted disabled:opacity-40')}>
            {t`Șterge tot`}
          </button>
          <button type="button" onClick={() => onOpenChange(false)} className={cn(TALL, 'bg-primary px-3 text-sm font-medium tabular-nums text-primary-foreground hover:bg-primary/90')}>
            {stats ? t`Arată ${countText(stats.companies, localeOf(locale))} firme` : t`Arată`}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
