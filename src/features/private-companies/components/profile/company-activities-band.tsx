import { useCallback, useState } from 'react'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import type { CompanyAnalysisCaen } from '@/schemas/company-analytics'
import type { PrivateCompanyActivitySelection, PrivateCompanyProfile } from '@/schemas/private-company'
import { activityRowStateText, activitySelectionTexts, truncatedObservationsText } from '../../lib/company-activity-text'
import { caenDescriptionLines } from '../../lib/company-analytics-text'
import { mainBadgeText, sameCodeAsAnafText } from '../../lib/company-main-activity-text'
import { caenEdition, withAnafWithdrawnSeen, withOwningCompanyRefused, type ActivityGroup, type CompanyProfileModel } from '../../lib/company-profile-model'
import { CaenDescription } from '../caen-description'
import { CompanyMainActivity } from './company-main-activity'
import { HubInfoNote } from '../hub/hub-info-note'
import { ProfileBand, ROW_LINK_CLASS } from './company-profile-band'

const TITLE_ID = 'company-activities-title'

function MainActivity({ model, className }: { readonly model: CompanyProfileModel; readonly className?: string }) {
  const { mainActivity } = model
  if (!mainActivity) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        <Trans>ANAF nu are un cod CAEN fiscal pentru firmă.</Trans>
      </p>
    )
  }
  const { code, revision, label, registry } = mainActivity
  const edition = revision ? caenEdition(revision) : null
  return (
    <div className={cn('border-l-2 border-primary pl-4', className)}>
      <span className="block text-xs font-medium text-primary">
        <Trans>Cod CAEN fiscal ANAF · {mainActivity.code}</Trans>
      </span>
      <p className="mt-2 text-lg font-semibold leading-snug text-foreground">{label ?? <Trans>Codul CAEN {code}</Trans>}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {edition ? (
          <Trans>Din datele fiscale ANAF, CAEN {edition}. O observație din sursă, nu o activitate principală.</Trans>
        ) : (
          <Trans>
            Din datele fiscale ANAF: o observație din sursă, nu o activitate principală. ANAF nu publică revizia CAEN, iar aceleași cifre pot
            însemna activități diferite în revizii diferite, așa că nu îi dăm o denumire.
          </Trans>
        )}
      </p>
      {label === null
        ? registry.map((entry, index) => (
            <p key={`${entry.revision}-${String(index)}`} className="mt-1 text-sm text-muted-foreground">
              <Trans>
                Ediția ONRC are înscris {code} (CAEN {caenEdition(entry.revision)}): {entry.label}.
              </Trans>
            </p>
          ))
        : null}
    </div>
  )
}

/**
 * The derived selection, in one layout whatever its state: what was selected
 * (an ONRC class with its own exact label; ANAF's fiscal code with the
 * catalog's text only where every revision agrees, its revision unpublished;
 * or nothing selected, said quietly), its code and source once beneath it,
 * why in a line, and how — each source's date, the edition's counts — a tap
 * away. With several classes and none selected, the title alone: the
 * classes are listed beside it, and why (what ANAF's code says beside them)
 * sits with how, behind the title's info button.
 */
function ActivitySelection({
  selection,
  className,
  lead = false,
}: {
  readonly selection: PrivateCompanyActivitySelection
  readonly className?: string
  /** The band's answer: no rule beside it, the title at the answer's size. */
  readonly lead?: boolean
}) {
  const texts = activitySelectionTexts(selection)
  const incomplete = selection.caenCoverage === 'partial' || selection.caenCoverage === 'unresolved'
  const selected = selection.code !== null
  // Several classes, none selected: the list beside says them; why sits with how, a tap away.
  const quiet = !selected && selection.basis === 'onrc_multiple_classes'
  const meta = selectionMeta(selection)
  const how = (
    <HubInfoNote label={quiet ? t`De ce nu e selectată niciuna` : t`Cum a fost selectată`}>
      {texts.agreement ? <p>{texts.agreement}</p> : null}
      {incomplete ? null : <p data-testid="company-activity-selection-coverage">{texts.coverage}</p>}
      <p>{texts.counts}</p>
      <p data-testid="company-activity-selection-dates">{texts.dates}</p>
    </HubInfoNote>
  )
  return (
    <div className={cn(!lead && 'border-l-2 pl-4', !lead && (selected ? 'border-primary' : 'border-border'), className)} data-testid="company-activity-selection">
      <span className={cn('block text-xs', lead ? 'text-muted-foreground' : 'font-medium text-primary')}>{texts.kicker}</span>
      <div
        className={cn(
          'mt-2 font-semibold',
          lead ? 'text-2xl leading-tight tracking-tight sm:text-[1.75rem]' : 'text-lg leading-snug',
          selected ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        <SelectionTitle selection={selection} />
        {quiet ? <> {how}</> : null}
      </div>
      {meta ? <span className="mt-1.5 block text-xs leading-relaxed text-muted-foreground">{meta}</span> : null}
      {quiet ? null : (
        <p className="mt-2 text-sm text-muted-foreground">
          {texts.basis} {how}
        </p>
      )}
      {/* A list that may be incomplete changes how the selection reads: said in the open. */}
      {incomplete ? (
        <p className="mt-3 text-xs leading-relaxed text-foreground" data-testid="company-activity-selection-coverage">
          {texts.coverage}
        </p>
      ) : null}
    </div>
  )
}

/** Under the title, once: the selected code with its revision and source; nothing when nothing is selected. */
function selectionMeta(selection: PrivateCompanyActivitySelection): string | null {
  const { code, revision } = selection
  if (code === null) return null
  // ANAF's described code already shows its code and unpublished revision in the title: only the source is added.
  if (selection.source === 'anaf') return anafDescribed(selection) ? t`Cod CAEN fiscal ANAF` : t`Cod CAEN fiscal ANAF · revizie nepublicată`
  // An ONRC title without a name is the code itself: not said twice.
  const named = Boolean(selection.label)
  const edition = revision ? caenEdition(revision) : null
  if (named) return edition ? t`${code} · CAEN ${edition} · ediția ONRC` : t`${code} · ediția ONRC`
  return edition ? t`CAEN ${edition} · ediția ONRC` : t`Ediția ONRC`
}

function SelectionTitle({ selection }: { readonly selection: PrivateCompanyActivitySelection }) {
  const { code } = selection
  if (code === null) return selection.basis === 'onrc_multiple_classes' ? <Trans>Nicio activitate selectată</Trans> : <Trans>Nicio selecție calificată</Trans>
  if (selection.source === 'onrc') return <>{selection.label || <Trans>Codul CAEN {code}</Trans>}</>
  // ANAF: the catalog's text as candidates of catalog revisions, never as the company's revision.
  const caen = anafCaen(selection)
  return caen ? <CaenDescription caen={caen} /> : <Trans>Codul CAEN {code}</Trans>
}

/**
 * ANAF's code as the catalog describes it — where its revisions agree or are
 * listed apart, and the catalog has a line to show; otherwise null, and the
 * title is the code.
 */
function anafCaen(selection: PrivateCompanyActivitySelection): CompanyAnalysisCaen | null {
  const { code } = selection
  if (code === null || selection.basis !== 'anaf_fiscal_code') return null
  if (selection.descriptionStatus !== 'consensus' && selection.descriptionStatus !== 'conflict') return null
  const caen: CompanyAnalysisCaen = {
    code,
    revision: null,
    basis: 'REVISION_UNKNOWN',
    label: selection.label,
    descriptionStatus: selection.descriptionStatus === 'consensus' ? 'CONSENSUS' : 'CONFLICT',
    descriptions: selection.descriptions.map((entry) => ({ revision: entry.revision, label: entry.label })),
  }
  return caenDescriptionLines(caen).length > 0 ? caen : null
}

function anafDescribed(selection: PrivateCompanyActivitySelection): boolean {
  return anafCaen(selection) !== null
}

/** A revision as the page names it: its edition, or the plain fact that the row names none. */
function revisionName(revision: string | null): string {
  return revision ? `CAEN ${caenEdition(revision)}` : t`Fără revizie CAEN`
}

/** The registry's spread: the top domains in the county map's five navy steps, darkest first; the rest one grey. */
const SPREAD_STEPS = ['bg-choropleth-5', 'bg-choropleth-4', 'bg-choropleth-3', 'bg-choropleth-2', 'bg-choropleth-1'] as const
const SPREAD_REST = 'bg-muted-foreground/25'

/** The division an ONRC key sits in, in its own revision; null without a key. */
function groupKeyOf(model: CompanyProfileModel, key: { readonly code: string | null; readonly revision: string | null } | null): string | null {
  if (!key || key.code === null) return null
  const division = key.code.slice(0, 2)
  return model.activities.groups.find((group) => group.division === division && group.revision === key.revision)?.key ?? null
}

/**
 * The domain the band's answer sits in, and what to call it: the presumed main activity's ONRC counterpart where
 * the band leads with it (`presumedFirst`), else the selection's class (ONRC only).
 */
function markedGroup(model: CompanyProfileModel, presumedFirst: boolean): { readonly key: string | null; readonly presumed: boolean } {
  const view = model.assumedMain
  if (presumedFirst && view.kind === 'assigned' && view.activity.resolved) {
    return { key: groupKeyOf(model, view.activity.resolved), presumed: true }
  }
  const { selection } = model
  if (!selection || selection.source !== 'onrc') return { key: null, presumed: false }
  return { key: groupKeyOf(model, selection), presumed: false }
}

/**
 * „Ce face firma" (owner, 25 November 2026: „I would like a design. Rethink
 * the section"; „Only the presumed main"). The band answers once, then shows
 * the registry's spread.
 *
 * - The answer, left (`PresumedFirst`): ANAF's presumed main activity
 *   (`CompanyMainActivity`) — its name, one description that says it is
 *   presumed, how it was derived behind ⓘ — never called a registered
 *   principal activity. The derived selection the analysis groups by is said
 *   in one quiet line only where it differs; it is the answer only where ANAF
 *   gives no presumed activity. The presumed block stays mounted in every
 *   case: it reads on load (its history, the analysis link).
 * - The spread, right (`ActivitySpread`): how many activities in how many
 *   domains, in a sentence; one strip of every domain as wide as its
 *   activities, the five largest in the navy steps and the rest grey; the
 *   domains ranked with an inline bar keyed to the strip, each opening on its
 *   activities (the API's main badge and same-code hint on its rows); the
 *   answer's domain marked and always listed; the notes behind one ⓘ, the
 *   cut-list line in the open.
 *
 * Once a history row reports ANAF's source withdrawn, every ANAF field goes
 * at once (`withAnafWithdrawnSeen`) here and, through `onAnafWithdrawn`, in
 * the page's head; once the company is reported no longer public, the main
 * block and the rows' flags go (`withOwningCompanyRefused`) and the page's
 * privacy path is told (`onCompanyGone`).
 */
export function CompanyActivitiesBand({
  model: served,
  index,
  onCompanyGone,
  onAnafWithdrawn,
}: {
  readonly model: CompanyProfileModel
  /** The band's numbered caption; none on a page that numbers no band. */
  readonly index?: string
  /** The page's privacy path for a dependent read that found the company gone (`useProfileRegistryScope`). */
  readonly onCompanyGone?: () => void
  /** Told when a history row reports ANAF's source withdrawn, so the page's head drops the activity at once too. */
  readonly onAnafWithdrawn?: (identity: string) => void
}) {
  const [anafWithdrawnUnder, setAnafWithdrawnUnder] = useState<string | null>(null)
  const [refusedAnswer, setRefusedAnswer] = useState<PrivateCompanyProfile | null>(null)
  const model = withOwningCompanyRefused(withAnafWithdrawnSeen(served, anafWithdrawnUnder), refusedAnswer)
  const answer = served.profile
  const onCompanyNotPublic = useCallback(() => {
    setRefusedAnswer(answer)
    onCompanyGone?.()
  }, [answer, onCompanyGone])
  const onWithdrawn = useCallback(
    (identity: string) => {
      setAnafWithdrawnUnder(identity)
      onAnafWithdrawn?.(identity)
    },
    [onAnafWithdrawn],
  )
  return (
    <ProfileBand id="activitati" titleId={TITLE_ID}>
      <HubSectionHead titleId={TITLE_ID} index={index} title={<Trans>Ce face firma</Trans>} />
      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="min-w-0 lg:col-span-5">
          <PresumedFirst model={model} onAnafWithdrawn={onWithdrawn} onCompanyNotPublic={onCompanyNotPublic} />
        </div>
        {model.activities.total > 0 ? (
          <div className="min-w-0 lg:col-span-7">
            <ActivitySpread model={model} />
          </div>
        ) : null}
      </div>
    </ProfileBand>
  )
}

/** How widely the company is registered: a sentence, the strip, the ranked domains, the notes. */
function ActivitySpread({ model, limit = 6 }: { readonly model: CompanyProfileModel; readonly limit?: number }) {
  const strip = true
  const [open, setOpen] = useState<string | null>(null)
  const [all, setAll] = useState(false)
  const { groups: served, total, revision, byRevision } = model.activities
  // Domains largest first, across revisions (a division in two revisions is two domains, as the registry lists
  // them); the rows that are no class — unqualified or unassessed observations — close the list, never a domain.
  const classes = served.filter((group) => group.kind === 'class').sort((a, b) => b.activities.length - a.activities.length)
  const groups = [...classes, ...served.filter((group) => group.kind !== 'class')]
  const largest = groups.reduce((most, group) => Math.max(most, group.activities.length), 1)
  const marked = markedGroup(model, true)
  const selected = marked.key
  // A domain's colour by its rank among the domains; observations that are no class have none (they are not in the strip).
  const tone = (group: ActivityGroup) => {
    const rank = classes.indexOf(group)
    return rank === -1 ? 'bg-transparent' : (SPREAD_STEPS[rank] ?? SPREAD_REST)
  }
  // The answer's domain is always in the list: under the largest ones, in its rank, when it is not among them.
  const top = groups.slice(0, limit)
  const pinned = selected !== null && !top.some((group) => group.key === selected) ? groups.find((group) => group.key === selected) : undefined
  const shown = all ? groups : pinned ? [...top, pinned] : top
  const nomenclature = revision ? ` (CAEN ${caenEdition(revision)})` : ''
  const headed = revision === null
  const domainCount = classes.length
  const summary = plural(domainCount, { one: 'într-un domeniu', few: 'în # domenii', other: 'în # de domenii' })
  return (
    <div data-testid="company-activity-spread">
      <p className="text-base text-foreground">
        {plural(total, { one: 'O activitate autorizată', few: '# activități autorizate', other: '# de activități autorizate' })} {summary}.
      </p>
      {strip ? (
        // One whole: every domain as wide as its activities. A picture; the list under it says the same.
        <div className="mt-4 flex h-7 gap-px overflow-hidden rounded-sm bg-border/60" aria-hidden="true" data-testid="company-activity-strip">
          {classes.map((group) => (
            <span
              key={group.key}
              className={cn('min-w-px', tone(group), group.key === selected && 'ring-2 ring-inset ring-foreground')}
              style={{ flexGrow: group.activities.length, flexBasis: 0 }}
              title={`${group.label}: ${String(group.activities.length)}`}
            />
          ))}
        </div>
      ) : null}
      <ul className="mt-5 divide-y divide-border/70 border-y border-border/70">
        {shown.map((group) => {
          const index = groups.indexOf(group)
          const expanded = open === group.key
          const panelId = `company-activities-${String(index)}`
          const count = group.activities.length
          return (
            <li key={group.key}>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpen(expanded ? null : group.key)}
                className={cn('grid w-full grid-cols-[0.75rem_2rem_minmax(0,1fr)_2.5rem] items-start gap-x-3 py-2.5 text-left', ROW_LINK_CLASS)}
              >
                <span className={cn('mt-1.5 size-2.5 rounded-[2px]', strip ? tone(group) : 'bg-transparent')} aria-hidden="true" />
                <MonoLabel className="pt-1 tabular-nums text-muted-foreground">{group.division ?? ''}</MonoLabel>
                <span className="min-w-0">
                  <span className="text-sm leading-snug text-foreground">{group.label}</span>
                  {group.key === selected ? (
                    <span className="ml-2 inline-block rounded-sm border border-primary/40 px-1.5 text-xs font-medium text-primary">
                      {marked.presumed ? <Trans>aici e activitatea principală presupusă</Trans> : <Trans>aici e activitatea selectată</Trans>}
                    </span>
                  ) : null}
                  {headed ? <span className="ml-2 text-xs text-muted-foreground">{revisionName(group.revision)}</span> : null}
                  <span className="mt-1.5 block h-1 bg-muted/70" aria-hidden="true">
                    <span className="block h-full bg-primary/60" style={{ width: `${Math.max(2, (count / largest) * 100).toFixed(1)}%` }} />
                  </span>
                </span>
                <span className="pr-1 text-right text-sm tabular-nums text-muted-foreground">{count}</span>
              </button>
              {expanded ? (
                <ul id={panelId} className="mb-3 ml-[3.75rem] space-y-1.5 border-l pl-3">
                  {group.activities.map((activity, row) => (
                    // A row may repeat (the transport carries no row identifier): its position keeps it.
                    <li key={`${activity.code}-${String(row)}`} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-2 text-sm">
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">{activity.code}</span>
                      <span className="text-muted-foreground">
                        {activity.label ?? activityRowStateText(activity.classState)}
                        {activity.isMainCaen === true ? (
                          <span className="ml-2 inline-block rounded-sm border border-primary/40 px-1.5 text-xs font-medium text-primary" data-testid="company-activity-main-badge">
                            {mainBadgeText()}
                          </span>
                        ) : activity.matchesAssumedMainCode === true ? (
                          <span className="ml-2 inline-block text-xs text-muted-foreground" data-testid="company-activity-same-code-hint">
                            · {sameCodeAsAnafText()}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          )
        })}
      </ul>
      {groups.length > limit ? (
        <button
          type="button"
          aria-expanded={all}
          onClick={() => setAll((current) => !current)}
          className="mt-3 inline-flex min-h-9 items-center text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          {all ? <Trans>Doar primele {limit} domenii</Trans> : plural(groups.length, { one: 'Un domeniu', few: 'Toate cele # domenii', other: 'Toate cele # de domenii' })}
        </button>
      ) : null}
      {model.registry.observationsTruncated ? (
        <p className="mt-4 text-xs text-muted-foreground" data-testid="company-activities-truncated">
          {model.selection ? truncatedObservationsText(model.selection.observationCount, total) : t`Lista e scurtată: ediția are mai multe înscrieri decât cele afișate aici.`}
        </p>
      ) : null}
      <p className="mt-3 text-xs text-muted-foreground">
        <Trans>Din registrul comerțului, ediția ONRC afișată.</Trans>{' '}
        <HubInfoNote label={t`Despre lista activităților`}>
          {model.registry.observationsTruncated ? null : (
            <p>
              {revision !== null
                ? plural(total, {
                    one: `O activitate autorizată în registrul comerțului${nomenclature}.`,
                    few: `# activități autorizate în registrul comerțului${nomenclature}.`,
                    other: `# de activități autorizate în registrul comerțului${nomenclature}.`,
                  })
                : byRevision.length > 1
                  ? plural(total, {
                      one: 'O activitate înscrisă în registrul comerțului.',
                      few: '# înscrieri de activități în registrul comerțului, pe revizii CAEN; aceeași activitate poate apărea în mai multe revizii.',
                      other: '# de înscrieri de activități în registrul comerțului, pe revizii CAEN; aceeași activitate poate apărea în mai multe revizii.',
                    })
                  : plural(total, {
                      one: 'O activitate înscrisă în registrul comerțului, fără revizie CAEN.',
                      few: '# activități înscrise în registrul comerțului, fără revizie CAEN.',
                      other: '# de activități înscrise în registrul comerțului, fără revizie CAEN.',
                    })}
            </p>
          )}
          {byRevision.length > 1 ? <p>{byRevision.map((entry) => `${revisionName(entry.revision)}: ${String(entry.count)}`).join(' · ')}</p> : null}
          <p>
            <Trans>
              Denumirile sunt din nomenclatorul CAEN curent al platformei, pe revizia fiecărei înscrieri; o înscriere fără revizie cunoscută nu are
              denumire.
            </Trans>
            {groups.some((group) => group.activities.some((activity) => activity.classState !== null && activity.classState !== 'class')) ? (
              <>
                {' '}
                <Trans>O înscriere neclasificată (cod scurt, cod fără denumire în nomenclator, cod neinterpretabil) nu are denumire și nu e o activitate clasificată.</Trans>
              </>
            ) : null}
          </p>
        </HubInfoNote>
      </p>
    </div>
  )
}

/**
 * One activity as the band's answer (owner, 25 November 2026: „Only the
 * presumed main"): ANAF's presumed main activity, redrawn. The analysis's
 * own grouping (the derived selection the hub and the analysis use) is said
 * in one quiet line only where it differs from it. Where ANAF gives no
 * presumed activity, the selection is the answer instead, as before. The
 * presumed block stays mounted in every case: it reads on load.
 */
function PresumedFirst({
  model,
  onAnafWithdrawn,
  onCompanyNotPublic,
}: {
  readonly model: CompanyProfileModel
  readonly onAnafWithdrawn: (identity: string) => void
  readonly onCompanyNotPublic: () => void
}) {
  const view = model.assumedMain
  const presumed = view.kind === 'assigned' ? view.activity : null
  const presumedBlock = <CompanyMainActivity model={model} onAnafWithdrawn={onAnafWithdrawn} onCompanyNotPublic={onCompanyNotPublic} />
  if (!presumed) {
    return (
      <>
        {model.selection ? (
          <ActivitySelection selection={model.selection} lead />
        ) : model.selectionUnavailable ? (
          <p role="status" className="border-l-2 border-muted-foreground py-0.5 pl-3 text-sm text-muted-foreground" data-testid="company-activity-selection-unavailable">
            <Trans>Activitatea selectată nu poate fi calculată acum pentru această firmă: ediția ONRC are prea multe observații CAEN pentru calculul exact. Înscrierile sunt listate mai jos.</Trans>
          </p>
        ) : (
          <MainActivity model={model} />
        )}
        {/* Mounted for its reads, drawn only when it has something to say (no assignment, unreadable). */}
        <div className={cn('mt-8 border-t border-border/70 pt-5', (view.kind === 'not_served' || view.kind === 'unavailable' || view.kind === 'refused') && 'hidden')}>
          {presumedBlock}
        </div>
      </>
    )
  }
  const { selection } = model
  const key = presumed.resolved
  const same = selection !== null && selection.code !== null && key !== null && selection.code === key.code && selection.revision === key.revision
  const grouping = selection === null || same ? null : selection.code !== null ? (selection.label ?? selection.code) : null
  return (
    <>
      {presumedBlock}
      {selection && !same ? (
        <p className="mt-5 border-t border-border/70 pt-4 text-sm text-muted-foreground" data-testid="company-activity-grouping">
          {grouping !== null ? (
            <Trans>
              În analiza bilanțurilor e grupată la: <span className="text-foreground">{grouping}</span>
              {selection.code ? ` (${selection.code})` : ''}.
            </Trans>
          ) : selection.basis === 'onrc_multiple_classes' ? (
            <Trans>În analiza bilanțurilor nu e grupată la o activitate: are mai multe activități clasificate.</Trans>
          ) : (
            <Trans>În analiza bilanțurilor nu e grupată la o activitate.</Trans>
          )}
        </p>
      ) : null}
    </>
  )
}
