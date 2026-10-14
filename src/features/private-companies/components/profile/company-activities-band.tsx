import { useState } from 'react'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { HUB_BESIDE_TITLE_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import type { CompanyAnalysisCaen } from '@/schemas/company-analytics'
import type { PrivateCompanyActivitySelection } from '@/schemas/private-company'
import { activityRowStateText, activitySelectionTexts, truncatedObservationsText } from '../../lib/company-activity-text'
import { caenDescriptionLines } from '../../lib/company-analytics-text'
import { caenEdition, type ActivityGroup, type CompanyProfileModel } from '../../lib/company-profile-model'
import { CaenDescription } from '../caen-description'
import { HubInfoNote } from '../hub/hub-info-note'
import { BAND_GRID_CLASS, ProfileBand, ROW_LINK_CLASS } from './company-profile-band'

const TITLE_ID = 'company-activities-title'

/**
 * „Ce face firma": the derived activity selection — ONRC first, ANAF's
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
 */
export function CompanyActivitiesBand({ model, index }: { readonly model: CompanyProfileModel; readonly index: string }) {
  return (
    <ProfileBand id="activitati" titleId={TITLE_ID}>
      <div className={BAND_GRID_CLASS}>
        <div className="min-w-0 lg:col-span-5">
          <HubSectionHead titleId={TITLE_ID} index={index} title={<Trans>Ce face firma</Trans>} />
          {model.selection ? (
            <ActivitySelection selection={model.selection} className="mt-8" />
          ) : model.selectionUnavailable ? (
            <p role="status" className="mt-8 border-l-2 border-muted-foreground py-0.5 pl-3 text-sm text-muted-foreground" data-testid="company-activity-selection-unavailable">
              <Trans>Activitatea selectată nu poate fi calculată acum pentru această firmă: ediția ONRC are prea multe observații CAEN pentru calculul exact. Înscrierile sunt listate mai jos.</Trans>
            </p>
          ) : (
            <MainActivity model={model} className="mt-8" />
          )}
        </div>
        {model.activities.total > 0 ? (
          <div className={cn('min-w-0 lg:col-span-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
            <MonoLabel className="block text-muted-foreground">
              <Trans>Activitățile autorizate, pe domenii</Trans>
            </MonoLabel>
            <ActivityGroups model={model} className="mt-4" />
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
      <MonoLabel className="block text-primary">
        <Trans>Cod CAEN fiscal ANAF · {mainActivity.code}</Trans>
      </MonoLabel>
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
function ActivitySelection({ selection, className }: { readonly selection: PrivateCompanyActivitySelection; readonly className?: string }) {
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
    <div className={cn('border-l-2 pl-4', selected ? 'border-primary' : 'border-border', className)} data-testid="company-activity-selection">
      <MonoLabel className="block text-primary">{texts.kicker}</MonoLabel>
      <div className={cn('mt-2 text-lg font-semibold leading-snug', selected ? 'text-foreground' : 'text-muted-foreground')}>
        <SelectionTitle selection={selection} />
        {quiet ? <> {how}</> : null}
      </div>
      {meta ? <MonoLabel className="mt-1.5 block leading-relaxed text-muted-foreground">{meta}</MonoLabel> : null}
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
          {headed ? <MonoLabel className="mb-1 block text-muted-foreground">{revisionName(block.revision)}</MonoLabel> : null}
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
                          <span className="text-muted-foreground">{activity.label ?? activityRowStateText(activity.classState)}</span>
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
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">
          {revision !== null ? (
            plural(total, {
              one: `O activitate autorizată în registrul comerțului${nomenclature}.`,
              few: `# activități autorizate în registrul comerțului${nomenclature}.`,
              other: `# de activități autorizate în registrul comerțului${nomenclature}.`,
            })
          ) : byRevision.length > 1 ? (
            plural(total, {
              one: 'O activitate înscrisă în registrul comerțului.',
              few: '# înscrieri de activități în registrul comerțului, pe revizii CAEN; aceeași activitate poate apărea în mai multe revizii.',
              other: '# de înscrieri de activități în registrul comerțului, pe revizii CAEN; aceeași activitate poate apărea în mai multe revizii.',
            })
          ) : (
            plural(total, {
              one: 'O activitate înscrisă în registrul comerțului, fără revizie CAEN.',
              few: '# activități înscrise în registrul comerțului, fără revizie CAEN.',
              other: '# de activități înscrise în registrul comerțului, fără revizie CAEN.',
            })
          )}
        </p>
      )}
      {byRevision.length > 1 ? (
        <p className="mt-1 text-xs text-muted-foreground">{byRevision.map((entry) => `${revisionName(entry.revision)}: ${String(entry.count)}`).join(' · ')}</p>
      ) : null}
      <p className="mt-2 text-xs text-muted-foreground">
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
    </div>
  )
}
