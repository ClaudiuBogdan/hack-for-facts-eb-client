import { useMemo } from 'react'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  getQuarterEndMonth,
  getQuarterForMonth,
  type ReportPeriodType,
  type TMonth,
  type TQuarter,
} from '@/schemas/reporting'
import type { ChallengeLocale } from '../../types'

export type ChallengeEntityReportType =
  | 'PRINCIPAL_AGGREGATED'
  | 'DETAILED'

export type ChallengeEntityMainCreditorOption = {
  readonly id: string
  readonly label: string
}

export type ChallengeEntityReportControlsChange = {
  readonly periodType?: ReportPeriodType
  readonly selectedYear?: number
  readonly quarter?: TQuarter
  readonly month?: TMonth
  readonly reportType?: ChallengeEntityReportType
  readonly mainCreditorCui?: string
}

type ChallengeEntityReportControlsProps = {
  readonly locale?: ChallengeLocale
  readonly periodType: ReportPeriodType
  readonly selectedYear: number
  readonly quarter: TQuarter
  readonly month: TMonth
  readonly availableYears: readonly number[]
  readonly reportType: ChallengeEntityReportType
  readonly showReportTypeControl?: boolean
  readonly mainCreditorOptions?: readonly ChallengeEntityMainCreditorOption[]
  readonly mainCreditorCui?: string
  readonly onChange: (
    patch: ChallengeEntityReportControlsChange,
  ) => void
}

const ALL_MAIN_CREDITOR_OPTION_ID = '__all_main_creditors__'

const CONTROL_COPY = {
  ro: {
    period: 'Perioadă',
    year: 'An',
    quarter: 'Trimestru',
    month: 'Lună',
    reportType: 'Tip raport',
    mainCreditor: 'Ordonator principal',
    yearly: 'Anual',
    quarterly: 'Trimestrial',
    monthly: 'Lunar',
    aggregated: 'Primărie + instituții',
    detailed: 'Doar primărie',
    all: 'Toate',
  },
  en: {
    period: 'Period',
    year: 'Year',
    quarter: 'Quarter',
    month: 'Month',
    reportType: 'Report type',
    mainCreditor: 'Main creditor',
    yearly: 'Yearly',
    quarterly: 'Quarterly',
    monthly: 'Monthly',
    aggregated: 'City hall + institutions',
    detailed: 'City hall only',
    all: 'All',
  },
} as const

const QUARTER_OPTIONS: ReadonlyArray<{ id: TQuarter; label: string }> = [
  { id: 'Q1', label: 'Q1' },
  { id: 'Q2', label: 'Q2' },
  { id: 'Q3', label: 'Q3' },
  { id: 'Q4', label: 'Q4' },
]

export function ChallengeEntityReportControls({
  locale,
  periodType,
  selectedYear,
  quarter,
  month,
  availableYears,
  reportType,
  showReportTypeControl = true,
  mainCreditorOptions = [],
  mainCreditorCui,
  onChange,
}: ChallengeEntityReportControlsProps) {
  const resolvedLocale = locale === 'en' ? 'en' : 'ro'
  const copy = CONTROL_COPY[resolvedLocale]
  const monthFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(resolvedLocale === 'en' ? 'en-US' : 'ro-RO', {
        month: 'short',
      }),
    [resolvedLocale],
  )
  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const nextMonth = String(index + 1).padStart(2, '0') as TMonth
        return {
          id: nextMonth,
          label: `${nextMonth} ${monthFormatter.format(
            new Date(2000, index, 1),
          )}`,
        }
      }),
    [monthFormatter],
  )
  const reportTypeOptions = useMemo(
    () => [
      {
        id: 'PRINCIPAL_AGGREGATED' as const,
        label: copy.aggregated,
      },
      {
        id: 'DETAILED' as const,
        label: copy.detailed,
      },
    ],
    [copy.aggregated, copy.detailed],
  )
  const hasMainCreditorOptions = mainCreditorOptions.length > 0
  const mainCreditorToggleOptions = useMemo(() => {
    if (!hasMainCreditorOptions) {
      return []
    }

    return [
      {
        id: ALL_MAIN_CREDITOR_OPTION_ID,
        label: copy.all,
      },
      ...mainCreditorOptions,
    ]
  }, [copy.all, hasMainCreditorOptions, mainCreditorOptions])
  const selectedMainCreditorValue =
    mainCreditorCui ?? ALL_MAIN_CREDITOR_OPTION_ID

  const handlePeriodTypeChange = (value: string | number | boolean | undefined) => {
    if (!value) {
      return
    }

    const nextPeriodType = String(value) as ReportPeriodType
    let nextQuarter = quarter
    let nextMonth = month

    if (nextPeriodType === 'YEAR') {
      nextMonth = '01'
    } else if (nextPeriodType === 'QUARTER') {
      if (periodType === 'YEAR') {
        nextQuarter = 'Q1'
      } else if (periodType === 'MONTH') {
        nextQuarter = getQuarterForMonth(Number(month))
      }
    } else if (nextPeriodType === 'MONTH') {
      if (periodType === 'YEAR') {
        nextMonth = '01'
      } else if (periodType === 'QUARTER') {
        nextMonth = getQuarterEndMonth(quarter)
      }
    }

    onChange({
      periodType: nextPeriodType,
      selectedYear,
      quarter: nextQuarter,
      month: nextMonth,
    })
  }

  const handleYearChange = (value: string) => {
    if (!value) {
      return
    }

    onChange({
      selectedYear: Number(value),
    })
  }

  const handleQuarterChange = (value: string | number | boolean | undefined) => {
    if (!value) {
      return
    }

    onChange({
      quarter: String(value) as TQuarter,
    })
  }

  const handleMonthChange = (value: string | number | boolean | undefined) => {
    if (!value) {
      return
    }

    onChange({
      month: String(value) as TMonth,
    })
  }

  const handleReportTypeChange = (
    value: string | number | boolean | undefined,
  ) => {
    if (!value) {
      return
    }

    onChange({
      reportType: String(value) as ChallengeEntityReportType,
    })
  }

  const handleMainCreditorChange = (value: string | number | boolean | undefined) => {
    if (!value) {
      return
    }

    const nextMainCreditorValue = String(value)
    onChange({
      mainCreditorCui:
        nextMainCreditorValue === ALL_MAIN_CREDITOR_OPTION_ID
          ? undefined
          : nextMainCreditorValue,
    })
  }

  return (
    <div
      data-testid="challenge-entity-report-controls"
      className="flex w-full flex-col gap-4 p-2 sm:min-w-[20rem]"
    >
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">{copy.period}</Label>
        <ToggleGroup
          type="single"
          value={periodType}
          onValueChange={handlePeriodTypeChange}
          variant="outline"
          size="sm"
          className="grid grid-cols-3 gap-2"
        >
          <ToggleGroupItem value="YEAR" className="data-[state=on]:bg-foreground data-[state=on]:text-background">
            {copy.yearly}
          </ToggleGroupItem>
          <ToggleGroupItem value="QUARTER" className="data-[state=on]:bg-foreground data-[state=on]:text-background">
            {copy.quarterly}
          </ToggleGroupItem>
          <ToggleGroupItem value="MONTH" className="data-[state=on]:bg-foreground data-[state=on]:text-background">
            {copy.monthly}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">{copy.year}</Label>
        <ToggleGroup
          type="single"
          value={String(selectedYear)}
          onValueChange={handleYearChange}
          variant="outline"
          size="sm"
          className="grid grid-cols-3 gap-2"
        >
          {availableYears.map((yearOption) => (
            <ToggleGroupItem
              key={yearOption}
              value={String(yearOption)}
              className="justify-center data-[state=on]:bg-foreground data-[state=on]:text-background"
            >
              {yearOption}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {periodType === 'QUARTER' ? (
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">{copy.quarter}</Label>
          <ToggleGroup
            type="single"
            value={quarter}
            onValueChange={handleQuarterChange}
            variant="outline"
            size="sm"
            className="grid grid-cols-4 gap-2"
          >
            {QUARTER_OPTIONS.map((quarterOption) => (
              <ToggleGroupItem
                key={quarterOption.id}
                value={quarterOption.id}
                className="data-[state=on]:bg-foreground data-[state=on]:text-background"
              >
                {quarterOption.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      ) : null}

      {periodType === 'MONTH' ? (
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">{copy.month}</Label>
          <ToggleGroup
            type="single"
            value={month}
            onValueChange={handleMonthChange}
            variant="outline"
            size="sm"
            className="grid grid-cols-2 gap-2"
          >
            {monthOptions.map((monthOption) => (
              <ToggleGroupItem
                key={monthOption.id}
                value={monthOption.id}
                className="justify-center data-[state=on]:bg-foreground data-[state=on]:text-background"
              >
                {monthOption.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      ) : null}

      {showReportTypeControl ? (
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">{copy.reportType}</Label>
          <ToggleGroup
            type="single"
            value={reportType}
            onValueChange={handleReportTypeChange}
            variant="outline"
            size="sm"
            className="grid grid-cols-1 gap-2"
          >
            {reportTypeOptions.map((reportTypeOption) => (
              <ToggleGroupItem
                key={reportTypeOption.id}
                value={reportTypeOption.id}
                className="data-[state=on]:bg-foreground data-[state=on]:text-background"
              >
                {reportTypeOption.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      ) : null}

      {hasMainCreditorOptions ? (
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">{copy.mainCreditor}</Label>
          <ToggleGroup
            type="single"
            value={selectedMainCreditorValue}
            onValueChange={handleMainCreditorChange}
            variant="outline"
            size="sm"
            className="grid grid-cols-1 gap-2"
          >
            {mainCreditorToggleOptions.map((mainCreditorOption) => (
              <ToggleGroupItem
                key={mainCreditorOption.id}
                value={mainCreditorOption.id}
                className="data-[state=on]:bg-foreground data-[state=on]:text-background"
              >
                {mainCreditorOption.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      ) : null}
    </div>
  )
}
