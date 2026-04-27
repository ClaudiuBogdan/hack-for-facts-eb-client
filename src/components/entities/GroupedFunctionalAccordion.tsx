import React from 'react';
import { ClassificationInfoLink } from '@/components/common/classification-info-link';
import { Accordion, AccordionItem, AccordionContent, AccordionTrigger } from '@/components/ui/accordion';
import { GroupedFunctional, GroupedEconomic } from '@/schemas/financial';
import { highlightText } from './highlight-utils';
import { formatNormalizedValue, formatNumber } from '@/lib/utils';
import type { Currency, Normalization } from '@/schemas/charts';
import type {
  GroupedItemAnalyticsSelection,
  GroupedItemAnalyticsRequest,
  GroupedItemCopyPromptRequest,
} from './grouped-item-analytics';
import { buildGroupedItemMenuActions } from './grouped-item-analytics';
import {
  GROUPED_CODE_CLASS_NAME,
  GROUPED_INFO_LINK_CLASS_NAME,
  GROUPED_ITEM_LABEL_CLASS_NAME,
  GROUPED_LABEL_BLOCK_CLASS_NAME,
  GROUPED_LABEL_ROW_CLASS_NAME,
  GROUPED_ROW_CONTENT_CLASS_NAME,
  GROUPED_SECONDARY_VALUE_CLASS_NAME,
  GROUPED_TRIGGER_CONTENT_CLASS_NAME,
  GROUPED_VALUE_BLOCK_CLASS_NAME,
  GROUPED_VALUE_LINE_CLASS_NAME,
} from './grouped-row-styles';

interface GroupedFunctionalAccordionProps {
  func: GroupedFunctional;
  baseTotal: number;
  searchTerm: string;
  normalization?: Normalization;
  currency?: Currency;
  analyticsSelection?: GroupedItemAnalyticsSelection;
  analyticsPathOrder?: readonly ('fn' | 'ec')[];
  onAnalyticsRequest?: (request: GroupedItemAnalyticsRequest) => void;
  onCopyPromptRequest?: (request: GroupedItemCopyPromptRequest) => void;
}

const GroupedFunctionalAccordion: React.FC<GroupedFunctionalAccordionProps> = ({
  func,
  baseTotal,
  searchTerm,
  normalization,
  currency,
  analyticsSelection,
  analyticsPathOrder = ['fn', 'ec'],
  onAnalyticsRequest,
  onCopyPromptRequest,
}) => {
  const normalizationFormatOptions = { normalization: normalization ?? 'total', currency } as const
  const functionalSelection = {
    ...analyticsSelection,
    functionalCode: func.code,
  }
  const isSearchActive = searchTerm.trim().length > 0
  const [isManuallyOpen, setIsManuallyOpen] = React.useState(false)
  const accordionValue = isSearchActive || isManuallyOpen ? func.code : ''
  const handleAccordionValueChange = React.useCallback((nextValue: string) => {
    if (isSearchActive) {
      return
    }

    setIsManuallyOpen(nextValue === func.code)
  }, [func.code, isSearchActive])
  if (func.economics.length === 0) {
    return (
      <div key={func.code} className="group border-b py-2 px-3 sm:px-4">
        <div className={GROUPED_ROW_CONTENT_CLASS_NAME}>
          <div className={GROUPED_LABEL_BLOCK_CLASS_NAME}>
            <div className={GROUPED_LABEL_ROW_CLASS_NAME}>
              <span className={GROUPED_CODE_CLASS_NAME}>{highlightText(`fn:${func.code}`, searchTerm)}</span>
              <span className={GROUPED_ITEM_LABEL_CLASS_NAME}>{highlightText(func.name, searchTerm)}</span>
              <ClassificationInfoLink
                type="functional"
                code={func.code}
                className={GROUPED_INFO_LINK_CLASS_NAME}
                showOnHoverOnly={false}
                menuActions={buildGroupedItemMenuActions({
                  subjectLabel: func.name,
                  selection: functionalSelection,
                  pathOrder: analyticsPathOrder,
                  displayedItem: {
                    type: 'fn',
                    code: func.code,
                  },
                  onAnalyticsRequest,
                  onCopyPromptRequest,
                })}
              />
            </div>
          </div>
          <div className={GROUPED_VALUE_BLOCK_CLASS_NAME}>
            <p className={GROUPED_VALUE_LINE_CLASS_NAME}>
              {formatNormalizedValue(func.totalAmount, normalizationFormatOptions, "compact")}
              {baseTotal > 0 && (
                <span className="hidden sm:inline text-xs text-muted-foreground">{`(${formatNumber(func.totalAmount / baseTotal * 100)}%)`}</span>
              )}
            </p>
            <p className={GROUPED_SECONDARY_VALUE_CLASS_NAME}>
              {formatNormalizedValue(func.totalAmount, normalizationFormatOptions, "standard")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If this is a .00 item and it's the only child (handled at subchapter level), we already render a non-accordion row.
  return (
    <Accordion
      key={func.code}
      type="single"
      collapsible
      value={accordionValue}
      onValueChange={handleAccordionValueChange}
    >
      <AccordionItem value={func.code}>
        <AccordionTrigger className="group items-start gap-3 py-2 px-3 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 sm:px-4 [&[data-state=open]]:bg-slate-100 dark:[&[data-state=open]]:bg-slate-700 [&>svg]:mt-0.5">
          <div className={GROUPED_TRIGGER_CONTENT_CLASS_NAME}>
            <div className={GROUPED_LABEL_BLOCK_CLASS_NAME}>
              <div className={GROUPED_LABEL_ROW_CLASS_NAME}>
                <span className={GROUPED_CODE_CLASS_NAME}>{highlightText(`fn:${func.code}`, searchTerm)}</span>
                <span className={GROUPED_ITEM_LABEL_CLASS_NAME}>{highlightText(func.name, searchTerm)}</span>
                <ClassificationInfoLink
                  type="functional"
                  code={func.code}
                  className={GROUPED_INFO_LINK_CLASS_NAME}
                  showOnHoverOnly={false}
                  menuActions={buildGroupedItemMenuActions({
                    subjectLabel: func.name,
                    selection: functionalSelection,
                    pathOrder: analyticsPathOrder,
                    displayedItem: {
                      type: 'fn',
                      code: func.code,
                    },
                    onAnalyticsRequest,
                    onCopyPromptRequest,
                  })}
                />
              </div>
            </div>
            <div className={GROUPED_VALUE_BLOCK_CLASS_NAME}>
              <p className={GROUPED_VALUE_LINE_CLASS_NAME}>
                {formatNormalizedValue(func.totalAmount, normalizationFormatOptions, "compact")}
                {baseTotal > 0 && (
                  <span className="hidden sm:inline text-xs text-muted-foreground">{`(${formatNumber(func.totalAmount / baseTotal * 100)}%)`}</span>
                )}
              </p>
              <p className={GROUPED_SECONDARY_VALUE_CLASS_NAME}>
                {formatNormalizedValue(func.totalAmount, normalizationFormatOptions, "standard")}
              </p>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <ul className="divide-y divide-slate-100 dark:divide-slate-800 py-1 px-3 sm:px-4">
            {func.economics
              .slice()
              .sort((a: GroupedEconomic, b: GroupedEconomic) => b.amount - a.amount)
              .map((eco: GroupedEconomic) => (
                <li key={eco.code} className="group py-1.5">
                  <div className={GROUPED_ROW_CONTENT_CLASS_NAME}>
                    <div className={GROUPED_LABEL_BLOCK_CLASS_NAME}>
                      <div className={`${GROUPED_LABEL_ROW_CLASS_NAME} pl-2`}>
                        <span className={GROUPED_CODE_CLASS_NAME}>{highlightText(`ec:${eco.code}`, searchTerm)}</span>
                        <span className={GROUPED_ITEM_LABEL_CLASS_NAME}>{highlightText(eco.name, searchTerm)}</span>
                        <ClassificationInfoLink
                          type="economic"
                          code={eco.code}
                          className={GROUPED_INFO_LINK_CLASS_NAME}
                          showOnHoverOnly={false}
                          menuActions={buildGroupedItemMenuActions({
                            subjectLabel: eco.name,
                            selection: {
                              ...functionalSelection,
                              economicCode: eco.code,
                            },
                            pathOrder: analyticsPathOrder,
                            displayedItem: {
                              type: 'ec',
                              code: eco.code,
                            },
                            onAnalyticsRequest,
                            onCopyPromptRequest,
                          })}
                        />
                      </div>
                    </div>
                    <div className={GROUPED_VALUE_BLOCK_CLASS_NAME}>
                      <p className={GROUPED_VALUE_LINE_CLASS_NAME}>
                        {formatNormalizedValue(eco.amount, normalizationFormatOptions, "compact")}
                        {baseTotal > 0 && (
                          <span className="hidden sm:inline text-xs text-muted-foreground">{`(${formatNumber(eco.amount / baseTotal * 100)}%)`}</span>
                        )}
                      </p>
                      <p className={GROUPED_SECONDARY_VALUE_CLASS_NAME}>
                        {formatNormalizedValue(eco.amount, normalizationFormatOptions, "standard")}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default GroupedFunctionalAccordion; 
