import { PopulationMethodologyNote } from '@/components/normalization/population-methodology-note';
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { Currency } from '@/schemas/charts'
import { t } from '@lingui/core/macro'
import { normalizeNormalizationOptions, type NormalizationMode, type NormalizationOptions } from '@/lib/normalization'
import { useId } from 'react'

type Props = {
  value: NormalizationOptions | undefined
  onChange: (value: NormalizationOptions) => void
  allowPerCapita?: boolean
  allowGrowth?: boolean
  allowPercentGdp?: boolean
}

export function NormalizationControls({
  value,
  onChange,
  allowPerCapita = false,
  allowGrowth = false,
  allowPercentGdp = true,
}: Readonly<Props>) {
  const normalized = normalizeNormalizationOptions(value)
  const isPercentGdp = normalized.normalization === 'percent_gdp'
  const inflationAdjustedId = useId()
  const showPeriodGrowthId = useId()

  const modeOptions: Array<{ value: NormalizationMode; label: string }> = [
    { value: 'total', label: t`Total amount` },
    ...(allowPerCapita ? [{ value: 'per_capita' as const, label: t`Per capita` }] : []),
    ...(allowPercentGdp ? [{ value: 'percent_gdp' as const, label: t`% of GDP` }] : []),
  ]

  const handleModeChange = (mode: NormalizationMode) => {
    onChange({
      ...normalized,
      normalization: mode,
      inflation_adjusted: mode === 'percent_gdp' ? false : normalized.inflation_adjusted,
    })
  }

  const handleCurrencyChange = (currency: Currency) => {
    onChange({
      ...normalized,
      currency,
    })
  }

  const handleInflationChange = (checked: boolean) => {
    onChange({
      ...normalized,
      inflation_adjusted: checked,
    })
  }

  const handleGrowthChange = (checked: boolean) => {
    onChange({
      ...normalized,
      show_period_growth: checked,
    })
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">{t`Display mode`}</Label>
        <Select value={normalized.normalization} onValueChange={(v) => handleModeChange(v as NormalizationMode)}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {modeOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">{t`Currency`}</Label>
        <ToggleGroup
          type="single"
          value={normalized.currency}
          onValueChange={(v) => v && handleCurrencyChange(v as Currency)}
          variant="outline"
          size="sm"
          className="w-full"
          disabled={isPercentGdp}
        >
          {(['RON', 'EUR', 'USD'] as const).map((c) => (
            <ToggleGroupItem key={c} value={c} className="flex-1 data-[state=on]:bg-foreground data-[state=on]:text-background">
              {c}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="flex items-start gap-2">
        <Checkbox
          id={inflationAdjustedId}
          checked={normalized.inflation_adjusted}
          onCheckedChange={(v) => handleInflationChange(Boolean(v))}
          disabled={isPercentGdp}
        />
        <Label htmlFor={inflationAdjustedId} className={isPercentGdp ? 'text-muted-foreground' : undefined}>
          {t`Adjust for inflation (constant 2024 prices)`}
        </Label>
      </div>

      {allowPerCapita && <PopulationMethodologyNote />}
      {allowGrowth ? (
        <div className="flex items-start gap-2">
          <Checkbox
            id={showPeriodGrowthId}
            checked={normalized.show_period_growth}
            onCheckedChange={(v) => handleGrowthChange(Boolean(v))}
          />
          <Label htmlFor={showPeriodGrowthId}>{t`Show period-over-period growth`}</Label>
        </div>
      ) : null}
    </div>
  )
}
