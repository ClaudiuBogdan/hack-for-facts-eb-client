import { useState } from 'react'
import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { formatNgoDate } from '@/features/ngos/hub/ngo-format'
import { HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { HomeBand } from '@/features/procurement/components/home/home-section-nav'
import { cn } from '@/lib/utils'
import type { NgoListSnapshot, NgoOrganization, NgoSocialService } from '../api'

/**
 * „Servicii și acreditări": the four official lists the profile is joined
 * to by CUI — the ministry's licensed social services and accredited
 * providers, ANOFM's social-enterprise register (RUEIS) and accredited
 * employment-service providers — each drawn only where it lists the
 * organisation, dated by its edition and linked once in the page's sources.
 *
 * What it does not say: a list that does not name the organisation is not
 * drawn (not listed in that edition, never „no services"); a list not loaded,
 * or a profile without a CUI, is no fact at all. A listed licence or
 * certificate is the edition's word, not that it is valid today. A protective
 * or unclassified service is published with its county only, and shown so,
 * never named protective. A service's place is the service's, not the
 * organisation's seat.
 */

/** Services a list shows before „Arată toate". */
const SERVICES_SHOWN = 6

export function ServiceListsBand({ organization, index }: { readonly organization: NgoOrganization; readonly index: string }) {
  const services = listed(organization.socialServices)
  const accreditations = listed(organization.socialServiceAccreditations)
  const enterprises = listed(organization.socialEnterpriseCertificates)
  const employment = listed(organization.employmentServiceAccreditations)
  const certificates = [
    accreditations ? (
      <ListBlock key="accreditations" label={<Trans>Furnizor acreditat de servicii sociale</Trans>} snapshot={organization.socialServiceAccreditations.snapshot}>
        {accreditations.map((item, position) => (
          <Row key={position}>{joined([certificate(item.certificateNumber), item.decisionNumber ? decision(item.decisionNumber) : null])}</Row>
        ))}
      </ListBlock>
    ) : null,
    enterprises ? (
      <ListBlock key="enterprises" label={<Trans>Întreprindere socială (RUEIS)</Trans>} snapshot={organization.socialEnterpriseCertificates.snapshot}>
        {enterprises.map((item, position) => (
          <Row key={position}>
            {attestation(item.certificateNumber, item.certificateDate)}
            {/* The status (in the list's own Romanian word) and the validity are what the edition says, not a live check. */}
            {item.status || item.validUntil ? ` · ${inList()} ` : null}
            {item.status ? <span lang="ro">{item.status}</span> : null}
            {item.status && item.validUntil ? ', ' : null}
            {item.validUntil ? validUntil(item.validUntil) : null}
          </Row>
        ))}
      </ListBlock>
    ) : null,
    employment ? (
      <ListBlock key="employment" label={<Trans>Furnizor acreditat de servicii de ocupare</Trans>} snapshot={organization.employmentServiceAccreditations.snapshot}>
        {employment.map((item, position) => (
          <Row key={position}>{joined([certificate(item.certificateNumber), item.issuedOn ? issuedOn(item.issuedOn) : null])}</Row>
        ))}
      </ListBlock>
    ) : null,
  ].filter(Boolean)

  return (
    <HomeBand id="servicii" labelledBy="ngo-profile-services">
      <HubSectionHead
        titleId="ngo-profile-services"
        index={index}
        title={<Trans>Servicii și acreditări</Trans>}
        lede={
          <Trans>
            Ce spun listele oficiale, în edițiile încărcate. O licență sau un certificat din listă nu dovedește că e valabil azi; locul e al
            serviciului, nu sediul organizației.
          </Trans>
        }
      />
      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12" data-reveal>
        {services ? (
          <div className="min-w-0 lg:col-span-7">
            <ServicesList services={services} snapshot={organization.socialServices.snapshot} />
          </div>
        ) : null}
        {certificates.length > 0 ? (
          <div className={cn('min-w-0 space-y-10', services ? 'lg:col-span-5' : 'lg:col-span-12 lg:grid lg:grid-cols-3 lg:gap-12 lg:space-y-0')}>{certificates}</div>
        ) : null}
      </div>
    </HomeBand>
  )
}

/** A list's rows where the list names the organisation; null otherwise (not listed, or not loaded). */
function listed<T>(section: { readonly availability: string; readonly data: readonly T[] | null }): readonly T[] | null {
  return section.availability === 'available' && section.data && section.data.length > 0 ? section.data : null
}

const decision = (number: string) => t`decizia ${number}`
/** Before what RUEIS says of an attestation — its status, its validity: the edition's word, not a live check. */
const inList = () => t`în listă:`
const serviceCode = (code: string) => t`cod ${code}`
const validUntil = (iso: string) => {
  const until = formatNgoDate(iso)
  return t`valabil până la ${until}`
}
const issuedOn = (iso: string) => {
  const issued = formatNgoDate(iso)
  return t`din ${issued}`
}
const joined = (parts: readonly (string | null)[]) => parts.filter(Boolean).join(' · ')
const certificate = (number: string | null) => (number ? t`Certificatul ${number}` : t`Certificat fără număr în listă`)
const attestation = (number: string | null, date: string | null) => {
  const issued = date ? formatNgoDate(date) : null
  if (number && issued) return t`Atestatul nr. ${number} din ${issued}`
  if (number) return t`Atestatul nr. ${number}`
  return issued ? t`Atestat din ${issued}` : t`Atestat fără număr în listă`
}

function ListBlock({ label, snapshot, children }: { readonly label: ReactNode; readonly snapshot: NgoListSnapshot | null; readonly children: ReactNode }) {
  return (
    <div>
      <MonoLabel className="block text-primary">{label}</MonoLabel>
      <ul className="mt-3 border-b border-border/60">{children}</ul>
      <Edition snapshot={snapshot} />
    </div>
  )
}

function Row({ children }: { readonly children: ReactNode }) {
  return <li className="border-t border-border/60 py-2.5 text-sm text-foreground">{children}</li>
}

/**
 * The edition's date where the API carries one; otherwise the date is said to be unavailable — never that the source has
 * none — with when it was imported, which is not the edition's date. A list served with no snapshot says its edition is
 * unknown.
 */
function Edition({ snapshot }: { readonly snapshot: NgoListSnapshot | null }) {
  if (!snapshot)
    return (
      <MonoLabel className="mt-2 block leading-relaxed text-muted-foreground">
        <Trans>Ediția listei nu e cunoscută</Trans>
      </MonoLabel>
    )
  const imported = formatNgoDate(snapshot.importedAt.slice(0, 10))
  const declared = snapshot.sourceDeclaredDate ? formatNgoDate(snapshot.sourceDeclaredDate) : null
  return (
    <MonoLabel className="mt-2 block leading-relaxed text-muted-foreground">
      {declared ? (
        <Trans>Ediția din {declared}</Trans>
      ) : (
        <Trans>Data ediției nu este disponibilă; importată la {imported}</Trans>
      )}
    </MonoLabel>
  )
}

function ServicesList({ services, snapshot }: { readonly services: readonly NgoSocialService[]; readonly snapshot: NgoListSnapshot | null }) {
  const [open, setOpen] = useState(false)
  const shown = open ? services : services.slice(0, SERVICES_SHOWN)
  const count = services.length
  return (
    <div>
      <MonoLabel className="block text-primary">
        <Trans>Servicii sociale licențiate · {count}</Trans>
      </MonoLabel>
      <ul className="mt-3 border-b border-border/60">
        {shown.map((service, position) => (
          <ServiceRow key={position} service={service} />
        ))}
      </ul>
      {count > SERVICES_SHOWN ? (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="mt-3 inline-flex min-h-9 items-center text-sm font-medium text-foreground underline underline-offset-4 hover:text-primary"
        >
          {open ? <Trans>Arată mai puține</Trans> : <Trans>Arată toate cele {count}</Trans>}
        </button>
      ) : null}
      <Edition snapshot={snapshot} />
    </div>
  )
}

const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('ro')
    .replace(/[^a-z0-9]+/gu, ' ')
    .trim()

function ServiceRow({ service }: { readonly service: NgoSocialService }) {
  // A protective or unclassified service has no name or locality to show: the list publishes its county only.
  const name = service.countyOnly ? null : service.serviceName
  const locality = service.countyOnly ? null : service.locality
  // „Brașov, Brașov" says the county twice.
  const place = locality && service.county && fold(locality) === fold(service.county) ? service.county : [locality, service.county].filter(Boolean).join(', ')
  const number = service.licenseNumber
  const licensed = service.licensedOn ? formatNgoDate(service.licensedOn) : null
  const license = number && licensed ? t`licența ${number} din ${licensed}` : number ? t`licența ${number}` : licensed ? t`licențiat la ${licensed}` : null
  const seats = service.capacity
  const capacity = seats === null ? null : t`capacitate ${seats}`
  const terms = joined([capacity, license])
  return (
    <li className="border-t border-border/60 py-3">
      {/* The ministry's own words — name, type, place — are Romanian on a page in any language. */}
      <p className="text-sm font-medium text-foreground">
        {name ? (
          <span lang="ro">{name}</span>
        ) : service.countyOnly ? (
          <Trans>Serviciu publicat doar cu județul</Trans>
        ) : (
          <Trans>Serviciu fără nume în listă</Trans>
        )}
      </p>
      {service.serviceType || service.serviceCode ? (
        <p className="mt-0.5 text-xs text-muted-foreground">
          {service.serviceType ? <span lang="ro">{service.serviceType}</span> : null}
          {service.serviceType && service.serviceCode ? ' · ' : null}
          {service.serviceCode ? serviceCode(service.serviceCode) : null}
        </p>
      ) : null}
      <p className="mt-0.5 text-xs text-muted-foreground">
        {place ? <span lang="ro">{place}</span> : null}
        {place && terms ? ' · ' : null}
        {terms || (place ? null : '—')}
      </p>
    </li>
  )
}
