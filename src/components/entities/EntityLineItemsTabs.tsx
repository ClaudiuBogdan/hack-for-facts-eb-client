import React from 'react';
import { type ExecutionLineItem, type FundingSourceOption, filterLineItems } from '@/lib/api/entities';
import { t } from '@lingui/core/macro';
import type { TMonth, TQuarter } from '@/schemas/reporting';
import { LineItemsGroupedSection } from './LineItemsGroupedSection';
import { LineItemsBadgeFilters } from './LineItemsBadgeFilters';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { AdvancedFilterDropdown } from './AdvancedFilterDropdown';
import { Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Trans } from '@lingui/react/macro';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Currency, Normalization } from '@/schemas/charts';

export interface EntityLineItemsTabsProps {
  lineItems: readonly ExecutionLineItem[];
  fundingSources?: readonly FundingSourceOption[];
  currentYear: number;
  month?: TMonth;
  quarter?: TQuarter;
  years: number[];
  onYearChange: (year: number) => void;
  initialExpenseSearchTerm: string;
  initialIncomeSearchTerm: string;
  onSearchChange: (type: 'expense' | 'income', term: string) => void;
  isLoading?: boolean;
  normalization?: Normalization;
  currency?: Currency;
  onPrefetchYear?: (year: number) => void;
  // Shared tab state
  lineItemsTab?: 'functional' | 'funding' | 'expenseType';
  onLineItemsTabChange?: (tab: 'functional' | 'funding' | 'expenseType') => void;
  // Selected keys
  selectedFundingKey?: string;
  selectedExpenseTypeKey?: string;
  onSelectedFundingKeyChange?: (key: string) => void;
  onSelectedExpenseTypeKeyChange?: (key: string) => void;
  types?: readonly ('income' | 'expense')[];
  transferFilter?: 'all' | 'no-transfers' | 'transfers-only';
  onTransferFilterChange?: (filter: 'all' | 'no-transfers' | 'transfers-only') => void;
  advancedFilter?: string;
  onAdvancedFilterChange?: (filter: string | undefined) => void;
}

const EntityLineItemsTabsComponent: React.FC<EntityLineItemsTabsProps> = ({
  lineItems,
  fundingSources = [],
  currentYear,
  month,
  quarter,
  years,
  onYearChange,
  initialExpenseSearchTerm,
  initialIncomeSearchTerm,
  onSearchChange,
  isLoading,
  normalization,
  currency,
  onPrefetchYear,
  lineItemsTab = 'functional',
  onLineItemsTabChange,
  selectedFundingKey = '',
  selectedExpenseTypeKey = '',
  onSelectedFundingKeyChange,
  onSelectedExpenseTypeKeyChange,
  types,
  transferFilter,
  onTransferFilterChange,
  advancedFilter,
  onAdvancedFilterChange,
}) => {
  const renderedTypes = (types && types.length > 0 ? [...types] : ['income', 'expense']) as ('income' | 'expense')[];
  const isDualColumn = renderedTypes.length > 1;
  const badgeDisplayMode = isDualColumn ? 'combined' : 'single';
  const badgeAccountCategory = !isDualColumn ? (renderedTypes[0] === 'income' ? 'vn' : 'ch') : undefined;

  // Filter items based on advanced filter
  const filteredLineItems = React.useMemo(() => {
    return filterLineItems(lineItems, advancedFilter);
  }, [lineItems, advancedFilter]);

  const typeConfigs = renderedTypes.map((type) => ({
    type,
    title: type === 'income' ? t`Incomes` : t`Expenses`,
    searchTerm: type === 'income' ? initialIncomeSearchTerm : initialExpenseSearchTerm,
    onSearchTermChange: (term: string) => onSearchChange(type, term),
    iconType: type,
    searchFocusKey: type === 'income' ? 'mod+l' : 'mod+j',
  }));

  const gridClassName = `grid grid-cols-1 gap-6${isDualColumn ? ' lg:grid-cols-2' : ''}`;

  const getAdvancedFilterLabel = (filter: string) => {
    switch (filter) {
      case 'economic:all': return t`All Economic`;
      case 'economic:personal': return t`Personal Spending`;
      case 'economic:goods': return t`Goods & Services`;
      case 'economic:others': return t`Other Economic`;
      case 'anomaly:missing': return t`Missing Items`;
      case 'anomaly:value_changed': return t`Value Changed`;
      default: return filter;
    }
  };

  return (
    <section className="space-y-2 mb-2">

      {onTransferFilterChange && (
        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            value={transferFilter ?? 'no-transfers'}
            onValueChange={(value) => {
              if (value) {
                onTransferFilterChange(value as 'all' | 'no-transfers' | 'transfers-only');
              }
            }}
            className="flex gap-2 justify-start"
          >
            <ToggleGroupItem
              value="no-transfers"
              className="data-[state=on]:bg-black data-[state=on]:text-white py-6 sm:py-0"
            >
              <Trans>Without Transfers</Trans>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="transfers-only"
              className="data-[state=on]:bg-black data-[state=on]:text-white py-6 sm:py-0"
            >
              <Trans>Transfers Only</Trans>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="all"
              className="data-[state=on]:bg-black data-[state=on]:text-white py-6 sm:py-0"
            >
              <Trans>All</Trans>
            </ToggleGroupItem>
          </ToggleGroup>
          <Popover>
            <PopoverTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" />
            </PopoverTrigger>
            <PopoverContent className="w-96">
              <div className="space-y-3">
                <h4 className="font-medium leading-none"><Trans>Filter Transfers</Trans></h4>
                <p className="text-sm text-muted-foreground">
                  <Trans>
                    Public institutions often transfer funds between each other. These transfers can double-count spending or revenue if not filtered.
                  </Trans>
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li><strong><Trans>Without Transfers</Trans>:</strong> <Trans>Shows only direct spending/revenue. Excludes internal transfers.</Trans></li>
                  <li><strong><Trans>All</Trans>:</strong> <Trans>Shows all items, including transfers between institutions.</Trans></li>
                  <li><strong><Trans>Transfers Only</Trans>:</strong> <Trans>Shows only the funds transferred between public administration units.</Trans></li>
                </ul>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          type="single"
          value={lineItemsTab}
          onValueChange={(value) => {
            if (value) {
              onLineItemsTabChange?.(value as 'functional' | 'funding' | 'expenseType');
            }
          }}
          className="flex gap-2 justify-start"
        >
          <ToggleGroupItem
            value="functional"
            className="data-[state=on]:bg-black data-[state=on]:text-white py-6 sm:py-0"
          >
            {t`By Category`}
          </ToggleGroupItem>
          <ToggleGroupItem
            value="funding"
            className="data-[state=on]:bg-black data-[state=on]:text-white py-6 sm:py-0"
          >
            {t`By Funding Source`}
          </ToggleGroupItem>
          <ToggleGroupItem
            value="expenseType"
            className="data-[state=on]:bg-black data-[state=on]:text-white py-6 sm:py-0"
          >
            {t`By Expense Type`}
          </ToggleGroupItem>
        </ToggleGroup>

        {onAdvancedFilterChange && (
          <>
            <AdvancedFilterDropdown onSelect={onAdvancedFilterChange} currentFilter={advancedFilter} />
            {advancedFilter && (
              <div className="flex items-center gap-1 bg-muted px-3 py-1 rounded-full text-sm font-medium">
                {getAdvancedFilterLabel(advancedFilter)}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 hover:bg-transparent"
                  onClick={() => onAdvancedFilterChange(undefined)}
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only"><Trans>Remove filter</Trans></span>
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {lineItemsTab === 'functional' && (
        <div className="mt-4">
          <div className={gridClassName}>
            {typeConfigs.map(({ type, title, searchTerm, onSearchTermChange, iconType, searchFocusKey }) => (
              <LineItemsGroupedSection
                key={type}
                items={filteredLineItems}
                fundingSources={fundingSources}
                type={type}
                title={title}
                currentYear={currentYear}
                years={years}
                month={month}
                quarter={quarter}
                normalization={normalization}
                currency={currency}
                onYearChange={onYearChange}
                onPrefetchYear={onPrefetchYear}
                isLoading={isLoading}
                activeTab="functional"
                initialSearchTerm={searchTerm}
                onInitialSearchChange={onSearchTermChange}
                iconType={iconType}
                searchFocusKey={searchFocusKey}
                transferFilter={transferFilter}
              />
            ))}
          </div>
        </div>
      )}
      {lineItemsTab === 'funding' && (
        <div className="mt-4">
          <LineItemsBadgeFilters
            items={filteredLineItems}
            fundingSources={fundingSources}
            mode="funding"
            selectedKey={selectedFundingKey}
            onSelectedKeyChange={onSelectedFundingKeyChange || (() => { })}
            normalization={normalization}
            currency={currency}
            isLoading={isLoading}
            displayMode={badgeDisplayMode}
            accountCategory={badgeAccountCategory}
          />

          <div className={gridClassName}>
            {typeConfigs.map(({ type, title, searchTerm, onSearchTermChange, iconType, searchFocusKey }) => (
              <LineItemsGroupedSection
                key={type}
                items={filteredLineItems}
                fundingSources={fundingSources}
                type={type}
                title={title}
                currentYear={currentYear}
                years={years}
                month={month}
                quarter={quarter}
                normalization={normalization}
                currency={currency}
                onYearChange={onYearChange}
                onPrefetchYear={onPrefetchYear}
                isLoading={isLoading}
                activeTab="funding"
                selectedFundingKey={selectedFundingKey}
                onSelectedFundingKeyChange={onSelectedFundingKeyChange}
                initialSearchTerm={searchTerm}
                onInitialSearchChange={onSearchTermChange}
                iconType={iconType}
                searchFocusKey={searchFocusKey}
                transferFilter={transferFilter}
              />
            ))}
          </div>
        </div>
      )}
      {lineItemsTab === 'expenseType' && (
        <div className="mt-4">
          <LineItemsBadgeFilters
            items={filteredLineItems}
            fundingSources={fundingSources}
            mode="expenseType"
            selectedKey={selectedExpenseTypeKey}
            onSelectedKeyChange={onSelectedExpenseTypeKeyChange || (() => { })}
            normalization={normalization}
            currency={currency}
            isLoading={isLoading}
            displayMode={badgeDisplayMode}
            accountCategory={badgeAccountCategory}
          />

          <div className={gridClassName}>
            {typeConfigs.map(({ type, title, searchTerm, onSearchTermChange, iconType, searchFocusKey }) => (
              <LineItemsGroupedSection
                key={type}
                items={filteredLineItems}
                fundingSources={fundingSources}
                type={type}
                title={title}
                currentYear={currentYear}
                years={years}
                month={month}
                quarter={quarter}
                normalization={normalization}
                currency={currency}
                onYearChange={onYearChange}
                onPrefetchYear={onPrefetchYear}
                isLoading={isLoading}
                activeTab="expenseType"
                selectedExpenseTypeKey={selectedExpenseTypeKey}
                onSelectedExpenseTypeKeyChange={onSelectedExpenseTypeKeyChange}
                initialSearchTerm={searchTerm}
                onInitialSearchChange={onSearchTermChange}
                iconType={iconType}
                searchFocusKey={searchFocusKey}
                transferFilter={transferFilter}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export const EntityLineItemsTabs = React.memo(EntityLineItemsTabsComponent);
