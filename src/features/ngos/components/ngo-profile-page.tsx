import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import {
  AlertCircle,
  BriefcaseBusiness,
  CircleDollarSign,
  ExternalLink,
  FileSearch,
  MapPin,
  RotateCw,
  ShieldAlert,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  EvidenceTrail,
  DataStatusBadge,
  SourceCitationChip,
  SourceProvenanceDrawer,
  StaleSnapshotNotice,
} from '@/components/provenance/source-provenance'
import {
  IdentityConfidenceBadge,
  IdentityRowMeta,
  UnconfirmedReferencesZone,
} from '@/components/identity'
import type {
  Accreditation,
  EvidenceRecord,
  FundingSourceSummary,
  LegalRegistryRecord,
  NgoProfile,
  NgoProfileTab,
  NgoValidityState,
  PublicFunding,
  PublicUtilityStatus,
  SectorMembership,
  SocialService,
  SourceSnapshot,
} from '@/schemas/ngos'
import {
  useNgoProfile,
  useNgoPublicFunding,
} from '../hooks/use-ngos'
import {
  formatRoDate,
  formatRoMoney,
  formatRoNumber,
  locationLabel,
  serviceValidityVariant,
  snapshotAuthorityLabel,
} from './ngo-formatting'

type NgoProfilePageProps = {
  readonly cui: string
  readonly initialProfile: NgoProfile
  readonly initialFunding: PublicFunding | null
  readonly tab: NgoProfileTab | undefined
  readonly evidenceOpen?: boolean
}

const profileTabs: ReadonlyArray<{
  readonly id: NgoProfileTab
  readonly label: ReactNode
}> = [
  { id: 'identitate', label: <Trans>Identitate</Trans> },
  { id: 'sectorial', label: <Trans>Sectorial</Trans> },
  { id: 'acreditari', label: <Trans>Acreditari</Trans> },
  { id: 'servicii', label: <Trans>Servicii</Trans> },
  { id: 'registru', label: <Trans>Registru</Trans> },
  { id: 'utilitate', label: <Trans>Utilitate</Trans> },
  { id: 'financiar', label: <Trans>Financiar</Trans> },
  { id: 'fonduri', label: <Trans>Fonduri</Trans> },
  { id: 'dovezi', label: <Trans>Dovezi</Trans> },
]

function ProfileSkeleton() {
  return (
    <main className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6 md:px-6">
      <Skeleton className="h-36 rounded-lg" />
      <div className="grid gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-lg" />
    </main>
  )
}

export function NgoProfileNotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center px-4 py-8">
      <Card className="w-full rounded-lg border-dashed shadow-none">
        <CardHeader>
          <CardTitle>
            <Trans>ONG negasit</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>Nu exista un profil mock pentru acest CUI.</Trans>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to="/ong-uri" search={{}}>
              <Trans>Inapoi la ONG-uri</Trans>
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}

/**
 * The profile could not be fetched — distinct from "this NGO is not in the
 * register". A failed request says nothing about whether the CUI exists, so it
 * must not be reported as an absence (DESIGN.md, Data Trust & Provenance).
 */
export function NgoProfileErrorPanel({
  onRetry,
  isRetrying = false,
}: {
  readonly onRetry?: () => void
  readonly isRetrying?: boolean
}) {
  return (
    <main
      role="alert"
      className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center px-4 py-8"
    >
      <Card className="w-full rounded-lg shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" aria-hidden />
            <Trans>Profilul ONG nu a putut fi incarcat</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>
              Cererea a esuat. Asta nu inseamna ca ONG-ul lipseste din registru
              — incearca din nou, iar daca problema persista sursa de date este
              probabil temporar indisponibila.
            </Trans>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {onRetry ? (
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={onRetry}
              disabled={isRetrying}
            >
              <RotateCw
                className={isRetrying ? 'h-4 w-4 animate-spin' : 'h-4 w-4'}
                aria-hidden
              />
              <Trans>Reincearca</Trans>
            </Button>
          ) : null}
          <Button asChild variant="ghost">
            <Link to="/ong-uri" search={{}}>
              <Trans>Inapoi la ONG-uri</Trans>
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}

function sourceCitation(
  snapshot: SourceSnapshot | undefined,
  sourceSnapshotId: string,
) {
  return {
    sourceSnapshotId,
    authorityLabel: snapshotAuthorityLabel(snapshot),
    snapshotDate: snapshot?.sourceDeclaredSnapshotDate ?? null,
  }
}

function evidenceForSnapshot(
  evidence: readonly EvidenceRecord[],
  snapshotId: string,
): EvidenceRecord | undefined {
  return evidence.find((row) => row.sourceSnapshotId === snapshotId)
}

function MetricCard({
  label,
  value,
  description,
}: {
  readonly label: ReactNode
  readonly value: ReactNode
  readonly description: ReactNode
}) {
  return (
    <Card className="rounded-lg shadow-none">
      <CardHeader className="p-4">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="font-mono text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 text-sm text-muted-foreground">
        {description}
      </CardContent>
    </Card>
  )
}

function ProfileHeader({ profile }: { readonly profile: NgoProfile }) {
  const hasCompanyTwin = profile.header.alsoKinds.includes('company')

  return (
    <section className="rounded-lg border bg-card p-5 shadow-xs">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">CUI {profile.header.cui}</Badge>
            <IdentityConfidenceBadge
              input={{
                basis: profile.header.identityBasis,
                reviewStatus: 'accepted',
              }}
            />
            {hasCompanyTwin ? (
              <Badge variant="warning">
                <Trans>apare si ca firma</Trans>
              </Badge>
            ) : null}
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">
              {profile.header.name}
            </h1>
            <p className="flex flex-wrap items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" aria-hidden />
              {locationLabel(profile.header.locality, profile.header.county)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {hasCompanyTwin ? (
            <Button asChild variant="outline">
              <Link to="/companies/$cui" params={{ cui: profile.header.cui }} search={{}}>
                <BriefcaseBusiness className="mr-2 h-4 w-4" aria-hidden />
                <Trans>Vezi firma</Trans>
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link
              to="/ong-uri/$cui"
              params={{ cui: profile.header.cui }}
              search={{ tab: 'dovezi', evidence: true }}
            >
              <FileSearch className="mr-2 h-4 w-4" aria-hidden />
              <Trans>Dovezi</Trans>
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

function ProfileTabNav({
  activeTab,
  onTabChange,
}: {
  readonly activeTab: NgoProfileTab
  readonly onTabChange: (tab: NgoProfileTab) => void
}) {
  return (
    <div
      role="tablist"
      aria-label={t`Sectiuni profil ONG`}
      className="flex gap-2 overflow-x-auto rounded-lg border bg-background p-2"
    >
      {profileTabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`ngo-tabpanel-${tab.id}`}
          id={`ngo-tab-${tab.id}`}
          onClick={() => onTabChange(tab.id)}
          className={[
            'shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            activeTab === tab.id
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          ].join(' ')}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

function EmptyPanel({
  title,
  description,
}: {
  readonly title: ReactNode
  readonly description: ReactNode
}) {
  return (
    <Card className="rounded-lg border-dashed shadow-none">
      <CardContent className="space-y-1 p-6 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">{title}</p>
        <p>{description}</p>
      </CardContent>
    </Card>
  )
}

function IdentityPanel({
  profile,
  onCitationOpen,
}: {
  readonly profile: NgoProfile
  readonly onCitationOpen: (snapshotId: string) => void
}) {
  const confirmedEvidence = profile.evidence.filter(
    (row) => row.identityBasis === 'direct_cui',
  )

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="rounded-lg shadow-none">
        <CardHeader>
          <CardTitle>
            <Trans>Identitate confirmata</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>
              Profilul este ancorat in CUI. Referintele doar dupa nume sunt
              separate mai jos.
            </Trans>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">
                <Trans>Denumire</Trans>
              </dt>
              <dd className="font-medium">{profile.header.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                <Trans>CUI</Trans>
              </dt>
              <dd className="font-mono font-medium">{profile.header.cui}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                <Trans>Judet</Trans>
              </dt>
              <dd>{profile.header.county ?? <Trans>necunoscut</Trans>}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                <Trans>Localitate</Trans>
              </dt>
              <dd>{profile.header.locality ?? <Trans>necunoscuta</Trans>}</dd>
            </div>
          </dl>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">
              <Trans>Surse directe pentru CUI</Trans>
            </h3>
            <div className="flex flex-wrap gap-2">
              {confirmedEvidence.map((row) => (
                <SourceCitationChip
                  key={`${row.sourceSnapshotId}-${row.sourceRecordKey}`}
                  citation={sourceCitation(
                    profile.snapshotsById[row.sourceSnapshotId],
                    row.sourceSnapshotId,
                  )}
                  onOpen={onCitationOpen}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" aria-hidden />
            <Trans>Reguli de incredere</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <Trans>
              Datele ANOFM si MMuncii au CUI direct. MJ si SGG nu au CUI
              fiabil in sursa si raman referinte neconfirmate.
            </Trans>
          </p>
          <p>
            <Trans>
              Campurile MJ document_date/document_number si SGG hg_date,
              recognition_year, order_number nu sunt afisate deoarece sunt
              nepopulate in sursa.
            </Trans>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function SectorPanel({
  rows,
  evidence,
  snapshotsById,
  onCitationOpen,
}: {
  readonly rows: readonly SectorMembership[]
  readonly evidence: readonly EvidenceRecord[]
  readonly snapshotsById: Readonly<Record<string, SourceSnapshot>>
  readonly onCitationOpen: (snapshotId: string) => void
}) {
  if (rows.length === 0) {
    return (
      <EmptyPanel
        title={<Trans>Fara apartenente sectoriale</Trans>}
        description={<Trans>Mockul nu contine randuri RUEIS pentru acest CUI.</Trans>}
      />
    )
  }

  return (
    <Table containerClassName="rounded-lg border">
      <TableHeader>
        <TableRow>
          <TableHead>
            <Trans>Sector</Trans>
          </TableHead>
          <TableHead>
            <Trans>Certificat</Trans>
          </TableHead>
          <TableHead>
            <Trans>Valabil pana la</Trans>
          </TableHead>
          <TableHead>
            <Trans>Stare</Trans>
          </TableHead>
          <TableHead>
            <Trans>Sursa</Trans>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const rowEvidence = evidenceForSnapshot(evidence, row.sourceSnapshotId)
          return (
            <TableRow key={`${row.cui}-${row.certificateNumber ?? row.sourceSnapshotId}`}>
              <TableCell className="font-medium">{row.sector}</TableCell>
              <TableCell>{row.certificateNumber ?? '—'}</TableCell>
              <TableCell>{formatRoDate(row.validUntil)}</TableCell>
              <TableCell>
                <div className="space-y-1">
                  <Badge variant={row.sanctionStatus ? 'warning' : 'secondary'}>
                    {row.status}
                  </Badge>
                  {row.sanctionStatus ? (
                    <p className="text-xs text-amber-800">{row.sanctionStatus}</p>
                  ) : null}
                  <IdentityRowMeta
                    evidence={rowEvidence}
                    className="text-muted-foreground"
                  />
                </div>
              </TableCell>
              <TableCell>
                <SourceCitationChip
                  citation={sourceCitation(
                    snapshotsById[row.sourceSnapshotId],
                    row.sourceSnapshotId,
                  )}
                  onOpen={onCitationOpen}
                />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function AccreditationPanel({
  rows,
  evidence,
  snapshotsById,
  onCitationOpen,
}: {
  readonly rows: readonly Accreditation[]
  readonly evidence: readonly EvidenceRecord[]
  readonly snapshotsById: Readonly<Record<string, SourceSnapshot>>
  readonly onCitationOpen: (snapshotId: string) => void
}) {
  if (rows.length === 0) {
    return (
      <EmptyPanel
        title={<Trans>Fara acreditari ANOFM</Trans>}
        description={<Trans>Nu exista acreditari directe pentru acest CUI in mock.</Trans>}
      />
    )
  }

  return (
    <Table containerClassName="rounded-lg border">
      <TableHeader>
        <TableRow>
          <TableHead>
            <Trans>Autoritate</Trans>
          </TableHead>
          <TableHead>
            <Trans>Tip</Trans>
          </TableHead>
          <TableHead>
            <Trans>Numar</Trans>
          </TableHead>
          <TableHead>
            <Trans>Valabilitate</Trans>
          </TableHead>
          <TableHead>
            <Trans>Sursa</Trans>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const rowEvidence = evidenceForSnapshot(evidence, row.sourceSnapshotId)
          return (
            <TableRow key={`${row.cui}-${row.accreditationNumber ?? row.sourceSnapshotId}`}>
              <TableCell>{row.authority}</TableCell>
              <TableCell className="font-medium">{row.accreditationType}</TableCell>
              <TableCell>{row.accreditationNumber ?? row.registrationCode ?? '—'}</TableCell>
              <TableCell>
                <div className="space-y-1">
                  <span>
                    {formatRoDate(row.validFrom)} - {formatRoDate(row.validUntil)}
                  </span>
                  <IdentityRowMeta
                    evidence={rowEvidence}
                    className="text-muted-foreground"
                  />
                </div>
              </TableCell>
              <TableCell>
                <SourceCitationChip
                  citation={sourceCitation(
                    snapshotsById[row.sourceSnapshotId],
                    row.sourceSnapshotId,
                  )}
                  onOpen={onCitationOpen}
                />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function ServicesPanel({
  profile,
  onCitationOpen,
}: {
  readonly profile: NgoProfile
  readonly onCitationOpen: (snapshotId: string) => void
}) {
  const providerSnapshot =
    profile.provider?.sourceSnapshotId
      ? profile.snapshotsById[profile.provider.sourceSnapshotId]
      : undefined
  const serviceSnapshot = profile.snapshotsById.mmuncii_services_2023_12_11

  return (
    <div className="space-y-4">
      <StaleSnapshotNotice
        snapshotDate={serviceSnapshot?.sourceDeclaredSnapshotDate ?? null}
      />
      {profile.provider ? (
        <Card className="rounded-lg shadow-none">
          <CardHeader>
            <CardTitle>
              <Trans>Furnizor social</Trans>
            </CardTitle>
            <CardDescription>
              {locationLabel(profile.provider.locality, profile.provider.county)}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{profile.provider.status}</Badge>
            <span className="text-sm text-muted-foreground">
              {profile.provider.licenseNumber ?? <Trans>licenta necunoscuta</Trans>}
            </span>
            <SourceCitationChip
              citation={sourceCitation(
                providerSnapshot,
                profile.provider.sourceSnapshotId,
              )}
              onOpen={onCitationOpen}
            />
          </CardContent>
        </Card>
      ) : (
        <EmptyPanel
          title={<Trans>Fara rand de furnizor social</Trans>}
          description={<Trans>Acest profil nu are furnizor MMuncii direct.</Trans>}
        />
      )}

      {profile.services.length > 0 ? (
        <Table containerClassName="rounded-lg border">
          <TableHeader>
            <TableRow>
              <TableHead>
                <Trans>Serviciu</Trans>
              </TableHead>
              <TableHead>
                <Trans>Tip</Trans>
              </TableHead>
              <TableHead>
                <Trans>Capacitate</Trans>
              </TableHead>
              <TableHead>
                <Trans>Valabil pana la</Trans>
              </TableHead>
              <TableHead>
                <Trans>Sursa</Trans>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profile.services.map((service) => (
              <ServiceRow
                key={`${service.providerCui}-${service.serviceName}`}
                service={service}
                snapshot={profile.snapshotsById[service.sourceSnapshotId]}
                onCitationOpen={onCitationOpen}
              />
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyPanel
          title={<Trans>Fara servicii licentiate in mock</Trans>}
          description={<Trans>Serviciile pot aparea doar in descoperirea nationala.</Trans>}
        />
      )}
    </div>
  )
}

function ServiceRow({
  service,
  snapshot,
  onCitationOpen,
}: {
  readonly service: SocialService
  readonly snapshot: SourceSnapshot | undefined
  readonly onCitationOpen: (snapshotId: string) => void
}) {
  const state: NgoValidityState =
    service.validUntil && new Date(service.validUntil).getTime() < Date.now()
      ? 'expired'
      : 'active'

  return (
    <TableRow>
      <TableCell className="font-medium">{service.serviceName}</TableCell>
      <TableCell>{service.serviceType ?? <Trans>necunoscut</Trans>}</TableCell>
      <TableCell>{formatRoNumber(service.capacity)}</TableCell>
      <TableCell>
        <div className="space-y-1">
          <DataStatusBadge
            variant={serviceValidityVariant(state)}
            label={
              state === 'expired' ? <Trans>Expirat</Trans> : <Trans>Activ</Trans>
            }
          />
          <p className="text-xs text-muted-foreground">
            {formatRoDate(service.validUntil)}
          </p>
        </div>
      </TableCell>
      <TableCell>
        <SourceCitationChip
          citation={sourceCitation(snapshot, service.sourceSnapshotId)}
          onOpen={onCitationOpen}
        />
      </TableCell>
    </TableRow>
  )
}

function NameOnlyPanel({
  legalRows,
  utilityRows,
  candidateRows,
  snapshotsById,
  onCitationOpen,
}: {
  readonly legalRows: readonly LegalRegistryRecord[]
  readonly utilityRows: readonly PublicUtilityStatus[]
  readonly candidateRows: NgoProfile['candidateMatches']
  readonly snapshotsById: Readonly<Record<string, SourceSnapshot>>
  readonly onCitationOpen: (snapshotId: string) => void
}) {
  if (
    legalRows.length === 0 &&
    utilityRows.length === 0 &&
    candidateRows.length === 0
  ) {
    return (
      <EmptyPanel
        title={<Trans>Fara referinte neconfirmate</Trans>}
        description={<Trans>Mockul nu are randuri MJ/SGG pentru acest profil.</Trans>}
      />
    )
  }

  return (
    <UnconfirmedReferencesZone>
      {legalRows.map((row) => (
        <Card key={`${row.sourceSnapshotId}-${row.registryNumber}`} className="rounded-lg shadow-none">
          <CardHeader className="p-4">
            <CardTitle className="text-base">{row.organizationName}</CardTitle>
            <CardDescription>
              {row.legalForm ?? <Trans>forma juridica necunoscuta</Trans>} ·{' '}
              {row.courtName ?? <Trans>instanta necunoscuta</Trans>}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0 text-sm">
            <p>
              <Trans>Numar registru</Trans>: {row.registryNumber ?? '—'}
            </p>
            <IdentityRowMeta
              basis="name_review"
              reviewStatus="review_pending"
              confidence={null}
            />
            <SourceCitationChip
              citation={sourceCitation(
                snapshotsById[row.sourceSnapshotId],
                row.sourceSnapshotId,
              )}
              onOpen={onCitationOpen}
            />
          </CardContent>
        </Card>
      ))}

      {utilityRows.map((row) => (
        <Card key={`${row.sourceSnapshotId}-${row.organizationName}`} className="rounded-lg shadow-none">
          <CardHeader className="p-4">
            <CardTitle className="text-base">{row.organizationName}</CardTitle>
            <CardDescription>
              <Trans>Utilitate publica mentionata de SGG</Trans>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0 text-sm">
            <p>
              <Trans>Autoritate</Trans>: {row.recognizingAuthority ?? '—'}
            </p>
            <p>
              <Trans>Numar HG</Trans>: {row.hgNumber ?? '—'}
            </p>
            <p>
              <Trans>Stare</Trans>: {row.status ?? '—'}
            </p>
            <IdentityRowMeta
              basis="name_review"
              reviewStatus="review_pending"
              confidence={null}
            />
            <SourceCitationChip
              citation={sourceCitation(
                snapshotsById[row.sourceSnapshotId],
                row.sourceSnapshotId,
              )}
              onOpen={onCitationOpen}
            />
          </CardContent>
        </Card>
      ))}

      {candidateRows.map((row, index) => (
        <Card key={`${row.evidenceName}-${index}`} className="rounded-lg shadow-none">
          <CardHeader className="p-4">
            <CardTitle className="text-base">
              <Trans>Posibila potrivire</Trans>
            </CardTitle>
            <CardDescription>
              {row.evidenceName} → {row.candidateName ?? row.candidateCui ?? '—'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0 text-sm">
            <IdentityRowMeta
              basis="name_review"
              reviewStatus="review_pending"
              confidence={row.confidence}
              linkReviewCaseId={`candidate-${index}`}
            />
            <p className="text-muted-foreground">{row.decisionNotes}</p>
          </CardContent>
        </Card>
      ))}
    </UnconfirmedReferencesZone>
  )
}

function FinancialPanel() {
  return (
    <Alert className="border-blue-200 bg-blue-50/60">
      <CircleDollarSign className="h-4 w-4 text-blue-700" aria-hidden />
      <AlertTitle className="text-blue-950">
        <Trans>Indicatorii financiari sunt in curs de incarcare</Trans>
      </AlertTitle>
      <AlertDescription className="text-blue-950/80">
        <Trans>
          Tabela ngo.financial_indicators are 0 randuri in acest moment. Sectiunea
          ramane vizibila ca stare explicita, nu ca lipsa de interfata.
        </Trans>
      </AlertDescription>
    </Alert>
  )
}

function FundingCard({ item }: { readonly item: FundingSourceSummary }) {
  return (
    <Card className="rounded-lg shadow-none">
      <CardHeader className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{item.label}</CardTitle>
            <CardDescription>
              {item.joinKey.toUpperCase()} {item.joinValue}
            </CardDescription>
          </div>
          <Badge variant={item.available ? 'secondary' : 'warning'}>
            {item.available ? <Trans>conectat</Trans> : <Trans>neconectat</Trans>}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-0 text-sm">
        <p>
          <Trans>Inregistrari</Trans>: {formatRoNumber(item.recordCount)}
        </p>
        <p>
          <Trans>Total</Trans>:{' '}
          {item.totalAmount
            ? formatRoMoney(item.totalAmount.value, item.totalAmount.currency)
            : '—'}
        </p>
        <p className="text-muted-foreground">
          <Trans>Ultima aparitie</Trans>: {formatRoDate(item.lastSeen)}
        </p>
      </CardContent>
    </Card>
  )
}

function FundingPanel({
  funding,
  isLoading,
}: {
  readonly funding: PublicFunding | null
  readonly isLoading: boolean
}) {
  if (isLoading && !funding) {
    return <Skeleton className="h-40 rounded-lg" />
  }

  if (!funding) {
    return (
      <EmptyPanel
        title={<Trans>Fara legaturi de finantare</Trans>}
        description={<Trans>Nu exista mock de fonduri pentru acest CUI.</Trans>}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {funding.funding.map((item) => (
          <FundingCard key={item.source} item={item} />
        ))}
      </div>

      {funding.related.length > 0 ? (
        <Card className="rounded-lg shadow-none">
          <CardHeader>
            <CardTitle>
              <Trans>Legaturi entitati</Trans>
            </CardTitle>
            <CardDescription>
              <Trans>Trimiteri bazate pe CUI sau SIRUTA, fara reclasificare.</Trans>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {funding.related.map((link) => (
              <Button key={`${link.kind}-${link.href}`} asChild variant="outline">
                <a href={link.href}>
                  {link.label}
                  <ExternalLink className="ml-2 h-4 w-4" aria-hidden />
                </a>
              </Button>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function ProfileTabContent({
  activeTab,
  profile,
  funding,
  isFundingLoading,
  evidenceOpen,
  onCitationOpen,
}: {
  readonly activeTab: NgoProfileTab
  readonly profile: NgoProfile
  readonly funding: PublicFunding | null
  readonly isFundingLoading: boolean
  readonly evidenceOpen: boolean
  readonly onCitationOpen: (snapshotId: string) => void
}) {
  if (activeTab === 'identitate') {
    return <IdentityPanel profile={profile} onCitationOpen={onCitationOpen} />
  }

  if (activeTab === 'sectorial') {
    return (
      <SectorPanel
        rows={profile.sectorMemberships}
        evidence={profile.evidence}
        snapshotsById={profile.snapshotsById}
        onCitationOpen={onCitationOpen}
      />
    )
  }

  if (activeTab === 'acreditari') {
    return (
      <AccreditationPanel
        rows={profile.accreditations}
        evidence={profile.evidence}
        snapshotsById={profile.snapshotsById}
        onCitationOpen={onCitationOpen}
      />
    )
  }

  if (activeTab === 'servicii') {
    return <ServicesPanel profile={profile} onCitationOpen={onCitationOpen} />
  }

  if (activeTab === 'registru') {
    return (
      <NameOnlyPanel
        legalRows={profile.legalRegistry}
        utilityRows={[]}
        candidateRows={profile.candidateMatches}
        snapshotsById={profile.snapshotsById}
        onCitationOpen={onCitationOpen}
      />
    )
  }

  if (activeTab === 'utilitate') {
    return (
      <NameOnlyPanel
        legalRows={[]}
        utilityRows={profile.publicUtility}
        candidateRows={profile.candidateMatches}
        snapshotsById={profile.snapshotsById}
        onCitationOpen={onCitationOpen}
      />
    )
  }

  if (activeTab === 'financiar') {
    return <FinancialPanel />
  }

  if (activeTab === 'fonduri') {
    return <FundingPanel funding={funding} isLoading={isFundingLoading} />
  }

  return (
    <Card className="rounded-lg shadow-none">
      <CardHeader>
        <CardTitle>
          <Trans>Trail de dovezi</Trans>
        </CardTitle>
        <CardDescription>
          <Trans>Toate randurile de evidenta grupate dupa tipul sursei.</Trans>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <EvidenceTrail
          evidence={profile.evidence}
          snapshotsById={profile.snapshotsById}
          defaultOpen={evidenceOpen}
          onCitationOpen={onCitationOpen}
        />
      </CardContent>
    </Card>
  )
}

export function NgoProfilePage({
  cui,
  initialProfile,
  initialFunding,
  tab,
  evidenceOpen = false,
}: NgoProfilePageProps) {
  const navigate = useNavigate({ from: '/ong-uri/$cui' })
  const activeTab = tab ?? 'identitate'
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(
    null,
  )
  const profileQuery = useNgoProfile(cui)
  const fundingQuery = useNgoPublicFunding(cui)
  // Widened deliberately: a failed query can leave us with no profile at all,
  // and the guards below have to be able to tell that apart from "the register
  // answered, and this CUI is not in it".
  const profile: NgoProfile | null = profileQuery.data ?? initialProfile ?? null
  const funding = fundingQuery.data ?? initialFunding

  const selectedSnapshot = selectedSnapshotId
    ? (profile?.snapshotsById[selectedSnapshotId] ?? null)
    : null

  const directSourceCount = useMemo(
    () =>
      new Set(
        (profile?.evidence ?? [])
          .filter((row) => row.identityBasis === 'direct_cui')
          .map((row) => row.sourceSnapshotId),
      ).size,
    [profile?.evidence],
  )

  const setTab = (nextTab: NgoProfileTab) => {
    void navigate({
      to: '/ong-uri/$cui',
      params: { cui },
      search: (previous) => ({
        ...previous,
        tab: nextTab,
      }),
    })
  }

  if (profileQuery.isLoading && !profile) {
    return <ProfileSkeleton />
  }

  if (!profile) {
    // Order matters. "ONG negasit" is a claim about the register, so it is only
    // honest once a *successful* response actually came back empty. Anything
    // else — a failed request, or a query paused because the browser is offline
    // — is a fetch problem and has to offer a retry instead.
    if (profileQuery.status !== 'success') {
      return (
        <NgoProfileErrorPanel
          onRetry={() => {
            void profileQuery.refetch()
          }}
          isRetrying={profileQuery.isFetching}
        />
      )
    }

    return <NgoProfileNotFound />
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 md:px-6">
      {profileQuery.isError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" aria-hidden />
          <AlertTitle>
            <Trans>Revalidarea profilului a esuat</Trans>
          </AlertTitle>
          <AlertDescription>
            <Trans>Se afiseaza datele incarcate initial din ruta.</Trans>
          </AlertDescription>
        </Alert>
      ) : null}

      <ProfileHeader profile={profile} />

      <section className="grid gap-3 md:grid-cols-4">
        <MetricCard
          label={<Trans>Surse directe</Trans>}
          value={directSourceCount}
          description={<Trans>instantanee cu baza identitate CUI</Trans>}
        />
        <MetricCard
          label={<Trans>Apartenente</Trans>}
          value={profile.sectorMemberships.length}
          description={<Trans>RUEIS si alte registre sectoriale</Trans>}
        />
        <MetricCard
          label={<Trans>Servicii sociale</Trans>}
          value={profile.services.length}
          description={<Trans>licente asociate furnizorului</Trans>}
        />
        <MetricCard
          label={<Trans>Financiar</Trans>}
          value={profile.financials.length}
          description={<Trans>randuri ANAF incarcate momentan</Trans>}
        />
      </section>

      {profile.services.length > 0 ? (
        <StaleSnapshotNotice snapshotDate="2023-12-11" />
      ) : null}

      <ProfileTabNav activeTab={activeTab} onTabChange={setTab} />

      <section
        role="tabpanel"
        id={`ngo-tabpanel-${activeTab}`}
        aria-labelledby={`ngo-tab-${activeTab}`}
        className="min-h-[24rem]"
      >
        <ProfileTabContent
          activeTab={activeTab}
          profile={profile}
          funding={funding}
          isFundingLoading={fundingQuery.isLoading && !funding}
          evidenceOpen={evidenceOpen}
          onCitationOpen={setSelectedSnapshotId}
        />
      </section>

      <SourceProvenanceDrawer
        snapshot={selectedSnapshot}
        authorityLabel={snapshotAuthorityLabel(selectedSnapshot)}
        open={selectedSnapshotId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedSnapshotId(null)
        }}
        fromLabel={`ONG ${cui}`}
      />
    </main>
  )
}
