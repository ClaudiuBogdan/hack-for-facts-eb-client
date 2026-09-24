import { useState } from 'react'
import { plural } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { HUB_BESIDE_TITLE_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import type { CompanyProfileModel } from '../../lib/company-profile-model'
import { BAND_GRID_CLASS, ProfileBand, ROW_LINK_CLASS } from './company-profile-band'

const TITLE_ID = 'company-activities-title'

/**
 * „Ce face firma": the main activity declared to ANAF, and the activities the
 * registry authorises, by division — a division opens on its classes.
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
  return (
    <div className={cn('border-l-2 border-primary pl-4', className)}>
      <MonoLabel className="block text-primary">
        <Trans>Activitatea principală · CAEN {mainActivity.code}</Trans>
      </MonoLabel>
      <p className="mt-2 text-lg font-semibold leading-snug text-foreground">{mainActivity.label}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {mainActivity.divisionLabel ? <Trans>Declarată la ANAF, în domeniul „{mainActivity.divisionLabel}"</Trans> : <Trans>Declarată la ANAF</Trans>}
      </p>
    </div>
  )
}

function ActivityGroups({ model, limit = 8, className }: { readonly model: CompanyProfileModel; readonly limit?: number; readonly className?: string }) {
  const [open, setOpen] = useState<string | null>(null)
  const [all, setAll] = useState(false)
  const { groups, total, revision } = model.activities
  const shown = all ? groups : groups.slice(0, limit)
  const nomenclature = revision ? ` (CAEN ${revision.replace('rev', 'Rev.')})` : ''
  return (
    <div className={className}>
      <ul className="divide-y divide-border/70 border-y border-border/70">
        {shown.map((group) => {
          const expanded = open === group.division
          const panelId = `company-activities-${group.division}`
          return (
            <li key={group.division}>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpen(expanded ? null : group.division)}
                className={cn('grid w-full grid-cols-[2rem_minmax(0,1fr)_auto] items-baseline gap-x-3 py-2.5 text-left', ROW_LINK_CLASS)}
              >
                <MonoLabel className="pl-1 tabular-nums text-muted-foreground">{group.division}</MonoLabel>
                <span className="text-sm text-foreground">{group.label}</span>
                <span className="pr-1 text-sm tabular-nums text-muted-foreground">{group.activities.length}</span>
              </button>
              {expanded ? (
                <ul id={panelId} className="mb-3 ml-11 space-y-1.5 border-l pl-3">
                  {group.activities.map((activity) => (
                    <li key={activity.code} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-2 text-sm">
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
        {plural(total, {
          one: `O activitate autorizată în registrul comerțului${nomenclature}.`,
          few: `# activități autorizate în registrul comerțului${nomenclature}.`,
          other: `# de activități autorizate în registrul comerțului${nomenclature}.`,
        })}
      </MonoLabel>
    </div>
  )
}
