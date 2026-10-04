import { useState } from 'react'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { HUB_BESIDE_TITLE_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { caenEdition, type ActivityGroup, type CompanyProfileModel } from '../../lib/company-profile-model'
import { BAND_GRID_CLASS, ProfileBand, ROW_LINK_CLASS } from './company-profile-band'

const TITLE_ID = 'company-activities-title'

/**
 * „Ce face firma": the main activity declared to ANAF, and the activities the
 * pinned ONRC edition observes, by revision and division — a division opens on
 * its classes. Each statement keeps its source: ANAF's code is named only from
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
          <MainActivity model={model} className="mt-8" />
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
        <Trans>Activitatea principală nu e declarată la ANAF.</Trans>
      </p>
    )
  }
  const { code, revision, label, registry } = mainActivity
  const edition = revision ? caenEdition(revision) : null
  return (
    <div className={cn('border-l-2 border-primary pl-4', className)}>
      <MonoLabel className="block text-primary">
        <Trans>Activitatea principală · CAEN {mainActivity.code}</Trans>
      </MonoLabel>
      <p className="mt-2 text-lg font-semibold leading-snug text-foreground">{label ?? <Trans>Codul CAEN {code}</Trans>}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {edition ? (
          <Trans>Declarată la ANAF, CAEN {edition}.</Trans>
        ) : (
          <Trans>
            Declarată la ANAF. Datele publicate de ANAF nu indică revizia CAEN, iar aceleași cifre pot însemna activități diferite în revizii
            diferite, așa că nu îi dăm o denumire.
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
                    <MonoLabel className="pl-1 tabular-nums text-muted-foreground">{group.division}</MonoLabel>
                    <span className="text-sm text-foreground">{group.label}</span>
                    <span className="pr-1 text-sm tabular-nums text-muted-foreground">{group.activities.length}</span>
                  </button>
                  {expanded ? (
                    <ul id={panelId} className="mb-3 ml-11 space-y-1.5 border-l pl-3">
                      {group.activities.map((activity, row) => (
                        // A row may repeat (the transport carries no row identifier): its position keeps it.
                        <li key={`${activity.code}-${String(row)}`} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-2 text-sm">
                          <span className="font-mono text-xs tabular-nums text-muted-foreground">{activity.code}</span>
                          <span className="text-muted-foreground">{activity.label}</span>
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
      <MonoLabel className="mt-4 block leading-relaxed text-muted-foreground">
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
      </MonoLabel>
      {byRevision.length > 1 ? (
        <MonoLabel className="mt-1 block leading-relaxed text-muted-foreground">
          {byRevision.map((entry) => `${revisionName(entry.revision)}: ${String(entry.count)}`).join(' · ')}
        </MonoLabel>
      ) : null}
      <p className="mt-2 text-xs text-muted-foreground">
        <Trans>
          Din ediția ONRC afișată. Denumirile sunt din nomenclatorul CAEN curent al platformei, pe revizia fiecărei înscrieri; o înscriere
          fără revizie cunoscută nu are denumire.
        </Trans>
      </p>
    </div>
  )
}
