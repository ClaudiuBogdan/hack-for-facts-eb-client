import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import type { CompanyProcurementRead } from '../../lib/company-procurement-read'
import { dateText } from '../../lib/company-profile-format'
import type { CompanyProfileModel } from '../../lib/company-profile-model'
import { sizeClassLabel } from '../../lib/company-profile-text'
import { CopyCui } from './company-profile-head'
import { ProfileBand } from './company-profile-band'

const TITLE_ID = 'company-registry-title'

/**
 * „Datele din registru": the record as the registry and ANAF keep it — the
 * exact legal name, the identifiers, the status, the people who represent the
 * company — and where every figure on the page comes from.
 */
export function CompanyRegistryBand({
  model,
  index,
  procurement,
  last = false,
}: {
  readonly model: CompanyProfileModel
  readonly index: string
  /** The SEAP read, once it has loaded: the sources line names its window. */
  readonly procurement: CompanyProcurementRead | null
  readonly last?: boolean
}) {
  return (
    <ProfileBand id="registru" titleId={TITLE_ID} last={last}>
      <HubSectionHead titleId={TITLE_ID} index={index} title={<Trans>Datele din registru</Trans>} />
      <RegistryFacts model={model} />
      <SourcesLine model={model} procurement={procurement} />
    </ProfileBand>
  )
}

function RegistryFacts({ model }: { readonly model: CompanyProfileModel }) {
  const { profile, place, mainActivity } = model
  const { fiscal } = profile
  const rows: { readonly term: string; readonly detail: ReactNode }[] = [
    { term: t`Denumire în registru`, detail: profile.legalName },
    ...(profile.cui ? [{ term: t`Cod fiscal (CUI)`, detail: <CopyCui cui={profile.cui} bare /> }] : []),
    ...(profile.codInmatriculare ? [{ term: t`Nr. de ordine în registru`, detail: <span className="font-mono text-xs">{profile.codInmatriculare}</span> }] : []),
    ...(model.legalFormName ? [{ term: t`Formă juridică`, detail: model.legalFormName }] : []),
    ...(profile.registrationDate ? [{ term: t`Înregistrată`, detail: dateText(profile.registrationDate) }] : []),
    { term: t`Stare în registru`, detail: model.status.label ?? '—' },
    { term: t`Sediu`, detail: place.label ?? '—' },
    ...(mainActivity ? [{ term: t`Activitate principală (ANAF)`, detail: `${mainActivity.code} · ${mainActivity.label}` }] : []),
    { term: t`TVA`, detail: fiscal.vatPayer ? t`Plătitoare` : fiscal.vatPayer === false ? t`Neplătitoare` : '—' },
    {
      term: t`Stare fiscală`,
      detail: !fiscal.anafFound ? t`Nu apare în datele ANAF` : fiscal.inactive === null ? '—' : fiscal.inactive ? t`Inactivă la ANAF` : t`Activă la ANAF`,
    },
    ...(model.sizeClass ? [{ term: t`Mărime`, detail: sizeClassLabel(model.sizeClass) }] : []),
    ...(profile.representatives.length > 0
      ? [{ term: t`Reprezentanți`, detail: profile.representatives.map((person) => `${person.name} (${person.role})`).join('; ') }]
      : []),
    ...(profile.euBranches.length > 0
      ? [{ term: t`Sucursale în UE`, detail: profile.euBranches.map((branch) => `${branch.name} (${branch.country})`).join('; ') }]
      : []),
  ]
  return (
    <dl className="mt-8 grid gap-x-8 lg:grid-cols-2">
      {rows.map((row) => (
        <div
          key={row.term}
          className="grid gap-x-4 gap-y-0.5 border-b border-border/70 py-2.5 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] sm:items-baseline sm:gap-y-0"
        >
          <dt className="text-sm text-muted-foreground">{row.term}</dt>
          <dd className="min-w-0 break-words text-sm text-foreground">{row.detail}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Where the page's figures come from, each source with the date it was read. */
function SourcesLine({ model, procurement }: { readonly model: CompanyProfileModel; readonly procurement: CompanyProcurementRead | null }) {
  const { profile, span } = model
  const onrc = profile.sources.find((source) => source.id === 'onrc')
  const anaf = profile.sources.find((source) => source.id === 'anaf')
  const first = span[0]
  const last = span[span.length - 1]
  const statements = first === undefined || last === undefined ? null : first === last ? t`bilanțul pe ${first}` : t`bilanțuri ${first}–${last}`
  const seapFrom = procurement?.window.from?.slice(0, 4)
  const parts = [
    onrc ? t`Registrul comerțului (ONRC), ${dateText(onrc.snapshotDate)}` : null,
    anaf ? t`ANAF, ${dateText(anaf.snapshotDate)}` : null,
    statements,
    seapFrom ? t`înregistrările firmei în SEAP din ${seapFrom}` : null,
  ].filter((part): part is string => part !== null)
  if (parts.length === 0) return null
  return (
    <MonoLabel className="mt-6 block leading-relaxed text-muted-foreground">
      <Trans>Surse:</Trans> {parts.join(' · ')}
    </MonoLabel>
  )
}
