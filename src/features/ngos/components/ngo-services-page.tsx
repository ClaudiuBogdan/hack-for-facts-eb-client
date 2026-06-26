import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import {
  AlertCircle,
  ArrowDownAZ,
  Layers,
  ListFilter,
  MapPinned,
  Search,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  DataStatusBadge,
  FreshnessBadge,
  StaleSnapshotNotice,
} from '@/components/provenance/source-provenance'
import type {
  CountyServiceAggregate,
  NgoServicesSearch,
  ServiceDiscoveryResult,
  ServiceDiscoveryRow,
} from '@/schemas/ngos'
import { useNgoServiceDiscovery } from '../hooks/use-ngos'
import {
  formatRoDate,
  formatRoNumber,
  locationLabel,
  serviceRowMatchesQuery,
  serviceValidityVariant,
} from './ngo-formatting'

type NgoServicesPageProps = {
  readonly initialResult: ServiceDiscoveryResult | null
  readonly search: NgoServicesSearch
}

type SearchPatch = Partial<NgoServicesSearch>

function ServicesSkeleton() {
  return (
    <main className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6 md:px-6">
      <Skeleton className="h-36 rounded-lg" />
      <Skeleton className="h-28 rounded-lg" />
      <Skeleton className="h-80 rounded-lg" />
    </main>
  )
}

function serviceTypeLabel(type: string | null): string {
  if (!type) return t`necunoscut`
  return type.replace(/_/g, ' ')
}

function statusLabel(row: ServiceDiscoveryRow) {
  if (row.derivedStatus === 'expired') return <Trans>Expirat</Trans>
  if (row.derivedStatus === 'expiring') return <Trans>Expira curand</Trans>
  return <Trans>Activ</Trans>
}

function filterRows(
  rows: readonly ServiceDiscoveryRow[],
  search: NgoServicesSearch,
): ServiceDiscoveryRow[] {
  return rows
    .filter((row) => serviceRowMatchesQuery(row, search.q))
    .filter((row) => !search.county || row.county === search.county)
    .filter((row) => !search.locality || row.locality === search.locality)
    .filter(
      (row) => !search.service_type || row.serviceType === search.service_type,
    )
    .filter((row) => {
      if (search.valid === 'all') return true
      if (search.valid === 'expired') return row.derivedStatus === 'expired'
      return row.derivedStatus !== 'expired'
    })
    .filter((row) => (row.capacity ?? 0) >= (search.capacity_min ?? 0))
}

function sortRows(
  rows: readonly ServiceDiscoveryRow[],
  sort: NgoServicesSearch['sort'],
): ServiceDiscoveryRow[] {
  const copy = [...rows]
  if (sort === 'capacitate') {
    return copy.sort((a, b) => (b.capacity ?? 0) - (a.capacity ?? 0))
  }
  if (sort === 'valabilitate') {
    return copy.sort((a, b) =>
      String(a.validUntil ?? '').localeCompare(String(b.validUntil ?? '')),
    )
  }
  if (sort === 'judet') {
    return copy.sort((a, b) =>
      String(a.county ?? '').localeCompare(String(b.county ?? ''), 'ro'),
    )
  }
  return copy.sort((a, b) => a.serviceName.localeCompare(b.serviceName, 'ro'))
}

function buildFilteredAggregates(
  rows: readonly ServiceDiscoveryRow[],
): CountyServiceAggregate[] {
  const byCounty = new Map<
    string,
    {
      readonly name: string
      readonly providers: Set<string>
      serviceCount: number
      readonly byServiceType: Map<string, number>
    }
  >()

  for (const row of rows) {
    const code = row.county ?? 'NEC'
    const current =
      byCounty.get(code) ??
      {
        name: row.county ?? t`Necunoscut`,
        providers: new Set<string>(),
        serviceCount: 0,
        byServiceType: new Map<string, number>(),
      }
    current.providers.add(row.providerCui)
    current.serviceCount += 1
    const serviceType = row.serviceType ?? t`necunoscut`
    current.byServiceType.set(
      serviceType,
      (current.byServiceType.get(serviceType) ?? 0) + 1,
    )
    byCounty.set(code, current)
  }

  return Array.from(byCounty.entries()).map(([countyCode, entry]) => ({
    countyCode,
    countyName: entry.name,
    providerCount: entry.providers.size,
    serviceCount: entry.serviceCount,
    byServiceType: Object.fromEntries(entry.byServiceType),
  }))
}

function FilterSelect({
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  readonly label: ReactNode
  readonly value: string | undefined
  readonly placeholder: string
  readonly options: readonly string[]
  readonly onChange: (value: string | undefined) => void
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <Select
        value={value ?? '__all'}
        onValueChange={(next) => onChange(next === '__all' ? undefined : next)}
      >
        <SelectTrigger aria-label={placeholder}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all">{placeholder}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}

function ServicesFilters({
  result,
  search,
  onPatch,
}: {
  readonly result: ServiceDiscoveryResult
  readonly search: NgoServicesSearch
  readonly onPatch: (patch: SearchPatch) => void
}) {
  const [query, setQuery] = useState(search.q ?? '')
  const counties = useMemo(
    () =>
      Array.from(
        new Set(result.rows.map((row) => row.county).filter(Boolean)),
      ).sort((a, b) => String(a).localeCompare(String(b), 'ro')) as string[],
    [result.rows],
  )
  const serviceTypes = useMemo(
    () =>
      Array.from(
        new Set(result.rows.map((row) => row.serviceType).filter(Boolean)),
      ).sort((a, b) => String(a).localeCompare(String(b), 'ro')) as string[],
    [result.rows],
  )

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onPatch({ q: query.trim() || undefined, page: 1 })
  }

  return (
    <Card className="rounded-lg shadow-none">
      <CardHeader className="p-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListFilter className="h-4 w-4" aria-hidden />
          <Trans>Filtre servicii</Trans>
        </CardTitle>
        <CardDescription>
          <Trans>URL-ul pastreaza filtrele pentru analiza si partajare.</Trans>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0">
        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={submit}>
          <Input
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder={t`Nume furnizor, serviciu, CUI sau licenta`}
            aria-label={t`Cauta in servicii sociale`}
          />
          <Button type="submit" className="sm:w-auto">
            <Search className="mr-2 h-4 w-4" aria-hidden />
            <Trans>Cauta</Trans>
          </Button>
        </form>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <FilterSelect
            label={<Trans>Judet</Trans>}
            value={search.county}
            placeholder={t`Toate judetele`}
            options={counties}
            onChange={(county) => onPatch({ county, page: 1 })}
          />
          <FilterSelect
            label={<Trans>Tip serviciu</Trans>}
            value={search.service_type}
            placeholder={t`Toate tipurile`}
            options={serviceTypes}
            onChange={(serviceType) =>
              onPatch({ service_type: serviceType, page: 1 })
            }
          />
          <label className="space-y-1 text-sm">
            <span className="font-medium">
              <Trans>Valabilitate</Trans>
            </span>
            <Select
              value={search.valid ?? 'active'}
              onValueChange={(valid) =>
                onPatch({
                  valid: valid as NgoServicesSearch['valid'],
                  page: 1,
                })
              }
            >
              <SelectTrigger aria-label={t`Filtru valabilitate`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t`Active`}</SelectItem>
                <SelectItem value="expired">{t`Expirate`}</SelectItem>
                <SelectItem value="all">{t`Toate`}</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">
              <Trans>Sortare</Trans>
            </span>
            <Select
              value={search.sort ?? 'nume'}
              onValueChange={(sort) =>
                onPatch({
                  sort: sort as NgoServicesSearch['sort'],
                  page: 1,
                })
              }
            >
              <SelectTrigger aria-label={t`Sortare servicii`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nume">{t`Nume`}</SelectItem>
                <SelectItem value="judet">{t`Judet`}</SelectItem>
                <SelectItem value="capacitate">{t`Capacitate`}</SelectItem>
                <SelectItem value="valabilitate">{t`Valabilitate`}</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">
              <Trans>Capacitate minima</Trans>
            </span>
            <Input
              type="number"
              min={0}
              value={search.capacity_min ?? 0}
              onChange={(event) =>
                onPatch({
                  capacity_min: Number.parseInt(event.currentTarget.value, 10) || 0,
                  page: 1,
                })
              }
              aria-label={t`Capacitate minima`}
            />
          </label>
        </div>
      </CardContent>
    </Card>
  )
}

function ServicesTable({
  rows,
}: {
  readonly rows: readonly ServiceDiscoveryRow[]
}) {
  if (rows.length === 0) {
    return (
      <Card className="rounded-lg border-dashed shadow-none">
        <CardContent className="p-6 text-sm text-muted-foreground">
          <Trans>Niciun serviciu nu corespunde filtrelor curente.</Trans>
        </CardContent>
      </Card>
    )
  }

  return (
    <Table containerClassName="rounded-lg border">
      <TableHeader>
        <TableRow>
          <TableHead>
            <Trans>Serviciu</Trans>
          </TableHead>
          <TableHead>
            <Trans>Furnizor</Trans>
          </TableHead>
          <TableHead>
            <Trans>Localizare</Trans>
          </TableHead>
          <TableHead>
            <Trans>Capacitate</Trans>
          </TableHead>
          <TableHead>
            <Trans>Valabilitate</Trans>
          </TableHead>
          <TableHead>
            <Trans>Instantaneu</Trans>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={`${row.providerCui}-${row.serviceName}`}>
            <TableCell className="min-w-56">
              <p className="font-medium">{row.serviceName}</p>
              <p className="text-xs text-muted-foreground">
                {serviceTypeLabel(row.serviceType)}
              </p>
            </TableCell>
            <TableCell className="min-w-52">
              <Button asChild variant="link" className="h-auto p-0 text-left">
                <Link
                  to="/ong-uri/$cui"
                  params={{ cui: row.providerCui }}
                  search={{ tab: 'servicii' }}
                >
                  {row.providerName}
                </Link>
              </Button>
              <p className="font-mono text-xs text-muted-foreground">
                CUI {row.providerCui}
              </p>
            </TableCell>
            <TableCell>
              {locationLabel(row.locality, row.county)}
            </TableCell>
            <TableCell className="font-mono tabular-nums">
              {formatRoNumber(row.capacity)}
            </TableCell>
            <TableCell>
              <DataStatusBadge
                variant={serviceValidityVariant(row.derivedStatus)}
                label={statusLabel(row)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {formatRoDate(row.validUntil)}
              </p>
            </TableCell>
            <TableCell>
              <FreshnessBadge
                date={row.snapshotDate}
                stale={row.snapshotDate === '2023-12-11'}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function CountyAggregateView({
  aggregates,
  unit,
}: {
  readonly aggregates: readonly CountyServiceAggregate[]
  readonly unit: NgoServicesSearch['unit']
}) {
  if (aggregates.length === 0) {
    return (
      <Card className="rounded-lg border-dashed shadow-none">
        <CardContent className="p-6 text-sm text-muted-foreground">
          <Trans>Nicio agregare judeteana pentru filtrele curente.</Trans>
        </CardContent>
      </Card>
    )
  }

  const maxValue = Math.max(
    ...aggregates.map((row) =>
      unit === 'furnizori' ? row.providerCount : row.serviceCount,
    ),
    1,
  )

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {aggregates.map((row) => {
        const value = unit === 'furnizori' ? row.providerCount : row.serviceCount
        return (
          <Card key={row.countyCode} className="rounded-lg shadow-none">
            <CardHeader className="p-4">
              <CardTitle className="text-base">{row.countyName}</CardTitle>
              <CardDescription>
                {formatRoNumber(row.providerCount)} <Trans>furnizori</Trans> ·{' '}
                {formatRoNumber(row.serviceCount)} <Trans>servicii</Trans>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <div
                className="h-2 overflow-hidden rounded-full bg-muted"
                aria-label={t`Pondere judeteana`}
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(8, (value / maxValue) * 100)}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(row.byServiceType).map(([type, count]) => (
                  <Badge key={type} variant="secondary">
                    {serviceTypeLabel(type)}: {formatRoNumber(count)}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function ServicesPagination({
  page,
  pageSize,
  total,
  onPatch,
}: {
  readonly page: number
  readonly pageSize: number
  readonly total: number
  readonly onPatch: (patch: SearchPatch) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="flex flex-col items-center justify-between gap-3 rounded-lg border bg-card p-3 text-sm md:flex-row">
      <p className="text-muted-foreground">
        <Trans>Pagina</Trans> {page} / {totalPages} · {formatRoNumber(total)}{' '}
        <Trans>rezultate</Trans>
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPatch({ page: Math.max(1, page - 1) })}
        >
          <Trans>Anterior</Trans>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPatch({ page: Math.min(totalPages, page + 1) })}
        >
          <Trans>Urmator</Trans>
        </Button>
      </div>
    </div>
  )
}

export function NgoServicesPage({
  initialResult,
  search,
}: NgoServicesPageProps) {
  const navigate = useNavigate({ from: '/ong-uri/servicii' })
  const serviceQuery = useNgoServiceDiscovery()
  const result = serviceQuery.data ?? initialResult

  const patchSearch = (patch: SearchPatch) => {
    void navigate({
      to: '/ong-uri/servicii',
      search: (previous) => ({
        ...previous,
        ...patch,
      }),
    })
  }

  const filteredRows = useMemo(() => {
    if (!result) return []
    return sortRows(filterRows(result.rows, search), search.sort)
  }, [result, search])

  const page = search.page ?? 1
  const pageSize = search.pageSize ?? 25
  const start = (page - 1) * pageSize
  const pageRows = filteredRows.slice(start, start + pageSize)
  const filteredAggregates = useMemo(
    () => buildFilteredAggregates(filteredRows),
    [filteredRows],
  )

  if (serviceQuery.isLoading && !result) {
    return <ServicesSkeleton />
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 md:px-6">
      <section className="space-y-3">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <Badge variant="secondary" className="w-fit">
              <Trans>MMuncii: furnizori 2024-04-10, servicii 2023-12-11</Trans>
            </Badge>
            <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">
              <Trans>Descoperire servicii sociale</Trans>
            </h1>
            <p className="text-muted-foreground">
              <Trans>
                Cauta furnizori ONG, servicii licentiate, capacitati si
                acoperire judeteana pe baza instantaneelor mock.
              </Trans>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={search.view === 'harta' ? 'default' : 'outline'}
              onClick={() => patchSearch({ view: 'harta', page: 1 })}
            >
              <MapPinned className="mr-2 h-4 w-4" aria-hidden />
              <Trans>Judete</Trans>
            </Button>
            <Button
              type="button"
              variant={search.view === 'lista' ? 'default' : 'outline'}
              onClick={() => patchSearch({ view: 'lista', page: 1 })}
            >
              <ArrowDownAZ className="mr-2 h-4 w-4" aria-hidden />
              <Trans>Lista</Trans>
            </Button>
          </div>
        </div>

        <StaleSnapshotNotice
          snapshotDate={result?.snapshot.serviceDate ?? '2023-12-11'}
        />
      </section>

      {serviceQuery.isError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" aria-hidden />
          <AlertTitle>
            <Trans>Nu am putut revalida serviciile</Trans>
          </AlertTitle>
          <AlertDescription>
            <Trans>Se afiseaza datele initiale ale rutei, daca exista.</Trans>
          </AlertDescription>
        </Alert>
      ) : null}

      {result ? (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <Card className="rounded-lg shadow-none">
              <CardHeader className="p-4">
                <CardDescription>
                  <Trans>Servicii filtrate</Trans>
                </CardDescription>
                <CardTitle className="font-mono text-2xl">
                  {formatRoNumber(filteredRows.length)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="rounded-lg shadow-none">
              <CardHeader className="p-4">
                <CardDescription>
                  <Trans>Servicii totale mock</Trans>
                </CardDescription>
                <CardTitle className="font-mono text-2xl">
                  {formatRoNumber(result.total)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="rounded-lg shadow-none">
              <CardHeader className="p-4">
                <CardDescription>
                  <Trans>Judete filtrate</Trans>
                </CardDescription>
                <CardTitle className="font-mono text-2xl">
                  {formatRoNumber(filteredAggregates.length)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="rounded-lg shadow-none">
              <CardHeader className="p-4">
                <CardDescription>
                  <Trans>Stare date</Trans>
                </CardDescription>
                <CardTitle className="flex items-center gap-2 text-base">
                  <DataStatusBadge variant="stale" />
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <ServicesFilters
            result={result}
            search={search}
            onPatch={patchSearch}
          />

          <section className="space-y-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-semibold">
                  {search.view === 'harta' ? (
                    <Layers className="h-5 w-5" aria-hidden />
                  ) : (
                    <Stethoscope className="h-5 w-5" aria-hidden />
                  )}
                  {search.view === 'harta' ? (
                    <Trans>Acoperire judeteana</Trans>
                  ) : (
                    <Trans>Rezultate servicii</Trans>
                  )}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {search.view === 'harta' ? (
                    <Trans>
                      Vedere agregata accesibila; harta spatiala este amanata
                      pana la stratul geografic.
                    </Trans>
                  ) : (
                    <Trans>
                      Lista pastreaza linkul catre profilul furnizorului.
                    </Trans>
                  )}
                </p>
              </div>
              {search.view === 'harta' ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={search.unit === 'servicii' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => patchSearch({ unit: 'servicii' })}
                  >
                    <Trans>Servicii</Trans>
                  </Button>
                  <Button
                    type="button"
                    variant={search.unit === 'furnizori' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => patchSearch({ unit: 'furnizori' })}
                  >
                    <Trans>Furnizori</Trans>
                  </Button>
                </div>
              ) : null}
            </div>

            {search.view === 'harta' ? (
              <CountyAggregateView
                aggregates={filteredAggregates}
                unit={search.unit ?? 'servicii'}
              />
            ) : (
              <>
                <ServicesTable rows={pageRows} />
                <ServicesPagination
                  page={page}
                  pageSize={pageSize}
                  total={filteredRows.length}
                  onPatch={patchSearch}
                />
              </>
            )}
          </section>
        </>
      ) : (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" aria-hidden />
          <AlertTitle>
            <Trans>Nu exista date pentru servicii</Trans>
          </AlertTitle>
          <AlertDescription>
            <Trans>Modul mock sau API-ul live nu a returnat niciun rezultat.</Trans>
          </AlertDescription>
        </Alert>
      )}
    </main>
  )
}
