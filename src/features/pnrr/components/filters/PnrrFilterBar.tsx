import { useMemo } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import type { PnrrProject } from '@/schemas/pnrr'
import type { usePnrrFilterState } from '../../hooks/usePnrrFilterState'
import { Input } from '@/components/ui/input'
import { MultiSelect, type Option } from '@/components/ui/multi-select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Search } from 'lucide-react'
import {
  PROGRESS_CATEGORY_LABELS,
  type ProgressCategoryKey,
} from '../../lib/filter-constants'

const PROGRESS_OPTIONS: Option[] = Object.entries(PROGRESS_CATEGORY_LABELS).map(
  ([value, label]) => ({ value, label }),
)

export function PnrrFilterBar({
  projects,
  filterState,
}: {
  readonly projects: readonly PnrrProject[]
  readonly filterState: ReturnType<typeof usePnrrFilterState>
}) {
  const search = filterState.search

  const componentOptions = useMemo(() => {
    const codes = Array.from(
      new Set(projects.map((p) => p.componentCode)),
    ).sort()
    return codes.map<Option>((code) => ({
      value: code,
      label: code,
    }))
  }, [projects])

  const countyOptions = useMemo(() => {
    const counties = Array.from(new Set(projects.map((p) => p.county))).sort()
    return counties.map<Option>((c) => ({
      value: c,
      label: c,
    }))
  }, [projects])

  const criOptions = useMemo(() => {
    const cris = Array.from(new Set(projects.map((p) => p.cri))).sort()
    return cris.map<Option>((c) => ({
      value: c,
      label: c,
    }))
  }, [projects])

  return (
    <div className="space-y-4">
      {/* Top row: Search + Quick filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t`Search projects, beneficiaries, or CUI...`}
            value={search.search ?? ''}
            onChange={(e) => filterState.setSearch(e.target.value)}
            className="h-10 rounded-xl border-border/60 bg-background pl-10 text-sm shadow-sm transition-colors focus:border-primary/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-2 shadow-sm">
            <Switch
              id="only-anomalies"
              checked={search.onlyAnomalies ?? false}
              onCheckedChange={filterState.setOnlyAnomalies}
              className="scale-90"
            />

            <Label
              htmlFor="only-anomalies"
              className="cursor-pointer text-xs font-medium"
            >
              <Trans>Risks only</Trans>
            </Label>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-2 shadow-sm">
            <Switch
              id="exclude-micro"
              checked={search.excludeMicro ?? false}
              onCheckedChange={filterState.setExcludeMicro}
              className="scale-90"
            />

            <Label
              htmlFor="exclude-micro"
              className="cursor-pointer text-xs font-medium"
            >
              <Trans>No micro</Trans>
            </Label>
          </div>
        </div>
      </div>

      {/* Second row: Dropdown filters */}
      <div className="flex flex-wrap items-center gap-2">
        <MultiSelect
          options={componentOptions}
          selected={search.components ?? []}
          onChange={filterState.setComponents}
          placeholder={t`PNRR components`}
        />

        <MultiSelect
          options={countyOptions}
          selected={search.counties ?? []}
          onChange={filterState.setCounties}
          placeholder={t`Counties`}
        />

        <MultiSelect
          options={criOptions}
          selected={search.cris ?? []}
          onChange={filterState.setCris}
          placeholder={t`Responsible institutions`}
        />

        <MultiSelect
          options={PROGRESS_OPTIONS}
          selected={search.progressCategories ?? []}
          onChange={(v) =>
            filterState.setProgressCategories(v as ProgressCategoryKey[])
          }
          placeholder={t`Implementation status`}
        />

        <ToggleGroup
          type="multiple"
          value={search.fundingSources ?? []}
          onValueChange={(v) =>
            filterState.setFundingSources(
              v as ('grant' | 'loan' | 'grant/loan')[],
            )
          }
          className="gap-1"
        >
          <ToggleGroupItem
            value="grant"
            size="sm"
            className="rounded-lg border text-xs data-[state=on]:bg-emerald-500 data-[state=on]:text-white"
          >
            <Trans>Grant</Trans>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="loan"
            size="sm"
            className="rounded-lg border text-xs data-[state=on]:bg-red-500 data-[state=on]:text-white"
          >
            <Trans>Loan</Trans>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="grant/loan"
            size="sm"
            className="rounded-lg border text-xs data-[state=on]:bg-amber-500 data-[state=on]:text-white"
          >
            <Trans>Mixed</Trans>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  )
}
