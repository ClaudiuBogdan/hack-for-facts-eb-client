import { Trans } from '@lingui/react/macro'
import { useState } from 'react'
import type { BudgetExplorerState } from '@/routes/budget-explorer.lazy'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Label } from '@/components/ui/label'
import { PeriodFilter } from '@/components/filters/period-filter/PeriodFilter'
import { Button } from '@/components/ui/button'
import { ResponsivePopover } from '@/components/ui/ResponsivePopover'
import { EntityReportLabel } from '@/components/entities/EntityReportLabel'
import { NormalizationModeSelect } from '@/components/normalization/normalization-mode-select'

type Props = Readonly<{
  state: BudgetExplorerState
  onChange: (partial: Partial<BudgetExplorerState>) => void
}>

export function BudgetExplorerHeader({ state, onChange }: Props) {
  const { filter } = state
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const period = filter.report_period
  const primaryValue = filter.account_category === 'vn' ? 'fn' : state.primary

  const handleNormalizationChange = (normalization: BudgetExplorerState['filter']['normalization']) => {
    onChange({
      filter: {
        ...filter,
        normalization,
      } as BudgetExplorerState['filter'],
    })
  }

  return (
    <div className="md:sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-xl shadow-md">
      <div className="flex flex-col gap-4 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">
              <Trans>Income vs Expenses</Trans>
            </Label>
            <ToggleGroup
              type="single"
              value={filter.account_category}
              onValueChange={(value: 'ch' | 'vn') => {
                if (!value) return
                const nextFilter = {
                  ...filter,
                  account_category: value,
                } as BudgetExplorerState['filter']
                const partialState: Partial<BudgetExplorerState> = {
                  filter: nextFilter,
                }
                if (value === 'vn') {
                  partialState.primary = 'fn'
                }
                onChange(partialState)
              }}
              variant="outline"
              size="default"
              className="w-full justify-start"
            >
              <ToggleGroupItem
                value="vn"
                className="flex-1 data-[state=on]:bg-foreground data-[state=on]:text-background"
              >
                <Trans>Income</Trans>
              </ToggleGroupItem>
              <ToggleGroupItem
                value="ch"
                className="flex-1 data-[state=on]:bg-foreground data-[state=on]:text-background"
              >
                <Trans>Expenses</Trans>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">
              <Trans>Grouping</Trans>
            </Label>
            <ToggleGroup
              type="single"
              value={primaryValue}
              onValueChange={(value: 'fn' | 'ec') => {
                if (!value) return
                if (filter.account_category === 'vn' && value === 'ec') return
                onChange({ primary: value })
              }}
              variant="outline"
              size="default"
              className="w-full justify-start"
            >
              <ToggleGroupItem
                value="fn"
                className="flex-1 data-[state=on]:bg-foreground data-[state=on]:text-background"
              >
                <Trans>Functional</Trans>
              </ToggleGroupItem>
              <ToggleGroupItem
                value="ec"
                disabled={filter.account_category === 'vn'}
                className="flex-1 data-[state=on]:bg-foreground data-[state=on]:text-background"
              >
                <Trans>Economic</Trans>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">
              <Trans>Normalization</Trans>
            </Label>
            <NormalizationModeSelect value={filter.normalization} allowPerCapita onChange={handleNormalizationChange} triggerClassName="w-full" />
          </div>

          <div className="flex flex-col gap-2 md:col-span-2 xl:col-span-1">
            <Label className="text-xs text-muted-foreground">
              <Trans>Period</Trans>
            </Label>
            <div className="flex items-center gap-2">
              <ResponsivePopover
                open={advancedOpen}
                onOpenChange={setAdvancedOpen}
                trigger={
                  <Button variant="outline" className="w-full lg:w-[420px] justify-start text-left font-normal rounded-xl px-4 py-2 shadow-sm h-auto" aria-label="Reporting period">
                    <EntityReportLabel period={period} />
                  </Button>
                }
                content={
                  <PeriodFilter
                    value={period}
                    onChange={(report_period) => {
                      onChange({
                        filter: {
                          ...filter,
                          report_period: report_period ?? period,
                        } as BudgetExplorerState['filter'],
                      })
                    }}
                    allowDeselect={false}
                  />
                }
                align="end"
                className="p-0 md:w-md"
                mobileSide="bottom"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
