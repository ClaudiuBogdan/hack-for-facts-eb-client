import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Database,
  FileSearch,
  Search,
  ShieldCheck,
  Stethoscope,
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
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DataStatusBadge,
  FreshnessBadge,
} from '@/components/provenance/source-provenance'
import type { DomainCoverage, SourceCoverageRow } from '@/schemas/ngos'
import { normalizeNgoCui } from '../lib/normalize-ngo-cui'
import { useNgoDomainCoverage } from '../hooks/use-ngos'
import {
  formatRoDate,
  formatRoNumber,
  sourceStatusVariant,
} from './ngo-formatting'

type NgoLandingPageProps = {
  readonly initialCoverage: DomainCoverage | null
}

const profileSamples = [
  {
    cui: '12345678',
    name: 'Asociatia Diaconia Sociala',
    description: <Trans>profil complet, servicii sociale si surse directe</Trans>,
  },
  {
    cui: '87654321',
    name: 'Fundatia Inima de Copil',
    description: <Trans>CUI care apare si ca firma</Trans>,
  },
  {
    cui: '9990003',
    name: 'Asociatia Lumina',
    description: <Trans>referinte MJ/SGG neconfirmate prin nume</Trans>,
  },
] as const

function CoverageSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-28 rounded-lg" />
      ))}
    </div>
  )
}

function SourceCoverageCard({ row }: { readonly row: SourceCoverageRow }) {
  return (
    <Card className="rounded-lg shadow-none">
      <CardHeader className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-sm leading-snug">
              {row.authorityLabel}
            </CardTitle>
            <CardDescription className="mt-1 text-xs">
              {row.contentLabel}
            </CardDescription>
          </div>
          <DataStatusBadge variant={sourceStatusVariant(row.status)} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">
              <Trans>Randuri</Trans>
            </p>
            <p className="font-mono font-semibold tabular-nums">
              {formatRoNumber(row.rowCount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              <Trans>Instantaneu</Trans>
            </p>
            <p className="font-medium">{formatRoDate(row.lastSnapshotDate)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {row.isNameOnly ? (
            <Badge variant="warning">
              <Trans>doar referinta dupa nume</Trans>
            </Badge>
          ) : null}
          {row.sourceSnapshotId ? (
            <Button asChild variant="ghost" size="sm" className="h-8 px-2">
              <Link
                to="/ong-uri/sursa/$snapshotId"
                params={{ snapshotId: row.sourceSnapshotId }}
                search={{ from: 'landing' }}
              >
                <Trans>Dovezi sursa</Trans>
              </Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

export function NgoLandingPage({ initialCoverage }: NgoLandingPageProps) {
  const navigate = useNavigate({ from: '/ong-uri' })
  const [searchValue, setSearchValue] = useState('')
  const coverageQuery = useNgoDomainCoverage()
  const coverage = coverageQuery.data ?? initialCoverage

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const cui = normalizeNgoCui(searchValue)
    if (!cui) return
    void navigate({
      to: '/ong-uri/$cui',
      params: { cui },
      search: { tab: 'identitate' },
    })
  }

  const loadedCount =
    coverage?.rows.filter((row) => row.status === 'loaded').length ?? 0
  const staleCount =
    coverage?.rows.filter((row) => row.status === 'loaded_stale').length ?? 0
  const nameOnlyCount =
    coverage?.rows.filter((row) => row.status === 'name_only').length ?? 0

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">
      <section className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <Badge variant="secondary" className="w-fit">
              <Trans>Mock-first: date modelate dupa sursele reale</Trans>
            </Badge>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-normal text-foreground md:text-4xl">
                <Trans>ONG-uri si servicii sociale</Trans>
              </h1>
              <p className="text-base text-muted-foreground md:text-lg">
                <Trans>
                  Explorare pentru organizatii neguvernamentale, furnizori de
                  servicii sociale, surse oficiale si legaturi de finantare.
                </Trans>
              </p>
            </div>
          </div>

          <form
            className="flex w-full max-w-md gap-2"
            onSubmit={submitSearch}
            role="search"
          >
            <Input
              value={searchValue}
              onChange={(event) => setSearchValue(event.currentTarget.value)}
              inputMode="numeric"
              placeholder={t`Cauta dupa CUI`}
              aria-label={t`Cauta ONG dupa CUI`}
            />
            <Button type="submit" className="shrink-0">
              <Search className="mr-2 h-4 w-4" aria-hidden />
              <Trans>Cauta</Trans>
            </Button>
          </form>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Card className="rounded-lg shadow-none">
            <CardHeader className="p-4">
              <CardDescription>
                <Trans>Incarcare prod</Trans>
              </CardDescription>
              <CardTitle className="font-mono text-2xl">
                {coverage?.lastFullLoad.runId ?? '—'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-sm text-muted-foreground">
              <Trans>run</Trans> {coverage?.lastFullLoad.date ?? '—'} ·{' '}
              {coverage?.lastFullLoad.gate ?? '—'}
            </CardContent>
          </Card>
          <Card className="rounded-lg shadow-none">
            <CardHeader className="p-4">
              <CardDescription>
                <Trans>Randuri incarcate</Trans>
              </CardDescription>
              <CardTitle className="font-mono text-2xl">
                {formatRoNumber(coverage?.lastFullLoad.rowsLoaded)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-sm text-muted-foreground">
              <Trans>organizatii si dovezi directe in schema ngo</Trans>
            </CardContent>
          </Card>
          <Card className="rounded-lg shadow-none">
            <CardHeader className="p-4">
              <CardDescription>
                <Trans>Surse directe active</Trans>
              </CardDescription>
              <CardTitle className="font-mono text-2xl">
                {loadedCount}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-sm text-muted-foreground">
              <Trans>{staleCount} surse incarcate dar vechi</Trans>
            </CardContent>
          </Card>
          <Card className="rounded-lg shadow-none">
            <CardHeader className="p-4">
              <CardDescription>
                <Trans>Referinte neconfirmate</Trans>
              </CardDescription>
              <CardTitle className="font-mono text-2xl">
                {nameOnlyCount}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-sm text-muted-foreground">
              <Trans>MJ si SGG sunt afisate separat, nu ca identitate CUI</Trans>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">
                <Trans>Acoperirea surselor</Trans>
              </h2>
              <p className="text-sm text-muted-foreground">
                <Trans>
                  Matricea arata ce este incarcat, ce este vechi si ce ramane
                  doar referinta dupa nume.
                </Trans>
              </p>
            </div>
            {coverageQuery.isFetching && coverage ? (
              <DataStatusBadge variant="partial" label={<Trans>Se revalideaza</Trans>} />
            ) : null}
          </div>

          {coverageQuery.isLoading && !coverage ? (
            <CoverageSkeleton />
          ) : coverageQuery.isError && !coverage ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" aria-hidden />
              <AlertTitle>
                <Trans>Nu am putut incarca acoperirea</Trans>
              </AlertTitle>
              <AlertDescription>
                <Trans>Verifica modul mock sau conexiunea API live.</Trans>
              </AlertDescription>
            </Alert>
          ) : coverage && coverage.rows.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {coverage.rows.map((row) => (
                <SourceCoverageCard key={row.sourceId} row={row} />
              ))}
            </div>
          ) : (
            <Card className="rounded-lg border-dashed shadow-none">
              <CardContent className="p-6 text-sm text-muted-foreground">
                <Trans>Nicio sursa ONG nu este disponibila in mock.</Trans>
              </CardContent>
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          <Card className="rounded-lg shadow-none">
            <CardHeader className="p-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Stethoscope className="h-4 w-4" aria-hidden />
                <Trans>Descoperire servicii sociale</Trans>
              </CardTitle>
              <CardDescription>
                <Trans>filtre dupa judet, tip serviciu, valabilitate si capacitate</Trans>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Button asChild className="w-full">
                <Link to="/ong-uri/servicii" search={{ valid: 'active', view: 'lista' }}>
                  <Trans>Deschide serviciile</Trans>
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-lg shadow-none">
            <CardHeader className="p-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" aria-hidden />
                <Trans>Profiluri exemplu</Trans>
              </CardTitle>
              <CardDescription>
                <Trans>stari utile pentru QA pana la conectarea backendului</Trans>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              {profileSamples.map((sample) => (
                <Button
                  key={sample.cui}
                  asChild
                  variant="outline"
                  className="h-auto w-full justify-start px-3 py-2 text-left"
                >
                  <Link
                    to="/ong-uri/$cui"
                    params={{ cui: sample.cui }}
                    search={{ tab: 'identitate' }}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {sample.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        CUI {sample.cui} · {sample.description}
                      </span>
                    </span>
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>

          <Alert className="border-amber-200 bg-amber-50/50">
            <ShieldCheck className="h-4 w-4 text-amber-700" aria-hidden />
            <AlertTitle className="text-amber-900">
              <Trans>Limite cunoscute</Trans>
            </AlertTitle>
            <AlertDescription className="space-y-2 text-amber-900/80">
              {coverage?.knownGaps.map((gap) => (
                <p key={gap}>{gap}</p>
              )) ?? (
                <p>
                  <Trans>Acoperirea se incarca din mockurile locale.</Trans>
                </p>
              )}
            </AlertDescription>
          </Alert>

          <Card className="rounded-lg shadow-none">
            <CardHeader className="p-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-4 w-4" aria-hidden />
                <Trans>Urmatoarele suprafete</Trans>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0 text-sm text-muted-foreground">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <FileSearch className="h-4 w-4" aria-hidden />
                  <Trans>Registru MJ dupa nume</Trans>
                </span>
                <Badge variant="secondary">
                  <Trans>amanat</Trans>
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <FileSearch className="h-4 w-4" aria-hidden />
                  <Trans>Utilitate publica SGG</Trans>
                </span>
                <Badge variant="secondary">
                  <Trans>amanat</Trans>
                </Badge>
              </div>
              <FreshnessBadge date={coverage?.lastFullLoad.date ?? null} />
            </CardContent>
          </Card>
        </aside>
      </section>
    </main>
  )
}
