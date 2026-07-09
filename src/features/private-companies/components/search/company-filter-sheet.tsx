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
import {
  PRIVATE_COMPANY_LEGAL_FORM_OPTIONS,
  PRIVATE_COMPANY_STATUS_OPTIONS,
  type PrivateCompanyCountyFacet,
  type PrivateCompanyDirectorySearchState,
} from '@/schemas/private-company-search'
import { formatInteger } from '../../lib/formatting'
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
  readonly counties: ReadonlyArray<PrivateCompanyCountyFacet>
  readonly onChange: (patch: CompanyDirectoryFilterPatch) => void
  readonly onClearAll: () => void
}

/** `undefined` rather than `[]` so the param leaves the URL entirely. */
function toFacet(values: string[]): string[] | undefined {
  return values.length > 0 ? values : undefined
}

/** GOV.UK-light side panel for the company directory filters. */
export function CompanyFilterSheet({
  open,
  onOpenChange,
  search,
  counties,
  onChange,
  onClearAll,
}: Props) {
  const activeCount = countActiveCompanyDirectoryFilters(search)
  const [countyFilter, setCountyFilter] = useState('')

  const visibleCounties = useMemo(() => {
    const needle = countyFilter.trim().toLowerCase()
    if (!needle) return counties
    return counties.filter((county) => county.name.toLowerCase().includes(needle))
  }, [counties, countyFilter])

  const selectedCounties = search.county ?? []
  const toggleCounty = (name: string) => {
    const next = selectedCounties.includes(name)
      ? selectedCounties.filter((item) => item !== name)
      : [...selectedCounties, name]
    onChange({ county: toFacet(next) })
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
            <Trans>Filtre firme</Trans>
          </SheetTitle>
          <SheetDescription className="pt-1 text-left text-sm font-semibold text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            <Trans>{activeCount} filtre active</Trans>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <section className="space-y-2">
            <Label className={SECTION_LABEL_CLASS}>
              <Trans>Județ</Trans>
            </Label>
            <input
              type="search"
              className={INPUT_CLASS}
              value={countyFilter}
              aria-label={t`Filtrează lista de județe`}
              placeholder={t`Caută un județ`}
              onChange={(event) => setCountyFilter(event.target.value)}
            />
            <ul className="max-h-56 space-y-1 overflow-y-auto">
              {visibleCounties.map((county) => {
                const checked = selectedCounties.includes(county.name)
                return (
                  <li key={county.name}>
                    <label className="flex cursor-pointer items-center justify-between gap-3 border-2 border-transparent px-2 py-1.5 text-sm text-[#0b0c0c] hover:bg-[#f3f2f1] dark:text-[var(--pnrr-fg)] dark:hover:bg-[var(--pnrr-subtle)]">
                      <span className="flex min-w-0 items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCounty(county.name)}
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
              {visibleCounties.length === 0 ? (
                <li className="px-2 py-1.5 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                  <Trans>Niciun județ nu se potrivește.</Trans>
                </li>
              ) : null}
            </ul>
          </section>

          <section className="space-y-2">
            <Label className={SECTION_LABEL_CLASS}>
              <Trans>Stare ONRC</Trans>
            </Label>
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
              <Trans>Cod CAEN</Trans>
            </Label>
            <input
              id="company-filter-caen"
              type="text"
              inputMode="numeric"
              className={INPUT_CLASS}
              value={search.caen ?? ''}
              placeholder={t`ex. 47 sau 4752`}
              onChange={(event) => onChange({ caen: event.target.value || undefined })}
            />
            <p className="text-xs text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              <Trans>
                1–3 cifre caută toate codurile care încep așa; 4 cifre caută exact
                acel cod.
              </Trans>
            </p>
          </section>

          <section className="space-y-2">
            <Label className={SECTION_LABEL_CLASS}>
              <Trans>Formă juridică</Trans>
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
              <Trans>Data înregistrării</Trans>
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label
                  htmlFor="company-filter-reg-from"
                  className="text-xs font-normal text-[#505a5f] dark:text-[var(--pnrr-muted)]"
                >
                  <Trans>De la</Trans>
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
                  <Trans>Până la</Trans>
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
                <Trans>Doar plătitori de TVA</Trans>
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
                <Trans>Doar declarați inactivi fiscal</Trans>
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
            <Trans>Șterge tot</Trans>
          </Button>
          <Button
            type="button"
            className="h-11 rounded-none bg-[#00703c] px-6 text-base font-bold text-white hover:bg-[#005a30]"
            onClick={() => onOpenChange(false)}
            data-testid="company-filter-apply"
          >
            <Trans>Vezi rezultatele</Trans>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
