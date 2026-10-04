import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import type { CompanyRegistryValue } from '@/schemas/private-company-registry'
import type { CompanyProcurementRead } from '../../lib/company-procurement-read'
import { dateText } from '../../lib/company-profile-format'
import { caenEdition, type CompanyProfileModel } from '../../lib/company-profile-model'
import { sizeClassLabel, statusText } from '../../lib/company-profile-text'
import { basisText, cuiStateText, registrySourceLine } from '../../lib/company-registry-text'
import { CopyCui } from './company-profile-head'
import { ProfileBand } from './company-profile-band'
import { CompanyRegistryEvidenceList } from './company-registry-evidence'

const TITLE_ID = 'company-registry-title'

/**
 * „Datele din registru": the record as the pinned ONRC edition and ANAF keep
 * it — each registry value with the basis that qualifies it, the edition's
 * observations behind them (conflicts listed, not chosen), the comparison with
 * the previous edition — and where every figure on the page comes from. A
 * registry that cannot answer, or a CUI the edition holds no profile for, is
 * said as such: never as an empty record or an unregistered company.
 */
export function CompanyRegistryBand({
  model,
  index,
  procurement,
  diffText,
  last = false,
}: {
  readonly model: CompanyProfileModel
  readonly index: string
  /** The SEAP read, once it has loaded: the sources line names its window. */
  readonly procurement: CompanyProcurementRead | null
  /** The comparison with the previous edition, in a sentence; null when not asked. */
  readonly diffText: string | null
  readonly last?: boolean
}) {
  const stateText = cuiStateText(model.registry.cuiState)
  return (
    <ProfileBand id="registru" titleId={TITLE_ID} last={last}>
      <HubSectionHead titleId={TITLE_ID} index={index} title={<Trans>Datele din registru</Trans>} />
      {stateText ? (
        <p role="status" className="mt-6 max-w-[68ch] border-l-2 border-muted-foreground py-0.5 pl-3 text-sm leading-relaxed text-foreground">
          {stateText}
        </p>
      ) : null}
      <RegistryFacts model={model} />
      <CompanyRegistryEvidenceList evidence={model.registry} className="mt-8 max-w-[68ch]" />
      {diffText ? <p className="mt-4 max-w-[68ch] text-sm text-muted-foreground" data-testid="company-registry-diff">{diffText}</p> : null}
      <SourcesLine model={model} procurement={procurement} />
    </ProfileBand>
  )
}

/** A registry value with its basis note when the edition does not state it plainly. */
function qualified(value: ReactNode, field: CompanyRegistryValue | undefined): ReactNode {
  const note = field ? basisText(field.basis) : null
  if (!note) return value
  return (
    <>
      {value} <span className="text-muted-foreground">({note})</span>
    </>
  )
}

function RegistryFacts({ model }: { readonly model: CompanyProfileModel }) {
  const { profile, place, mainActivity, recordedDate } = model
  const { fiscal } = profile
  const evidence = model.registry.profile
  const inEdition = model.registry.cuiState === 'in_edition'
  const rows: { readonly term: string; readonly detail: ReactNode }[] = [
    {
      term: t`Denumire`,
      detail:
        profile.nameSource === 'onrc_edition' ? (
          profile.legalName
        ) : (
          <>
            {profile.legalName}{' '}
            <span className="text-muted-foreground">
              <Trans>(numele din directorul platformei, nu din ediția ONRC)</Trans>
            </span>
          </>
        ),
    },
    ...(profile.cui ? [{ term: t`Cod fiscal (CUI)`, detail: <CopyCui cui={profile.cui} bare /> }] : []),
    ...(profile.codInmatriculare
      ? [{ term: t`Nr. de ordine în registru`, detail: <span className="font-mono text-xs">{profile.codInmatriculare}</span> }]
      : model.registry.identifiers.length > 1
        ? [{ term: t`Nr. de ordine în registru`, detail: t`mai mulți identificatori, listați mai jos` }]
        : []),
    ...(inEdition ? [{ term: t`Formă juridică`, detail: qualified(model.legalFormName ?? '—', evidence?.legalForm) }] : []),
    ...(inEdition && recordedDate
      ? [{ term: t`Data înregistrată de ONRC`, detail: qualified(recordedDate.value ? dateText(recordedDate.value) : '—', recordedDate) }]
      : []),
    ...(inEdition ? [{ term: t`Stare în registru`, detail: qualified(statusText(model), evidence?.statusCode) }] : []),
    ...(inEdition ? [{ term: t`Sediu, după înscrieri`, detail: qualified(place.label ?? '—', evidence?.countyCode) }] : []),
    ...(mainActivity ? [{ term: t`Activitate principală (ANAF)`, detail: mainActivityDetail(mainActivity) }] : []),
    { term: t`TVA (ANAF)`, detail: fiscal.vatPayer ? t`Plătitoare` : fiscal.vatPayer === false ? t`Neplătitoare` : '—' },
    {
      term: t`Lista contribuabililor inactivi (ANAF)`,
      detail: !fiscal.anafFound ? t`Nu apare în datele ANAF` : fiscal.inactive === null ? '—' : fiscal.inactive ? t`Declarată inactivă fiscal` : t`Nu figurează pe listă`,
    },
    ...(model.sizeClass ? [{ term: t`Mărime`, detail: sizeClassLabel(model.sizeClass) }] : []),
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

/**
 * The main activity's code with what its source says about it: the name from
 * its own CAEN revision; a known edition when that revision gives no name;
 * and only when ANAF's data identifies no revision at all, that it does not.
 */
function mainActivityDetail(mainActivity: NonNullable<CompanyProfileModel['mainActivity']>): string {
  if (mainActivity.label) return `${mainActivity.code} · ${mainActivity.label}`
  if (mainActivity.revision) return `${mainActivity.code} · CAEN ${caenEdition(mainActivity.revision)}`
  return t`${mainActivity.code} · revizie CAEN nepublicată de ANAF`
}

/** A publisher's statements: the Ministry of Finance (FY2008–2018) and ANAF (FY2019+) are named apart. */
function statementsText({ publisher, first, last }: CompanyProfileModel['statementSources'][number]): string {
  if (publisher === 'mfp') return first === last ? t`bilanțul pe ${first} (Ministerul Finanțelor)` : t`bilanțuri ${first}–${last} (Ministerul Finanțelor)`
  if (publisher === 'anaf') return first === last ? t`bilanțul pe ${first} (ANAF)` : t`bilanțuri ${first}–${last} (ANAF)`
  return first === last ? t`bilanțul pe ${first}` : t`bilanțuri ${first}–${last}`
}

/**
 * Where the page's figures come from, each source with its own date: the
 * pinned ONRC edition (id, ONRC's publication date, versions) and ANAF's
 * state date, never when the platform fetched or rebuilt them.
 */
function SourcesLine({ model, procurement }: { readonly model: CompanyProfileModel; readonly procurement: CompanyProcurementRead | null }) {
  const { profile, statementSources } = model
  const anaf = profile.sources.find((source) => source.id === 'anaf')
  const seapFrom = procurement?.window.from?.slice(0, 4)
  const parts = [
    registrySourceLine(model.registry.registry),
    anaf ? t`ANAF, situația la ${dateText(anaf.snapshotDate)}` : null,
    ...statementSources.map(statementsText),
    seapFrom ? t`înregistrările firmei în SEAP din ${seapFrom}` : null,
  ].filter((part): part is string => part !== null)
  return (
    <MonoLabel className="mt-6 block leading-relaxed text-muted-foreground" data-testid="company-sources-line">
      <Trans>Surse:</Trans> {parts.join(' · ')}
    </MonoLabel>
  )
}
