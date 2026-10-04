import { useMemo, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { COMPANY_CAEN_REVISIONS } from '@/schemas/private-company-registry'
import {
  PRIVATE_COMPANY_LEGAL_FORM_OPTIONS,
  PRIVATE_COMPANY_STATUS_OPTIONS,
  type PrivateCompanyCountyFacet,
  type PrivateCompanyDirectorySearchState,
} from '@/schemas/private-company-search'
import { formatInteger } from '../../lib/formatting'
import { foldCountyName } from '../../lib/county-names'
import { caenRevisionText } from '../../lib/company-registry-text'
import {
  countActiveCompanyDirectoryFilters,
  type CompanyDirectoryFilterPatch,
} from '../../lib/company-directory-filter'

const SECTION_LABEL_CLASS =
  'text-xs font-bold uppercase tracking-wide text-[#0b0c0c] dark:text-[var(--pnrr-fg)]'

const TOGGLE_ITEM_CLASS =
  'h-10 min-w-0 justify-start gap-2 rounded-none border-2 border-[#b1b4b6] bg-white px-3 text-sm font-semibold text-[#0b0c0c] transition-colors hover:bg-[#f3f2f1] data-[state=on]:border-[#1d70b8] data-[state=on]:bg-[#1d70b8] data-[state=on]:text-white dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)] dark:hover:bg-[var(--pnrr-subtle)]'

const INPUT_CLASS =
  'h-10 w-full rounded-none border-2 border-[#b1b4b6] bg-white px-3 text-sm text-[#0b0c0c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)]'

type Props = {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly search: PrivateCompanyDirectorySearchState
  /** The pinned edition's county options; empty while they load or when the registry cannot answer (`countiesNote`). */
  readonly counties: ReadonlyArray<PrivateCompanyCountyFacet>
  /** Why there are no county options now, when there are none; null when they are the edition's. */
  readonly countiesNote: string | null
  readonly onChange: (patch: CompanyDirectoryFilterPatch) => void
  readonly onClearAll: () => void
}

/** `undefined` rather than `[]` so the param leaves the URL entirely. */
function toFacet(values: string[]): string[] | undefined {
  return values.length > 0 ? values : undefined
}

/** A selected county value — a code, or a name from an older link — is this option. */
function selects(value: string, county: PrivateCompanyCountyFacet): boolean {
  return value === county.code || foldCountyName(value) === foldCountyName(county.name)
}

/** GOV.UK-light side panel for the company directory filters. */
export function CompanyFilterSheet({
  open,
  onOpenChange,
  search,
  counties,
  countiesNote,
  onChange,
  onClearAll,
}: Props) {
  const activeCount = countActiveCompanyDirectoryFilters(search)
  const [countyFilter, setCountyFilter] = useState('')
  const [exactCode, setExactCode] = useState('')
  const [exactRevision, setExactRevision] = useState<(typeof COMPANY_CAEN_REVISIONS)[number]>('rev2')

  const visibleCounties = useMemo(() => {
    const needle = countyFilter.trim().toLowerCase()
    if (!needle) return counties
    return counties.filter((county) => county.name.toLowerCase().includes(needle))
  }, [counties, countyFilter])

  const selectedCounties = search.county ?? []
  const toggleCounty = (county: PrivateCompanyCountyFacet) => {
    const selected = selectedCounties.some((value) => selects(value, county))
    const next = selected
      ? selectedCounties.filter((value) => !selects(value, county))
      : [...selectedCounties, county.code]
    onChange({ county: toFacet(next) })
  }

  const selectors = search.onrcCaen ?? []
  const exactValid = /^\d{4}$/u.test(exactCode)
  const addExact = () => {
    if (!exactValid) return
    const selector = `${exactRevision}:${exactCode}`
    if (!selectors.includes(selector)) onChange({ onrcCaen: [...selectors, selector] })
    setExactCode('')
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        onOpenAutoFocus={(event) => event.preventDefault()}
        data-testid="company-filter-sheet"
        className="flex w-full max-w-full flex-col gap-0 overflow-hidden border-l-2 border-[#b1b4b6] bg-white p-0 dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-bg)] sm:max-w-md"
      >
        <SheetHeader className="border-b-2 border-[#b1b4b6] p-6 pr-14 text-left dark:border-[var(--pnrr-border)]">
          <SheetTitle className="text-left text-2xl font-black tracking-tight text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            <Trans>Company filters</Trans>
          </SheetTitle>
          <SheetDescription className="pt-1 text-left text-sm font-semibold text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            <Trans>{activeCount} active filters</Trans>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <section className="space-y-2">
            <Label className={SECTION_LABEL_CLASS}>
              <Trans>County</Trans>
            </Label>
            <input
              type="search"
              className={INPUT_CLASS}
              value={countyFilter}
              aria-label={t`Filter the county list`}
              placeholder={t`Search a county`}
              onChange={(event) => setCountyFilter(event.target.value)}
            />
            <ul className="max-h-56 space-y-1 overflow-y-auto">
              {visibleCounties.map((county) => {
                const checked = selectedCounties.some((value) => selects(value, county))
                return (
                  <li key={county.code}>
                    <label className="flex cursor-pointer items-center justify-between gap-3 border-2 border-transparent px-2 py-1.5 text-sm text-[#0b0c0c] hover:bg-[#f3f2f1] dark:text-[var(--pnrr-fg)] dark:hover:bg-[var(--pnrr-subtle)]">
                      <span className="flex min-w-0 items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCounty(county)}
                          className="h-4 w-4 shrink-0 accent-[#1d70b8]"
                        />
                        <span className="truncate font-semibold">{county.name}</span>
                      </span>
                      <span className="shrink-0 text-xs text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                        {formatInteger(county.count)}
                      </span>
                    </label>
                  </li>
                )
              })}
              {countiesNote ? (
                <li className="px-2 py-1.5 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">{countiesNote}</li>
              ) : visibleCounties.length === 0 ? (
                <li className="px-2 py-1.5 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                  <Trans>No county matches.</Trans>
                </li>
              ) : null}
            </ul>
            <p className="text-xs text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              <Trans>
                Numărul de lângă județ: firmele cu o înscriere „în funcțiune” care au acel județ în toate înscrierile, în ediția ONRC afișată.
              </Trans>
            </p>
          </section>

          <section className="space-y-2">
            <Label className={SECTION_LABEL_CLASS}>
              <Trans>Registry status</Trans>
            </Label>
            <p className="text-xs text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              <Trans>
                O firmă se potrivește dacă are starea pe oricare înscriere publică din ediția ONRC (de exemplu „în funcțiune” chiar și lângă
                o altă stare). Denumirile sunt din nomenclatorul aplicației.
              </Trans>
            </p>
            <ToggleGroup
              type="multiple"
              value={[...(search.status ?? [])]}
              onValueChange={(value: string[]) => onChange({ status: toFacet(value) })}
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              {PRIVATE_COMPANY_STATUS_OPTIONS.map((option) => (
                <ToggleGroupItem
                  key={option.code}
                  value={option.code}
                  className={TOGGLE_ITEM_CLASS}
                >
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </section>

          <section className="space-y-2">
            <Label htmlFor="company-filter-caen" className={SECTION_LABEL_CLASS}>
              <Trans>CAEN code</Trans>
            </Label>
            <input
              id="company-filter-caen"
              type="text"
              inputMode="numeric"
              className={INPUT_CLASS}
              value={search.caen ?? ''}
              placeholder={t`e.g. 47 or 4752`}
              onChange={(event) => onChange({ caen: event.target.value || undefined })}
            />
            <p className="text-xs text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              <Trans>
                1–3 digits match every code starting with them; 4 digits match
                that exact code.
              </Trans>
            </p>
            <p className="text-xs text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              <Trans>
                Potrivire largă: codul în orice revizie CAEN, printre activitățile înscrise în ediția ONRC afișată (nu din ediții mai vechi și
                nu activitatea principală declarată la ANAF). Aceleași cifre pot însemna activități diferite în revizii diferite.
              </Trans>
            </p>
            <div className="space-y-1 pt-2">
              <Label htmlFor="company-filter-caen-exact" className="text-xs font-normal text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                <Trans>Cod CAEN exact, într-o revizie</Trans>
              </Label>
              <div className="flex gap-2">
                <div className="w-36 shrink-0">
                  <select
                    aria-label={t`Revizia CAEN`}
                    value={exactRevision}
                    onChange={(event) => {
                      const revision = COMPANY_CAEN_REVISIONS.find((entry) => entry === event.target.value)
                      if (revision) setExactRevision(revision)
                    }}
                    className={INPUT_CLASS}
                  >
                    {COMPANY_CAEN_REVISIONS.map((revision) => (
                      <option key={revision} value={revision}>
                        {caenRevisionText(revision)}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  id="company-filter-caen-exact"
                  type="text"
                  inputMode="numeric"
                  className={INPUT_CLASS}
                  value={exactCode}
                  placeholder={t`ex. 6201`}
                  onChange={(event) => setExactCode(event.target.value.trim())}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') addExact()
                  }}
                />
                <Button type="button" variant="outline" className="h-10 rounded-none" disabled={!exactValid} onClick={addExact}>
                  <Trans>Adaugă</Trans>
                </Button>
              </div>
              <p className="text-xs text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                <Trans>
                  Potrivire exactă: cele patru cifre în revizia aleasă (Rev.0 inclusiv), pe același identificator cu celelalte filtre de
                  registru.
                </Trans>
              </p>
            </div>
          </section>

          <section className="space-y-2">
            <Label className={SECTION_LABEL_CLASS}>
              <Trans>Legal form</Trans>
            </Label>
            <ToggleGroup
              type="multiple"
              value={[...(search.legalForm ?? [])]}
              onValueChange={(value: string[]) =>
                onChange({ legalForm: toFacet(value) })
              }
              className="flex flex-wrap gap-2"
            >
              {PRIVATE_COMPANY_LEGAL_FORM_OPTIONS.map((option) => (
                <ToggleGroupItem
                  key={option}
                  value={option}
                  className={TOGGLE_ITEM_CLASS}
                >
                  {option}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </section>

          <section className="space-y-2">
            <Label className={SECTION_LABEL_CLASS}>
              <Trans>Registration date</Trans>
            </Label>
            <p className="text-xs text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              <Trans>Data înregistrată de ONRC, comună tuturor înscrierilor; nu este data înființării.</Trans>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label
                  htmlFor="company-filter-reg-from"
                  className="text-xs font-normal text-[#505a5f] dark:text-[var(--pnrr-muted)]"
                >
                  <Trans>From</Trans>
                </Label>
                <input
                  id="company-filter-reg-from"
                  type="date"
                  className={INPUT_CLASS}
                  value={search.regFrom ?? ''}
                  max={search.regTo ?? undefined}
                  onChange={(event) =>
                    onChange({ regFrom: event.target.value || undefined })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="company-filter-reg-to"
                  className="text-xs font-normal text-[#505a5f] dark:text-[var(--pnrr-muted)]"
                >
                  <Trans>To</Trans>
                </Label>
                <input
                  id="company-filter-reg-to"
                  type="date"
                  className={INPUT_CLASS}
                  value={search.regTo ?? ''}
                  min={search.regFrom ?? undefined}
                  onChange={(event) =>
                    onChange({ regTo: event.target.value || undefined })
                  }
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label
                htmlFor="company-filter-vat"
                className="text-sm font-semibold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]"
              >
                <Trans>VAT payers only</Trans>
              </Label>
              <Switch
                id="company-filter-vat"
                checked={search.vat === true}
                onCheckedChange={(checked: boolean) =>
                  onChange({ vat: checked ? true : undefined })
                }
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label
                htmlFor="company-filter-inactive"
                className="text-sm font-semibold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]"
              >
                <Trans>Fiscally inactive only</Trans>
              </Label>
              <Switch
                id="company-filter-inactive"
                checked={search.inactive === true}
                onCheckedChange={(checked: boolean) =>
                  onChange({ inactive: checked ? true : undefined })
                }
              />
            </div>
          </section>
        </div>

        <div className="flex items-center justify-between gap-3 border-t-2 border-[#b1b4b6] p-6 dark:border-[var(--pnrr-border)]">
          <Button
            type="button"
            variant="ghost"
            className="rounded-none text-sm font-semibold underline"
            onClick={onClearAll}
            data-testid="company-filter-clear-all"
          >
            <Trans>Clear all</Trans>
          </Button>
          <Button
            type="button"
            className="h-11 rounded-none bg-[#00703c] px-6 text-base font-bold text-white hover:bg-[#005a30]"
            onClick={() => onOpenChange(false)}
            data-testid="company-filter-apply"
          >
            <Trans>See results</Trans>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
