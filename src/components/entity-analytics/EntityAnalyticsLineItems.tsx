import { BudgetAnalyticsError } from './BudgetAnalyticsError'
import React, { useMemo, useState } from "react";
import type { AnalyticsFilterType } from "@/schemas/charts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SearchToggleInput } from "../entities/SearchToggleInput";
import { GroupedItemsDisplay } from "../entities/FinancialDataCard";
import { useFinancialData, MinimalExecutionLineItem } from "@/hooks/useFinancialData";
import { EntityAnalyticsLineItemsSkeleton } from "./EntityAnalyticsLineItemsSkeleton";
import { Button } from "@/components/ui/button";
import { BarChart2Icon } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { generateChartFromTopGroups } from "@/lib/chart-generation-utils";
import { Trans } from "@lingui/react/macro";
import type { AggregatedLineItemConnection } from "@/schemas/entity-analytics";
import { generateHash } from "@/lib/utils";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info } from 'lucide-react';

interface EntityAnalyticsLineItemsProps {
  filter: AnalyticsFilterType;
  title: string;
  groupBy: 'fn' | 'ec';
  data?: AggregatedLineItemConnection;
  isLoading?: boolean;
  error?: Error | null;
  transferFilter?: 'all' | 'no-transfers' | 'transfers-only';
  onTransferFilterChange?: (filter: 'all' | 'no-transfers' | 'transfers-only') => void;
}

export const EntityAnalyticsLineItems: React.FC<
  EntityAnalyticsLineItemsProps
  > = ({ filter, title, groupBy, data, isLoading, error, transferFilter = 'no-transfers', onTransferFilterChange }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const executionLineItems: MinimalExecutionLineItem[] = useMemo(() => {
    if (!data?.nodes) return [];

    let nodes = data.nodes;

    if (filter.account_category === 'ch' && transferFilter !== 'all') {
      const isTransfer = (code: string) => code.startsWith('51.01') || code.startsWith('51.02');
      nodes = nodes.filter(item => {
        const code = item.ec_c || '';
        const isTrans = isTransfer(code);
        return transferFilter === 'transfers-only' ? isTrans : !isTrans;
      });
    }

    return nodes.map((item) => ({
      account_category: filter.account_category, // Assuming filter.account_category is 'ch' or 'vn'
      amount: item.amount,
      economicClassification: {
        economic_code: item.ec_c,
        economic_name: item.ec_n,
      },
      functionalClassification: {
        functional_code: item.fn_c,
        functional_name: item.fn_n,
      },
    }));
  }, [data, filter.account_category, transferFilter]);

  const {
    expenseSearchTerm,
    onExpenseSearchChange,
    expenseSearchActive,
    onExpenseSearchToggle,
    filteredExpenseGroups,
    expenseBase,
    incomeSearchTerm,
    onIncomeSearchChange,
    incomeSearchActive,
    onIncomeSearchToggle,
    filteredIncomeGroups,
    incomeBase,
    filteredEconomicGroups,
  } = useFinancialData(
    executionLineItems,
    filter.account_category === 'vn' ? executionLineItems.reduce((sum, item) => sum + item.amount, 0) : null,
    filter.account_category === 'ch' ? executionLineItems.reduce((sum, item) => sum + item.amount, 0) : null,
    filter.account_category === 'ch' ? searchTerm : '',
    filter.account_category === 'vn' ? searchTerm : '',
    { computeEconomic: groupBy === 'ec' }
  );

  const handleSearchChange = (term: string) => {
    if (filter.account_category === 'ch') {
      onExpenseSearchChange(term);
    } else {
      onIncomeSearchChange(term);
    }
    setSearchTerm(term);
  };

  const handleSearchToggle = (active: boolean) => {
    if (filter.account_category === 'ch') {
      onExpenseSearchToggle(active);
    } else {
      onIncomeSearchToggle(active);
    }
  };

  const navigate = useNavigate();

  const handleViewChart = () => {
    const filterHash = generateHash(JSON.stringify(filter));
    const newChart = generateChartFromTopGroups(
      groupsToDisplay,
      baseTotalToDisplay,
      filter,
      title,
      groupBy,
      filterHash
    );
    navigate({
      to: '/charts/$chartId',
      params: { chartId: newChart.id },
      search: { chart: newChart, view: 'overview' },
    });
  };

  const groupsToDisplay = groupBy === 'ec' ? filteredEconomicGroups : filter.account_category === 'vn' ? filteredIncomeGroups : filteredExpenseGroups;
  const baseTotalToDisplay = groupBy === 'ec' ? expenseBase : filter.account_category === 'vn' ? incomeBase : expenseBase;
  const currentSearchTerm = groupBy === 'ec' ? expenseSearchTerm : filter.account_category === 'vn' ? incomeSearchTerm : expenseSearchTerm;
  const currentSearchActive = groupBy === 'ec' ? expenseSearchActive : filter.account_category === 'vn' ? incomeSearchActive : expenseSearchActive;

  return (
    <Card className="shadow-lg dark:bg-slate-800 h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Button variant="outline" size="sm" onClick={handleViewChart}>
            <BarChart2Icon className="w-4 h-4" />
            <Trans>View Chart</Trans>
          </Button>
        </div>
        <SearchToggleInput
          active={currentSearchActive}
          initialSearchTerm={currentSearchTerm}
          onToggle={handleSearchToggle}
          onChange={handleSearchChange}
        />
      </CardHeader>
      {filter.account_category === 'ch' && onTransferFilterChange && (
        <div className="px-6 pb-4 flex items-center gap-2 w-full sm:w-auto">
          <Tabs value={transferFilter} onValueChange={(v) => onTransferFilterChange(v as 'all' | 'no-transfers' | 'transfers-only')} className="w-full sm:w-auto">
            <TabsList className="flex w-full justify-start overflow-x-auto sm:w-auto sm:overflow-visible no-scrollbar">
              <TabsTrigger value="no-transfers" className="flex-shrink-0"><Trans>Without Transfers</Trans></TabsTrigger>
              <TabsTrigger value="all" className="flex-shrink-0"><Trans>All</Trans></TabsTrigger>
              <TabsTrigger value="transfers-only" className="flex-shrink-0"><Trans>Transfers Only</Trans></TabsTrigger>
            </TabsList>
          </Tabs>
          <Popover>
            <PopoverTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" />
            </PopoverTrigger>
            <PopoverContent className="w-96">
              <div className="space-y-3">
                <h4 className="font-medium leading-none"><Trans>Filter Transfers</Trans></h4>
                <p className="text-sm text-muted-foreground">
                  <Trans>
                    Public institutions often transfer funds between each other (e.g., from the state budget to local budgets). These transfers can double-count spending if not filtered.
                  </Trans>
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li><strong><Trans>Without Transfers</Trans>:</strong> <Trans>Shows only direct spending by this entity. Excludes funds moved to other institutions (codes 51 and 55).</Trans></li>
                  <li><strong><Trans>All</Trans>:</strong> <Trans>Shows all spending, including both direct payments and transfers to other institutions.</Trans></li>
                  <li><strong><Trans>Transfers Only</Trans>:</strong> <Trans>Shows only the funds transferred to other public administration units.</Trans></li>
                </ul>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
      <CardContent className="flex-grow">
        {isLoading ? (
          <EntityAnalyticsLineItemsSkeleton itemCount={10} />
        ) : error ? (
          <div><p><Trans>Error loading data</Trans></p><BudgetAnalyticsError error={error} /></div>
        ) : (
          <GroupedItemsDisplay
            groups={groupsToDisplay}
            title={title}
            baseTotal={baseTotalToDisplay}
            searchTerm={currentSearchTerm}
            currentYear={0} // Year is not applicable here
            showTotalValueHeader={!!currentSearchActive}
            normalization={filter.normalization}
            currency={filter.currency}
            subchapterCodePrefix={groupBy}
          />
        )}
      </CardContent>
    </Card>
  );
};
