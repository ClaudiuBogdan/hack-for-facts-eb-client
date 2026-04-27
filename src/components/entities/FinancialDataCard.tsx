import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Accordion } from '@/components/ui/accordion';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { SearchToggleInput } from './SearchToggleInput';
import GroupedChapterAccordion from "./GroupedChapterAccordion";
import { GroupedChapter, GroupedFunctional, GroupedEconomic } from '@/schemas/financial';
import { formatNormalizedValue, formatNumber } from '@/lib/utils';
import { Trans } from '@lingui/react/macro';
import { TMonth, TQuarter } from '@/schemas/reporting';
import { getYearLabel } from './utils';
import { ClassificationInfoLink } from '@/components/common/classification-info-link';
import type { Currency, Normalization } from '@/schemas/charts';
import {
  FN_FIRST_ANALYTICS_PATH_ORDER,
  EC_FIRST_ANALYTICS_PATH_ORDER,
  type GroupedItemAnalyticsRequest,
  type GroupedItemCopyPromptRequest,
} from './grouped-item-analytics';

interface GroupedItemsDisplayProps {
  groups: GroupedChapter[];
  title: string;
  baseTotal: number;
  searchTerm: string;
  currentYear: number;
  showTotalValueHeader?: boolean;
  month?: TMonth;
  quarter?: TQuarter;
  normalization?: Normalization;
  currency?: Currency;
  subchapterCodePrefix?: 'fn' | 'ec';
  onAnalyticsRequest?: (request: GroupedItemAnalyticsRequest) => void;
  onCopyPromptRequest?: (request: GroupedItemCopyPromptRequest) => void;
}

export const GroupedItemsDisplay: React.FC<GroupedItemsDisplayProps> = React.memo(
  ({
    groups,
    title,
    baseTotal,
    searchTerm,
    currentYear,
    showTotalValueHeader = false,
    month,
    quarter,
    normalization,
    currency,
    subchapterCodePrefix = 'fn',
    onAnalyticsRequest,
    onCopyPromptRequest,
  }) => {

    const dateLabel = getYearLabel(currentYear, month, quarter);

    // Sort chapters by totalAmount descending
    const sortedGroups = useMemo(
      () => [...groups].sort((a, b) => b.totalAmount - a.totalAmount),
      [groups]
    );

    const { totalValueFiltered, totalPercentageFiltered } = React.useMemo(() => {
      const sumFunctionalList = (funcs: GroupedFunctional[]): number =>
        funcs.reduce((funcSum: number, func: GroupedFunctional) => {
          if (func.economics.length > 0) {
            return funcSum + func.economics.reduce((ecoSum: number, eco: GroupedEconomic) => ecoSum + eco.amount, 0);
          }
          return funcSum + func.totalAmount;
        }, 0);

      const totalValue = groups.reduce((sum, ch) => {
        const fromFunctionals = sumFunctionalList(ch.functionals);
        const fromSubchapters = (ch.subchapters ?? []).reduce(
          (s, sub) => s + sumFunctionalList(sub.functionals),
          0
        );
        return sum + fromFunctionals + fromSubchapters;
      }, 0);

      const percentage = baseTotal > 0 ? (totalValue / baseTotal) * 100 : 0;
      return { totalValueFiltered: totalValue, totalPercentageFiltered: percentage };
    }, [groups, baseTotal]);

    const chapterValues = useMemo(() => sortedGroups.map((ch) => ch.prefix), [sortedGroups]);
    const [manualOpenChapters, setManualOpenChapters] = useState<string[]>([]);
    const resolvedOpenChapters = useMemo(
      () => (searchTerm ? chapterValues : manualOpenChapters.filter((value) => chapterValues.includes(value))),
      [chapterValues, manualOpenChapters, searchTerm]
    );

    const handleAccordionChange = (value: string[]) => {
      if (searchTerm) {
        return;
      }
      setManualOpenChapters(value);
    };

    if (groups.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4">
          <p className="text-sm text-center text-slate-500 dark:text-slate-400">
            {searchTerm
              ? <span>No results for "{searchTerm}"</span>
              : <span>No data available for {title} in {dateLabel}.</span>
            }
          </p>
        </div>
      );
    }

	    const normalizationFormatOptions = {
	      normalization: normalization ?? 'total',
	      currency,
	    } as const

	    const TotalValueComponent = () => (
	      <div className="flex flex-col">
        <p className='flex justify-end items-center m-4 mb-0 font-semibold'>
          <Trans>Total:</Trans>{" "}
          {formatNormalizedValue(totalValueFiltered, normalizationFormatOptions, "standard")}
          {totalPercentageFiltered > 0 && totalPercentageFiltered <= 99.99 && (
            <span className="pl-2 text-sm text-muted-foreground">
              ({formatNumber(totalPercentageFiltered)}%)
            </span>
          )}
        </p>
        <p className="text-sm text-muted-foreground text-right m-4 mt-0">
          {formatNormalizedValue(totalValueFiltered, normalizationFormatOptions, "compact")}
        </p>
      </div>
    )

    return (
      <Accordion
        type="multiple"
        className="w-full"
        value={resolvedOpenChapters}
        onValueChange={handleAccordionChange}
      >
        {showTotalValueHeader && <TotalValueComponent />}
        {sortedGroups.map((ch) => (
          <GroupedChapterAccordion
            key={ch.prefix}
            ch={ch}
            baseTotal={baseTotal}
            searchTerm={searchTerm}
            normalization={normalization}
            currency={currency}
            codePrefixForSubchapters={subchapterCodePrefix}
            onAnalyticsRequest={onAnalyticsRequest}
            onCopyPromptRequest={onCopyPromptRequest}
            analyticsSelection={
              subchapterCodePrefix === 'ec'
                ? { economicCode: ch.prefix }
                : { functionalCode: ch.prefix }
            }
            analyticsPathOrder={
              subchapterCodePrefix === 'ec'
                ? EC_FIRST_ANALYTICS_PATH_ORDER
                : FN_FIRST_ANALYTICS_PATH_ORDER
            }
          />
        ))}
        <TotalValueComponent />
      </Accordion>
    );
  }
);

GroupedItemsDisplay.displayName = "GroupedItemsDisplay";


interface FinancialDataCardProps {
  title: string;
  subtitle?: string;
  iconType: 'income' | 'expense';
  currentYear: number;
  month?: TMonth;
  quarter?: TQuarter;
  years: number[];
  onYearChange: (year: number) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  searchActive: boolean;
  onSearchToggle: (active: boolean) => void;
  groups: GroupedChapter[];
  baseTotal: number;
  searchFocusKey?: string;
  normalization?: Normalization;
  currency?: Currency;
  onPrefetchYear?: (year: number) => void;
  transferFilter?: 'all' | 'no-transfers' | 'transfers-only';
}

export const FinancialDataCard: React.FC<FinancialDataCardProps> = ({
  title,
  subtitle = '',
  iconType,
  currentYear,
  month,
  quarter,
  years,
  onYearChange,
  searchTerm,
  onSearchChange,
  searchActive,
  onSearchToggle,
  groups,
  baseTotal,
  searchFocusKey,
  normalization,
  currency,
  onPrefetchYear,
  transferFilter = 'no-transfers',
}) => {
  const Icon = iconType === 'income' ? ArrowUpCircle : ArrowDownCircle;
  const iconColor = iconType === 'income' ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400';
  const dateLabel = getYearLabel(currentYear, month, quarter);
  const shouldFilterTransfers = transferFilter !== 'all';

  const { filteredGroups, filteredBaseTotal } = useMemo(() => {
    if (!shouldFilterTransfers) {
      return { filteredGroups: groups, filteredBaseTotal: baseTotal };
    }

    // For expenses: filter on economic codes (ec: 51.01, 51.02)
    // For income: filter on functional codes (fn: 36.02.05, 37.02.03, 37.02.04, 47.02.04)
    const isExpenseTransfer = (code: string) => code.startsWith('51.01') || code.startsWith('51.02');
    const isIncomeTransfer = (code: string) =>
      code.startsWith('36.02.05') || code.startsWith('37.02.03') || code.startsWith('37.02.04') || code.startsWith('47.02.04');

    if (iconType === 'income') {
      // For income: filter entire chapters based on functional code (chapter.prefix)
      const filtered = groups
        .filter((chapter) => {
          const isTrans = isIncomeTransfer(chapter.prefix);
          return transferFilter === 'transfers-only' ? isTrans : !isTrans;
        });

      const filteredTotal = filtered.reduce((sum, chapter) => sum + chapter.totalAmount, 0);
      return { filteredGroups: filtered, filteredBaseTotal: filteredTotal };
    }

    // For expenses: filter on economic codes within functionals
    const filterEconomics = (economics: GroupedEconomic[]) => economics.filter((eco) => {
      const isTrans = isExpenseTransfer(eco.code);
      return transferFilter === 'transfers-only' ? isTrans : !isTrans;
    });

    const filterFunctionals = (functionals: GroupedFunctional[]): GroupedFunctional[] => {
      return functionals
        .map((func) => {
          if (func.economics.length === 0) {
            return transferFilter === 'transfers-only' ? { ...func, totalAmount: 0 } : func;
          }

          const originalEconomicTotal = func.economics.reduce((sum, eco) => sum + eco.amount, 0);
          const unclassifiedAmount = Math.max(func.totalAmount - originalEconomicTotal, 0);
          const filteredEco = filterEconomics(func.economics);
          const filteredEcoTotal = filteredEco.reduce((sum, eco) => sum + eco.amount, 0);

          return {
            ...func,
            economics: filteredEco,
            totalAmount: filteredEcoTotal + (transferFilter === 'transfers-only' ? 0 : unclassifiedAmount),
          };
        })
        .filter((func) => func.totalAmount !== 0 || func.economics.some((e) => e.amount !== 0));
    };

    const filtered = groups
      .map((chapter) => {
        const filteredFunctionals = filterFunctionals(chapter.functionals);
        const filteredSubchapters = (chapter.subchapters ?? [])
          .map((sub) => ({
            ...sub,
            functionals: filterFunctionals(sub.functionals),
          }))
          .map((sub) => ({
            ...sub,
            totalAmount: sub.functionals.reduce((sum, f) => sum + f.totalAmount, 0),
          }))
          .filter((sub) => sub.totalAmount !== 0);

        const newTotal =
          filteredFunctionals.reduce((sum, f) => sum + f.totalAmount, 0) +
          filteredSubchapters.reduce((sum, s) => sum + s.totalAmount, 0);

        return {
          ...chapter,
          functionals: filteredFunctionals,
          subchapters: filteredSubchapters,
          totalAmount: newTotal,
        };
      })
      .filter((chapter) => chapter.totalAmount !== 0);

    const filteredTotal = filtered.reduce((sum, chapter) => sum + chapter.totalAmount, 0);

    return { filteredGroups: filtered, filteredBaseTotal: filteredTotal };
  }, [baseTotal, groups, iconType, shouldFilterTransfers, transferFilter]);

  return (
    <Card className="shadow-lg dark:bg-slate-800 h-full flex flex-col">
      <CardHeader className="group flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Icon className={`h-6 w-6 mr-2 ${iconColor}`} />
            <Select
              value={currentYear.toString()}
              onValueChange={(val) => onYearChange(parseInt(val, 10))}
            >
              <SelectTrigger className="w-auto border-0 shadow-none bg-transparent focus:ring-0">
                <h3 className="text-lg font-semibold">
                  {title} ({dateLabel})
                </h3>
              </SelectTrigger>

              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()} onMouseEnter={() => onPrefetchYear?.(year)}>
                    {getYearLabel(year, month, quarter)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ClassificationInfoLink type="functional" />
          </div>

          <SearchToggleInput
            key={iconType}
            active={searchActive}
            initialSearchTerm={searchTerm}
            onToggle={onSearchToggle}
            onChange={onSearchChange}
            focusKey={searchFocusKey}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {subtitle && <span className="text-sm text-muted-foreground">{subtitle}</span>}
        </div>

      </CardHeader>
      <CardContent className="flex-grow">
        <GroupedItemsDisplay
          groups={filteredGroups}
          title={title}
          searchTerm={searchTerm}
          currentYear={currentYear}
          showTotalValueHeader={!!searchActive}
          month={month}
          quarter={quarter}
          normalization={normalization}
          currency={currency}
          baseTotal={filteredBaseTotal}
        />
      </CardContent>
    </Card>
  );
};
