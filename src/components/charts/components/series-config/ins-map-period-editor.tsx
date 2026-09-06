import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { PeriodFilter } from '@/components/filters/period-filter/PeriodFilter';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { InsSeriesConfiguration } from '@/schemas/charts';
import type { ReportPeriodInput, ReportPeriodType } from '@/schemas/reporting';

interface InsMapPeriodEditorProps {
  readonly series: InsSeriesConfiguration;
  readonly onChange: (patch: Partial<InsSeriesConfiguration>) => void;
  readonly allowedPeriodTypes: ReportPeriodType[];
  readonly yearRange?: { start: number; end: number };
}
const frequency = {
  YEAR: 'ANNUAL',
  QUARTER: 'QUARTERLY',
  MONTH: 'MONTHLY',
} as const;

/** Latest is shared across the map. An interval never acquires an implicit reducer. */
export function InsMapPeriodEditor({
  series,
  onChange,
  allowedPeriodTypes,
  yearRange,
}: InsMapPeriodEditorProps) {
  const isLatest = series.period === undefined;
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>
          <Trans>Reference period</Trans>
        </Label>
        <Select
          value={isLatest ? 'latest' : 'interval'}
          onValueChange={(value) => {
            if (value === 'latest') {
              onChange({ period: undefined, intervalOperation: undefined });
              return;
            }
            const type = allowedPeriodTypes[0] ?? 'YEAR';
            const year = String(yearRange?.end ?? new Date().getFullYear());
            const token =
              type === 'MONTH'
                ? `${year}-12`
                : type === 'QUARTER'
                  ? `${year}-Q4`
                  : year;
            onChange({
              period: {
                type,
                selection: { interval: { start: token, end: token } },
              },
              intervalOperation: undefined,
              periodicity: undefined,
            });
          }}
        >
          <SelectTrigger aria-label={t`Reference period`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">
              <Trans>Latest available</Trans>
            </SelectItem>
            <SelectItem value="interval">
              <Trans>Date interval</Trans>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isLatest ? (
        <>
          <p className="text-sm text-muted-foreground">
            <Trans>
              All territories use the same most recent reference period. Missing
              observations remain unavailable.
            </Trans>
          </p>
          {allowedPeriodTypes.length > 1 && (
            <Select
              value={series.periodicity ?? ''}
              onValueChange={(value) => {
                if (
                  value === 'ANNUAL' ||
                  value === 'QUARTERLY' ||
                  value === 'MONTHLY'
                )
                  onChange({ periodicity: value });
              }}
            >
              <SelectTrigger aria-label={t`Frequency`}>
                <SelectValue placeholder={t`Choose a frequency`} />
              </SelectTrigger>
              <SelectContent>
                {allowedPeriodTypes.map((type) => (
                  <SelectItem key={type} value={frequency[type]}>
                    {type === 'YEAR'
                      ? t`Annual`
                      : type === 'QUARTER'
                        ? t`Quarterly`
                        : t`Monthly`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </>
      ) : (
        <>
          <PeriodFilter
            preserveSelection
            value={series.period as ReportPeriodInput}
            onChange={(period) => onChange({ period, periodicity: undefined })}
            allowedPeriodTypes={allowedPeriodTypes}
            yearRange={yearRange}
          />
          <div className="space-y-2">
            <Label>
              <Trans>Interval operation</Trans>
            </Label>
            <Select
              value={series.intervalOperation ?? ''}
              onValueChange={(value) => {
                if (
                  value === 'sum' ||
                  value === 'average' ||
                  value === 'latest'
                )
                  onChange({ intervalOperation: value });
              }}
            >
              <SelectTrigger
                aria-label={t`Interval operation`}
                aria-invalid={series.intervalOperation === undefined}
              >
                <SelectValue placeholder={t`Choose an interval operation`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sum">
                  <Trans>Sum</Trans>
                </SelectItem>
                <SelectItem value="average">
                  <Trans>Average</Trans>
                </SelectItem>
                <SelectItem value="latest">
                  <Trans>Latest observation</Trans>
                </SelectItem>
              </SelectContent>
            </Select>
            {series.intervalOperation === undefined && (
              <p role="status" className="text-sm text-muted-foreground">
                <Trans>
                  Choose how to combine the selected periods before loading this
                  series.
                </Trans>
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
