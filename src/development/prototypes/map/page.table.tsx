import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { ArrowDown, ArrowUp, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatPercent } from '@/features/landing/lib/budget-map-format'
import type { MeasureId } from '@/features/landing/lib/budget-map-measures'
import type { NumberLocale } from '@/features/landing/lib/national-facts'
import { countyNameRo } from '@/lib/territory-counties'
import { cn } from '@/lib/utils'
import type { PageData } from './page.data'
import { amountFormat, type Basis, type Level } from './page.measures'

/**
 * The map's figures as a table: every primărie — or, on the county level,
 * every county — with its income, expenses and balance for the picked year and
 * count. It opens sorted by the picked map's figure, searchable by name, 50
 * rows a page. On a phone only the sorted column is shown beside the name.
 */

type SortKey = 'name' | 'income' | 'expenses' | 'balance' | 'share'

interface Row {
  readonly siruta: string
  readonly name: string
  readonly folded: string
  readonly county: string
  readonly cui: string
  readonly income: number | null
  readonly expenses: number | null
  readonly balance: number | null
  /** The balance as a percent of income. */
  readonly share: number | null
}

const PAGE_SIZE = 50
const SORT_OF_MEASURE: Readonly<Record<MeasureId, SortKey>> = { balance: 'share', income: 'income', expenses: 'expenses' }

const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

export function PageTable({
  data,
  measureId,
  basis,
  level,
  locale,
}: {
  readonly data: PageData
  readonly measureId: MeasureId
  readonly basis: Basis
  readonly level: Level
  readonly locale: NumberLocale
}) {
  const { uats, counties, figures, failed, retry } = data
  const county = level === 'county'
  // The picked map decides the opening sort; a header the reader clicks holds until the map changes.
  const [chosen, setChosen] = useState<{ readonly forMeasure: MeasureId; readonly key: SortKey; readonly descending: boolean } | null>(null)
  const sort = chosen && chosen.forMeasure === measureId ? chosen : { key: SORT_OF_MEASURE[measureId], descending: true }
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const amount = amountFormat(basis)

  const rows = useMemo<readonly Row[]>(() => {
    const shapes = county ? counties : uats
    if (!shapes || !figures) return []
    return shapes.features.map((feature) => {
      const props = feature.properties ?? {}
      const code = String(county ? props.mnemonic : props.natcode)
      const { income = null, expenses = null } = figures.get(code) ?? {}
      const balance = income !== null && expenses !== null ? income - expenses : null
      const countyCode = String(county ? code : (props.countyMn ?? ''))
      const countyName = countyCode === 'B' ? t`București` : (countyNameRo(countyCode) ?? String(props.county ?? countyCode))
      const name = county ? countyName : String(props.name ?? '')
      return {
        siruta: code,
        name,
        folded: fold(name),
        // Under a county's name: what its figure covers.
        county: !county ? countyName : countyCode === 'B' ? t`Sectoarele și bugetul propriu al capitalei` : t`Primăriile și consiliul județean`,
        cui: !county && typeof props.cui === 'string' ? props.cui : '',
        income,
        expenses,
        balance,
        share: balance !== null && income !== null && income > 0 ? (balance / income) * 100 : null,
      }
    })
  }, [uats, counties, county, figures])

  const shown = useMemo(() => {
    const needle = fold(query.trim())
    const matching = needle ? rows.filter((row) => row.folded.includes(needle)) : rows
    const direction = sort.descending ? -1 : 1
    return [...matching].sort((a, b) => {
      if (sort.key === 'name') return direction * a.name.localeCompare(b.name, 'ro')
      const x = a[sort.key]
      const y = b[sort.key]
      // Rows without a figure stay last in either direction.
      if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1
      return direction * (x - y)
    })
  }, [rows, query, sort.key, sort.descending])

  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const visible = shown.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  const sortBy = (key: SortKey) => {
    setChosen({ forMeasure: measureId, key, descending: sort.key === key ? !sort.descending : key !== 'name' })
    setPage(1)
  }
  const columns: readonly { readonly key: Exclude<SortKey, 'name'>; readonly label: string }[] = [
    { key: 'income', label: t`Venituri` },
    { key: 'expenses', label: t`Cheltuieli` },
    { key: 'balance', label: t`Sold` },
    { key: 'share', label: t`Sold, % din venituri` },
  ]
  // On a phone: the name and the sorted figure (the balance's percent under a sort by name).
  const phoneColumn = sort.key === 'name' ? 'share' : sort.key
  const cell = (key: Exclude<SortKey, 'name'>) => cn('text-right tabular-nums', key !== phoneColumn && 'hidden sm:table-cell')

  if (failed) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3 px-4 py-6 text-sm text-muted-foreground md:px-6">
        {t`Tabelul nu s-a putut încărca.`}
        <Button size="sm" variant="outline" onClick={retry}>
          {t`Încearcă din nou`}
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-4 md:px-6">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setPage(1)
          }}
          placeholder={county ? t`Caută un județ` : t`Caută o localitate`}
          aria-label={county ? t`Caută un județ` : t`Caută o localitate`}
          className="h-10 pl-9 text-base md:text-sm"
        />
      </div>
      <div className="mt-3 rounded-md border" aria-busy={!figures}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead aria-sort={sort.key === 'name' ? (sort.descending ? 'descending' : 'ascending') : 'none'}>
                <SortButton label={county ? t`Județ` : t`Localitate`} active={sort.key === 'name'} descending={sort.descending} onClick={() => sortBy('name')} />
              </TableHead>
              {columns.map((column) => (
                <TableHead key={column.key} className={cell(column.key)} aria-sort={sort.key === column.key ? (sort.descending ? 'descending' : 'ascending') : 'none'}>
                  <SortButton label={column.label} active={sort.key === column.key} descending={sort.descending} onClick={() => sortBy(column.key)} alignEnd />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row) => (
              <TableRow key={row.siruta}>
                <TableCell>
                  {row.cui ? (
                    <Link to="/entities/$cui" params={{ cui: row.cui }} className="font-medium text-primary underline-offset-4 hover:underline">
                      {row.name}
                    </Link>
                  ) : (
                    <span className="font-medium">{row.name}</span>
                  )}
                  <span className="block text-xs text-muted-foreground">{row.county}</span>
                </TableCell>
                <TableCell className={cell('income')}>{amount(row.income, locale)}</TableCell>
                <TableCell className={cell('expenses')}>{amount(row.expenses, locale)}</TableCell>
                <TableCell className={cn(cell('balance'), row.balance !== null && row.balance < 0 && 'text-destructive')}>{amount(row.balance, locale)}</TableCell>
                <TableCell className={cn(cell('share'), row.share !== null && row.share < 0 && 'text-destructive')}>{formatPercent(row.share, locale)}</TableCell>
              </TableRow>
            ))}
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  {figures ? t`Nimic nu se potrivește cu căutarea.` : t`Se încarcă tabelul…`}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
      {shown.length > PAGE_SIZE ? <Pagination className="mt-3" currentPage={current} pageSize={PAGE_SIZE} totalCount={shown.length} onPageChange={setPage} /> : null}
    </div>
  )
}

function SortButton({ label, active, descending, onClick, alignEnd }: { readonly label: string; readonly active: boolean; readonly descending: boolean; readonly onClick: () => void; readonly alignEnd?: boolean }) {
  const Arrow = descending ? ArrowDown : ArrowUp
  return (
    <button type="button" onClick={onClick} className={cn('inline-flex min-h-10 items-center gap-1 text-left hover:text-foreground', alignEnd && 'flex-row-reverse text-right', active && 'text-foreground')}>
      {label}
      {active ? <Arrow className="size-3.5 shrink-0" aria-hidden="true" /> : null}
    </button>
  )
}
