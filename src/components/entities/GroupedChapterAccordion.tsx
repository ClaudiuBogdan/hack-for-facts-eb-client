import React from 'react';
import { AccordionItem, AccordionContent, AccordionTrigger } from '@/components/ui/accordion';
import { GroupedChapter, GroupedFunctional, GroupedSubchapter } from '@/schemas/financial';
import GroupedFunctionalAccordion from './GroupedFunctionalAccordion';
import GroupedSubchapterAccordion from './GroupedSubchapterAccordion';
import { highlightText } from './highlight-utils';
import { formatNormalizedValue, formatNumber } from '@/lib/utils';
import { ClassificationInfoLink } from '@/components/common/classification-info-link';
import type { Currency, Normalization } from '@/schemas/charts';
import { buildGroupedItemMenuActions } from './FinancialDataCard';
import type {
  GroupedItemAnalyticsSelection,
  GroupedItemAnalyticsRequest,
  GroupedItemCopyPromptRequest,
} from './FinancialDataCard';
import {
  GROUPED_CHAPTER_LABEL_CLASS_NAME,
  GROUPED_CHAPTER_LABEL_ROW_CLASS_NAME,
  GROUPED_CHAPTER_TRIGGER_CONTENT_CLASS_NAME,
  GROUPED_CHAPTER_VALUE_BLOCK_CLASS_NAME,
  GROUPED_INFO_LINK_CLASS_NAME,
  GROUPED_LABEL_BLOCK_CLASS_NAME,
  GROUPED_SECONDARY_VALUE_CLASS_NAME,
  GROUPED_VALUE_LINE_CLASS_NAME,
} from './grouped-row-styles';

interface GroupedChapterAccordionProps {
  ch: GroupedChapter;
  baseTotal: number;
  searchTerm: string;
  normalization?: Normalization;
  currency?: Currency;
  codePrefixForSubchapters?: 'fn' | 'ec';
  analyticsSelection?: GroupedItemAnalyticsSelection;
  analyticsPathOrder?: readonly ('fn' | 'ec')[];
  onAnalyticsRequest?: (request: GroupedItemAnalyticsRequest) => void;
  onCopyPromptRequest?: (request: GroupedItemCopyPromptRequest) => void;
}

const GroupedChapterAccordion: React.FC<GroupedChapterAccordionProps> = ({
  ch,
  baseTotal,
  searchTerm,
  normalization,
  currency,
  codePrefixForSubchapters = 'fn',
  analyticsSelection,
  analyticsPathOrder = codePrefixForSubchapters === 'ec' ? ['ec', 'fn'] : ['fn', 'ec'],
  onAnalyticsRequest,
  onCopyPromptRequest,
}) => {
  const normalizationFormatOptions = { normalization: normalization ?? 'total', currency } as const
  const chapterClassificationType =
    codePrefixForSubchapters === 'ec' ? 'economic' : 'functional'
  const chapterSelection = analyticsSelection
    ?? (
      codePrefixForSubchapters === 'ec'
        ? { economicCode: ch.prefix }
        : { functionalCode: ch.prefix }
    )
  // Merge subchapters and functionals and sort by total amount descending
  const mergedSortedItems = React.useMemo(() => {
    const subs = (ch.subchapters ?? []).map((s) => ({ kind: 'sub' as const, amount: s.totalAmount, data: s }));
    const funcs = ch.functionals.map((f) => ({ kind: 'func' as const, amount: f.totalAmount, data: f }));
    return [...subs, ...funcs].sort((a, b) => b.amount - a.amount);
  }, [ch.subchapters, ch.functionals]);

  return (
    <AccordionItem key={ch.prefix} value={ch.prefix}>
      <AccordionTrigger className="group items-start gap-3 py-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 [&[data-state=open]]:bg-slate-100 dark:[&[data-state=open]]:bg-slate-700 [&>svg]:mt-0.5">
        <div className={GROUPED_CHAPTER_TRIGGER_CONTENT_CLASS_NAME}>
          <div className={GROUPED_LABEL_BLOCK_CLASS_NAME}>
            <div className={GROUPED_CHAPTER_LABEL_ROW_CLASS_NAME}>
              <span className={GROUPED_CHAPTER_LABEL_CLASS_NAME}>
                {highlightText(ch.description, searchTerm)}
              </span>
              <ClassificationInfoLink
                type={chapterClassificationType}
              code={ch.prefix}
              className={GROUPED_INFO_LINK_CLASS_NAME}
              showOnHoverOnly={false}
              menuActions={buildGroupedItemMenuActions({
                subjectLabel: ch.description,
                selection: chapterSelection,
                pathOrder: analyticsPathOrder,
                displayedItem: {
                  type: codePrefixForSubchapters === 'ec' ? 'ec' : 'fn',
                  code: ch.prefix,
                },
                onAnalyticsRequest,
                onCopyPromptRequest,
              })}
              />
            </div>
          </div>
          <div className={GROUPED_CHAPTER_VALUE_BLOCK_CLASS_NAME}>
            <p className={GROUPED_VALUE_LINE_CLASS_NAME}>
              {formatNormalizedValue(ch.totalAmount, normalizationFormatOptions, "compact")}
              {baseTotal > 0 && (
                <span className="hidden sm:inline text-xs text-muted-foreground">{`(${formatNumber(ch.totalAmount / baseTotal * 100)}%)`}</span>
              )}
            </p>
            <p className={GROUPED_SECONDARY_VALUE_CLASS_NAME}>
              {formatNormalizedValue(ch.totalAmount, normalizationFormatOptions, "standard")}
            </p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="border-x-2 border-b-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="space-y-2 px-3 sm:px-4 py-2">
          <div className="space-y-2">
            {mergedSortedItems.map((entry) => (
              entry.kind === 'sub' ? (
                <GroupedSubchapterAccordion
                  key={(entry.data as GroupedSubchapter).code}
                  sub={entry.data as GroupedSubchapter}
                  baseTotal={baseTotal}
                  searchTerm={searchTerm}
                  normalization={normalization}
                  currency={currency}
                  codePrefix={codePrefixForSubchapters}
                  analyticsSelection={
                    codePrefixForSubchapters === 'ec'
                      ? {
                          ...chapterSelection,
                          economicCode: (entry.data as GroupedSubchapter).code,
                        }
                      : {
                          ...chapterSelection,
                          functionalCode: (entry.data as GroupedSubchapter).code,
                        }
                  }
                  analyticsPathOrder={analyticsPathOrder}
                  onAnalyticsRequest={onAnalyticsRequest}
                  onCopyPromptRequest={onCopyPromptRequest}
                />
              ) : (
                <GroupedFunctionalAccordion
                  key={(entry.data as GroupedFunctional).code}
                  func={entry.data as GroupedFunctional}
                  baseTotal={baseTotal}
                  searchTerm={searchTerm}
                  normalization={normalization}
                  currency={currency}
                  analyticsSelection={chapterSelection}
                  analyticsPathOrder={analyticsPathOrder}
                  onAnalyticsRequest={onAnalyticsRequest}
                  onCopyPromptRequest={onCopyPromptRequest}
                />
              )
            ))}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};

export default GroupedChapterAccordion; 
