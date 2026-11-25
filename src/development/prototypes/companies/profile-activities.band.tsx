import { useCallback, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import type { CompanyAnalysisCaen } from '@/schemas/company-analytics'
import type { PrivateCompanyActivitySelection, PrivateCompanyProfile } from '@/schemas/private-company'
import { activityRowStateText, activitySelectionTexts, truncatedObservationsText } from '@/features/private-companies/lib/company-activity-text'
import { caenDescriptionLines } from '@/features/private-companies/lib/company-analytics-text'
import { mainBadgeText, sameCodeAsAnafText } from '@/features/private-companies/lib/company-main-activity-text'
import { caenEdition, withAnafWithdrawnSeen, withOwningCompanyRefused, type ActivityGroup, type CompanyProfileModel } from '@/features/private-companies/lib/company-profile-model'
import { CaenDescription } from '@/features/private-companies/components/caen-description'
import { CompanyMainActivity } from '@/features/private-companies/components/profile/company-main-activity'
import { HubInfoNote } from '@/features/private-companies/components/hub/hub-info-note'
import { BAND_GRID_CLASS, ProfileBand, ROW_LINK_CLASS } from '@/features/private-companies/components/profile/company-profile-band'

const TITLE_ID = 'company-activities-title'

/**
 * PROTOTYPE (owner, 25 November 2026: „Activities band"). A copy of
 * `company-activities-band.tsx` with its blocks moved, not reworded, and its
 * words in plain text where they were mono capitals. `anafFolded`: the
 * ANAF-assumed main activity after the selection, folded (still mounted:
 * `CompanyMainActivity` reads on mount, so it must never sit in a popover);
 * otherwise it stays open, after the selection. The domains list shows five,
 * and its notes, save the cut-list line, go behind one ⓘ.
 */

/**
 * „Ce face firma": first, where the API serves it, the ANAF-assumed main
 * activity (`CompanyMainActivity`) — an assumption from ANAF's fiscal code,
 * never a principal activity ONRC declared; its flags mark the one ONRC class
 * row it names („principală (presupusă)") and the rows with the same digits
 * („același cod ca ANAF"), and nothing else. Then the derived activity
 * selection, unchanged — ONRC first, ANAF's
 * fiscal code only when the edition holds no class — with how it was
 * selected, each source's date and the edition's coverage; from an older API
 * that serves none, the ANAF fiscal CAEN code, as before. Then the
 * activities the pinned ONRC edition observes, by revision and division — a
 * division opens on its classes; the rows that are no class (a short source
 * code, an unknown revision, a key no catalog names, an unparsed code) close
 * their revision as one group of unqualified observations, with no division
 * number or sector, each row its code as served and what it is, unlabelled.
 * Each statement keeps its source: ANAF's code is named only from
 * its own CAEN revision (its published data may identify none) and is never a
 * current ONRC fact; the registry's meaning of the same digits is said as the
 * registry's. Every revision the edition lists is shown, Rev.0 included, each
 * under its own name; names come from the current database catalog of the
 * row's own revision, and a row with no known revision has none.
 *
 * Once the main activity's history reports ANAF's source withdrawn under the
 * assignment shown, the main block and the rows' flags lose every ANAF field
 * at once (`withAnafWithdrawnSeen`), until the profile read again answers.
 * Once it answers that the company is no longer public, the main block and
 * the rows' flags go at once (`withOwningCompanyRefused`) and the page's
 * privacy path is told (`onCompanyGone`): it hides the answer and reads the
 * profile again.
 */
export function ProtoActivitiesBand({
  model: served,
  index,
  onCompanyGone,
  anafFolded = false,
}: {
  readonly model: CompanyProfileModel
  readonly index?: string
  /** The ANAF-assumed main activity behind a fold, after the selection (mounted either way). */
  readonly anafFolded?: boolean
  /** The page's privacy path for a dependent read that found the company gone (`useProfileRegistryScope`). */
  readonly onCompanyGone?: () => void
}) {
  const [anafWithdrawnUnder, setAnafWithdrawnUnder] = useState<string | null>(null)
  const [refusedAnswer, setRefusedAnswer] = useState<PrivateCompanyProfile | null>(null)
  const model = withOwningCompanyRefused(withAnafWithdrawnSeen(served, anafWithdrawnUnder), refusedAnswer)
  const answer = served.profile
  const onCompanyNotPublic = useCallback(() => {
    setRefusedAnswer(answer)
    onCompanyGone?.()
  }, [answer, onCompanyGone])
  return (
    <ProfileBand id="activitati" titleId={TITLE_ID}>
      <div className={BAND_GRID_CLASS}>
        <div className="min-w-0 lg:col-span-5">
          <HubSectionHead titleId={TITLE_ID} index={index} title={<Trans>Ce face firma</Trans>} />
          {/* The selection first: what the platform selected, and why, in the open. */}
          {model.selection ? (
            <ActivitySelection selection={model.selection} className="mt-8" />
          ) : model.selectionUnavailable ? (
            <p role="status" className="mt-8 border-l-2 border-muted-foreground py-0.5 pl-3 text-sm text-muted-foreground" data-testid="company-activity-selection-unavailable">
              <Trans>Activitatea selectată nu poate fi calculată acum pentru această firmă: ediția ONRC are prea multe observații CAEN pentru calculul exact. Înscrierile sunt listate mai jos.</Trans>
            </p>
          ) : (
            <MainActivity model={model} className="mt-8" />
          )}
          {/* Then ANAF's assumption, „presupusă" in its own words; folded or open, always mounted. */}
          {anafFolded ? (
            <Fold label={<Trans>Activitatea principală presupusă după ANAF</Trans>} className="mt-8">
              <CompanyMainActivity model={model} onAnafWithdrawn={setAnafWithdrawnUnder} onCompanyNotPublic={onCompanyNotPublic} />
            </Fold>
          ) : (
            <CompanyMainActivity model={model} onAnafWithdrawn={setAnafWithdrawnUnder} onCompanyNotPublic={onCompanyNotPublic} className="mt-8" />
          )}
        </div>
        {model.activities.total > 0 ? (
          <div className="min-w-0 lg:col-span-7" data-reveal>
            <p className="text-xs leading-relaxed text-muted-foreground">
              <Trans>Activitățile autorizate, pe domenii</Trans>
            </p>
            <ActivityGroups model={model} limit={5} className="mt-3" />
          </div>
        ) : null}
      </div>
    </ProfileBand>
  )
}

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

function ActivityGroups({ model, limit = 8, className }: { readonly model: CompanyProfileModel; readonly limit?: number; readonly className?: string }) {
  const [open, setOpen] = useState<string | null>(null)
  const [all, setAll] = useState(false)
  const { groups, total, revision, byRevision } = model.activities
  const shown = all ? groups : groups.slice(0, limit)
  const nomenclature = revision ? ` (CAEN ${caenEdition(revision)})` : ''
  // Several revisions, or none named: each block of groups is headed by its own revision.
  const headed = revision === null
  // The groups come ordered by revision, so one revision's groups are consecutive.
  const blocks: { key: string; revision: string | null; groups: { group: ActivityGroup; index: number }[] }[] = []
  shown.forEach((group, index) => {
    const last = blocks[blocks.length - 1]
    if (last?.revision === group.revision) last.groups.push({ group, index })
    else blocks.push({ key: group.key, revision: group.revision, groups: [{ group, index }] })
  })
  return (
    <div className={className}>
      {blocks.map((block) => (
        <div key={block.key} className={headed ? 'mt-4 first:mt-0' : undefined}>
          {headed ? <span className="mb-1 block text-xs text-muted-foreground">{revisionName(block.revision)}</span> : null}
          <ul className="divide-y divide-border/70 border-y border-border/70">
            {block.groups.map(({ group, index }) => {
              const expanded = open === group.key
              const panelId = `company-activities-${String(index)}`
              return (
                <li key={group.key}>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={() => setOpen(expanded ? null : group.key)}
                    className={cn('grid w-full grid-cols-[2rem_minmax(0,1fr)_auto] items-baseline gap-x-3 py-2.5 text-left', ROW_LINK_CLASS)}
                  >
                    <MonoLabel className="pl-1 tabular-nums text-muted-foreground">{group.division ?? ''}</MonoLabel>
                    <span className="text-sm text-foreground">{group.label}</span>
                    <span className="pr-1 text-sm tabular-nums text-muted-foreground">{group.activities.length}</span>
                  </button>
                  {expanded ? (
                    <ul id={panelId} className="mb-3 ml-11 space-y-1.5 border-l pl-3">
                      {group.activities.map((activity, row) => (
                        // A row may repeat (the transport carries no row identifier): its position keeps it.
                        <li key={`${activity.code}-${String(row)}`} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-2 text-sm">
                          <span className="font-mono text-xs tabular-nums text-muted-foreground">{activity.code}</span>
                          <span className="text-muted-foreground">
                            {activity.label ?? activityRowStateText(activity.classState)}
                            {/* The API's flags only: the main badge where it names this row, the hint where only the digits agree. */}
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
        </div>
      ))}
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
      {/* The API bounds the list: a cut list says the edition's count beside what is shown, never passes for all of it. */}
      {model.registry.observationsTruncated ? (
        <p className="mt-4 text-xs text-muted-foreground" data-testid="company-activities-truncated">
          {model.selection ? truncatedObservationsText(model.selection.observationCount, total) : t`Lista e scurtată: ediția are mai multe înscrieri decât cele afișate aici.`}
        </p>
      ) : null}
      {/* What the list counts, in a line; the revisions and where the names come from, behind one marker. */}
      <p className="mt-3 text-xs text-muted-foreground">
        {model.registry.observationsTruncated
          ? null
          : plural(total, { one: 'O înscriere în registrul comerțului.', few: '# înscrieri în registrul comerțului.', other: '# de înscrieri în registrul comerțului.' })}{' '}
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
              Din ediția ONRC afișată. Denumirile sunt din nomenclatorul CAEN curent al platformei, pe revizia fiecărei înscrieri; o înscriere
              fără revizie cunoscută nu are denumire.
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
 * A block behind a button, its content mounted from the start and only
 * hidden: a block that reads on mount (`CompanyMainActivity`) keeps its reads
 * and its callbacks whether the reader opens it or not.
 */
function Fold({ label, children, className }: { readonly label: ReactNode; readonly children: ReactNode; readonly className?: string }) {
  const [open, setOpen] = useState(false)
  const id = 'company-activities-anaf-fold'
  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline"
      >
        <ChevronDown className={cn('size-4 transition-transform motion-reduce:transition-none', open && 'rotate-180')} aria-hidden="true" />
        {label}
      </button>
      <div id={id} hidden={!open} className="mt-3">
        {children}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════ the redesigned band ══

/** The registry's spread: the top domains in the county map's five navy steps, darkest first; the rest one grey. */
const SPREAD_STEPS = ['bg-choropleth-5', 'bg-choropleth-4', 'bg-choropleth-3', 'bg-choropleth-2', 'bg-choropleth-1'] as const
const SPREAD_REST = 'bg-muted-foreground/25'

/** The division the selection's class sits in, in the selection's own revision; null when nothing is selected or the source is ANAF. */
function selectedGroupKey(model: CompanyProfileModel): string | null {
  const { selection } = model
  if (!selection || selection.source !== 'onrc' || selection.code === null) return null
  const division = selection.code.slice(0, 2)
  return model.activities.groups.find((group) => group.division === division && group.revision === selection.revision)?.key ?? null
}

/**
 * „Ce face firma", designed (owner, 25 November 2026: „I would like a design.
 * Rethink the section"). The band answers once, then shows the registry's
 * spread.
 *
 * - The answer, left: the selection as the band's lead (what, its code and
 *   source in a line, why a tap away); with none selected, that said plainly;
 *   under it ANAF's assumed main activity behind a fold — mounted from the
 *   start, as it reads on load, „presupusă" in its label.
 * - The spread, right: how many activities in how many domains in a
 *   sentence; one strip of every domain, each as wide as its activities, the
 *   five largest in the navy steps and the rest grey (`strip`); then the
 *   domains as a ranked list with an inline bar, each keyed to its strip
 *   colour and opening on its activities, the selected one marked; the
 *   list's notes behind one ⓘ, the cut-list line in the open.
 */
export function DesignActivitiesBand({
  model: served,
  onCompanyGone,
  strip = true,
}: {
  readonly model: CompanyProfileModel
  readonly onCompanyGone?: () => void
  /** The strip of every domain over the ranked list. */
  readonly strip?: boolean
}) {
  const [anafWithdrawnUnder, setAnafWithdrawnUnder] = useState<string | null>(null)
  const [refusedAnswer, setRefusedAnswer] = useState<PrivateCompanyProfile | null>(null)
  const model = withOwningCompanyRefused(withAnafWithdrawnSeen(served, anafWithdrawnUnder), refusedAnswer)
  const answer = served.profile
  const onCompanyNotPublic = useCallback(() => {
    setRefusedAnswer(answer)
    onCompanyGone?.()
  }, [answer, onCompanyGone])
  const view = model.assumedMain.kind
  // `CompanyMainActivity` draws nothing for these: no fold over nothing.
  const anafShown = view !== 'not_served' && view !== 'unavailable' && view !== 'refused'
  return (
    <ProfileBand id="activitati" titleId={TITLE_ID}>
      <HubSectionHead titleId={TITLE_ID} title={<Trans>Ce face firma</Trans>} />
      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="min-w-0 lg:col-span-5">
          {model.selection ? (
            <ActivitySelection selection={model.selection} lead />
          ) : model.selectionUnavailable ? (
            <p role="status" className="border-l-2 border-muted-foreground py-0.5 pl-3 text-sm text-muted-foreground" data-testid="company-activity-selection-unavailable">
              <Trans>Activitatea selectată nu poate fi calculată acum pentru această firmă: ediția ONRC are prea multe observații CAEN pentru calculul exact. Înscrierile sunt listate mai jos.</Trans>
            </p>
          ) : (
            <MainActivity model={model} />
          )}
          {/* Mounted whether shown or not: it reads on load. Hidden when it would draw nothing. */}
          <div className={cn('mt-8 border-t border-border/70 pt-4', !anafShown && 'hidden')}>
            <Fold label={<Trans>Activitatea principală presupusă după ANAF</Trans>}>
              <CompanyMainActivity model={model} onAnafWithdrawn={setAnafWithdrawnUnder} onCompanyNotPublic={onCompanyNotPublic} />
            </Fold>
          </div>
        </div>
        {model.activities.total > 0 ? (
          <div className="min-w-0 lg:col-span-7">
            <ActivitySpread model={model} strip={strip} />
          </div>
        ) : null}
      </div>
    </ProfileBand>
  )
}

/** How widely the company is registered: a sentence, the strip, the ranked domains, the notes. */
function ActivitySpread({ model, strip, limit = 6 }: { readonly model: CompanyProfileModel; readonly strip: boolean; readonly limit?: number }) {
  const [open, setOpen] = useState<string | null>(null)
  const [all, setAll] = useState(false)
  const { groups: served, total, revision, byRevision } = model.activities
  // Largest first, across revisions: a division in two revisions is two domains, as the registry lists them.
  const groups = [...served].sort((a, b) => b.activities.length - a.activities.length)
  const largest = groups[0]?.activities.length ?? 1
  const selected = selectedGroupKey(model)
  const tone = (index: number) => SPREAD_STEPS[index] ?? SPREAD_REST
  const shown = all ? groups : groups.slice(0, limit)
  const nomenclature = revision ? ` (CAEN ${caenEdition(revision)})` : ''
  const headed = revision === null
  const domainCount = groups.length
  const summary = plural(domainCount, { one: 'într-un domeniu', few: 'în # domenii', other: 'în # de domenii' })
  return (
    <div data-testid="company-activity-spread">
      <p className="text-base text-foreground">
        {plural(total, { one: 'O activitate autorizată', few: '# activități autorizate', other: '# de activități autorizate' })} {summary}.
      </p>
      {strip ? (
        // One whole: every domain as wide as its activities. A picture; the list under it says the same.
        <div className="mt-4 flex h-7 gap-px overflow-hidden rounded-sm bg-border/60" aria-hidden="true" data-testid="company-activity-strip">
          {groups.map((group, index) => (
            <span
              key={group.key}
              className={cn('min-w-px', tone(index), group.key === selected && 'ring-2 ring-inset ring-foreground')}
              style={{ flexGrow: group.activities.length, flexBasis: 0 }}
              title={`${group.label}: ${String(group.activities.length)}`}
            />
          ))}
        </div>
      ) : null}
      <ul className="mt-5 divide-y divide-border/70 border-y border-border/70">
        {shown.map((group, index) => {
          const expanded = open === group.key
          const panelId = `company-activity-domain-${String(index)}`
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
                <span className={cn('mt-1.5 size-2.5 rounded-[2px]', strip ? tone(index) : 'bg-transparent')} aria-hidden="true" />
                <MonoLabel className="pt-1 tabular-nums text-muted-foreground">{group.division ?? ''}</MonoLabel>
                <span className="min-w-0">
                  <span className="text-sm leading-snug text-foreground">{group.label}</span>
                  {group.key === selected ? (
                    <span className="ml-2 inline-block rounded-sm border border-primary/40 px-1.5 text-xs font-medium text-primary">
                      <Trans>aici e activitatea selectată</Trans>
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
          </p>
        </HubInfoNote>
      </p>
    </div>
  )
}
