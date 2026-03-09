import React from 'react';
import { ClassificationInfoLink } from '@/components/common/classification-info-link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { GroupedSubchapter, GroupedFunctional } from '@/schemas/financial';
import { highlightText } from './highlight-utils';
import { formatNormalizedValue } from '@/lib/utils';
import type { Currency, Normalization } from '@/schemas/charts';
import type {
    GroupedItemAnalyticsSelection,
    GroupedItemAnalyticsRequest,
    GroupedItemCopyPromptRequest,
} from './FinancialDataCard';
import { buildGroupedItemMenuActions } from './FinancialDataCard';
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

interface GroupedSubchapterAccordionProps {
    sub: GroupedSubchapter;
    baseTotal: number;
    searchTerm: string;
    normalization?: Normalization;
    currency?: Currency;
    codePrefix?: 'fn' | 'ec';
    analyticsSelection?: GroupedItemAnalyticsSelection;
    analyticsPathOrder?: readonly ('fn' | 'ec')[];
    onAnalyticsRequest?: (request: GroupedItemAnalyticsRequest) => void;
    onCopyPromptRequest?: (request: GroupedItemCopyPromptRequest) => void;
}

const GroupedSubchapterAccordion: React.FC<GroupedSubchapterAccordionProps> = ({
    sub,
    baseTotal,
    searchTerm,
    normalization,
    currency,
    codePrefix = 'fn',
    analyticsSelection,
    analyticsPathOrder = codePrefix === 'ec' ? ['ec', 'fn'] : ['fn', 'ec'],
    onAnalyticsRequest,
    onCopyPromptRequest,
}) => {
    const normalizationFormatOptions = { normalization: normalization ?? 'total', currency } as const
    const subchapterSelection = analyticsSelection
        ?? (
            codePrefix === 'ec'
                ? { economicCode: sub.code }
                : { functionalCode: sub.code }
        )
    // Example:
    // fn:36.01 / ec:30.01 - Subchapter label
    // fn:36.01.00 - Venituri din aplicarea prescriptiei extinctive -> .00 child from the line items list
    const singleZeroChild = sub.functionals.length === 1 && /^(\d{2})\.(\d{2})\.00$/.test(sub.functionals[0].code);
    // Example:
    // fn:36.01 - Venituri din aplicarea prescriptiei extinctive -> subchapter
    // fn:36.01.01 - Venituri din aplicarea prescriptiei extinctive -> .01 child from the line items list
    const singleSameDescriptionChild = sub.functionals.length === 1 && sub.functionals[0].name === sub.name;

    if (singleZeroChild || singleSameDescriptionChild) {
        // Render as a single non-accordion row to avoid duplicating the same item
        const childFunctionalCode = sub.functionals[0].code;
        const collapsedCode = codePrefix === 'ec' ? sub.code : childFunctionalCode;
        const collapsedLabel = sub.name;
        const collapsedClassificationType = codePrefix === 'ec' ? 'economic' : 'functional';

        return (
            <div className="group border-b py-2 px-3 sm:px-4">
                <div className={GROUPED_ROW_CONTENT_CLASS_NAME}>
                    <div className={GROUPED_LABEL_BLOCK_CLASS_NAME}>
                        <div className={GROUPED_LABEL_ROW_CLASS_NAME}>
                            <span className={GROUPED_CODE_CLASS_NAME}>{highlightText(`${codePrefix}:${collapsedCode}`, searchTerm)}</span>
                            <span className={GROUPED_ITEM_LABEL_CLASS_NAME}>{highlightText(collapsedLabel, searchTerm)}</span>
                            <ClassificationInfoLink
                                type={collapsedClassificationType}
                                code={collapsedCode}
                                className={GROUPED_INFO_LINK_CLASS_NAME}
                                showOnHoverOnly={false}
                                menuActions={buildGroupedItemMenuActions({
                                  subjectLabel: collapsedLabel,
                                  selection: {
                                    ...subchapterSelection,
                                    functionalCode: childFunctionalCode,
                                  },
                                  pathOrder: analyticsPathOrder,
                                  displayedItem: {
                                    type: collapsedClassificationType === 'economic' ? 'ec' : 'fn',
                                    code: collapsedCode,
                                  },
                                  onAnalyticsRequest,
                                  onCopyPromptRequest,
                                })}
                            />
                        </div>
                    </div>
                    <div className={GROUPED_VALUE_BLOCK_CLASS_NAME}>
                        <p className={GROUPED_VALUE_LINE_CLASS_NAME}>
                            {formatNormalizedValue(sub.totalAmount, normalizationFormatOptions, 'compact')}
                            { baseTotal > 0 && <span className="hidden sm:inline text-xs text-muted-foreground">{`(${(Math.round((sub.totalAmount / baseTotal) * 1000) / 10).toFixed(1)}%)`}</span> }
                        </p>
                        <p className={GROUPED_SECONDARY_VALUE_CLASS_NAME}>{formatNormalizedValue(sub.totalAmount, normalizationFormatOptions, 'standard')}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <Accordion
            type="single"
            collapsible
            {...(searchTerm ? { defaultValue: sub.code } : {})}
        >
            <AccordionItem value={sub.code}>
                <AccordionTrigger className="group items-start gap-3 py-2 px-3 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 sm:px-4 [&[data-state=open]]:bg-slate-100 dark:[&[data-state=open]]:bg-slate-700 [&>svg]:mt-0.5">
                    <div className={GROUPED_TRIGGER_CONTENT_CLASS_NAME}>
                        <div className={GROUPED_LABEL_BLOCK_CLASS_NAME}>
                            <div className={GROUPED_LABEL_ROW_CLASS_NAME}>
                                <span className={GROUPED_CODE_CLASS_NAME}>{highlightText(`${codePrefix}:${sub.code}`, searchTerm)}</span>
                                <span className={GROUPED_ITEM_LABEL_CLASS_NAME}>{highlightText(sub.name, searchTerm)}</span>
                                <ClassificationInfoLink
                                    type={codePrefix === 'ec' ? 'economic' : 'functional'}
                                    code={sub.code}
                                    className={GROUPED_INFO_LINK_CLASS_NAME}
                                    showOnHoverOnly={false}
                                    menuActions={buildGroupedItemMenuActions({
                                      subjectLabel: sub.name,
                                      selection: subchapterSelection,
                                      pathOrder: analyticsPathOrder,
                                      displayedItem: {
                                        type: codePrefix === 'ec' ? 'ec' : 'fn',
                                        code: sub.code,
                                      },
                                      onAnalyticsRequest,
                                      onCopyPromptRequest,
                                    })}
                                />
                            </div>
                        </div>
                        <div className={GROUPED_VALUE_BLOCK_CLASS_NAME}>
                            <p className={GROUPED_VALUE_LINE_CLASS_NAME}>
                                {formatNormalizedValue(sub.totalAmount, normalizationFormatOptions, 'compact')}
                                { baseTotal > 0 && <span className="hidden sm:inline text-xs text-muted-foreground">{`(${(Math.round((sub.totalAmount / baseTotal) * 1000) / 10).toFixed(1)}%)`}</span> }
                            </p>
                            <p className={GROUPED_SECONDARY_VALUE_CLASS_NAME}>{formatNormalizedValue(sub.totalAmount, normalizationFormatOptions, 'standard')}</p>
                        </div>
                    </div>
                </AccordionTrigger>
                <AccordionContent className='border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'>
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800 py-1">
                        {sub.functionals
                            .slice()
                            .sort((a: GroupedFunctional, b: GroupedFunctional) => b.totalAmount - a.totalAmount)
                            .map((func: GroupedFunctional) => (
                            <li key={func.code} className="group py-2 px-3 sm:px-4">
                                <div className={GROUPED_ROW_CONTENT_CLASS_NAME}>
                                    <div className={GROUPED_LABEL_BLOCK_CLASS_NAME}>
                                        <div className={GROUPED_LABEL_ROW_CLASS_NAME}>
                                            <span className={GROUPED_CODE_CLASS_NAME}>{highlightText(`fn:${func.code}`, searchTerm)}</span>
                                            <span className={GROUPED_ITEM_LABEL_CLASS_NAME}>{highlightText(func.name, searchTerm)}</span>
                                            <ClassificationInfoLink
                                                type={'functional'}
                                                code={func.code}
                                                className={GROUPED_INFO_LINK_CLASS_NAME}
                                                showOnHoverOnly={false}
                                                menuActions={buildGroupedItemMenuActions({
                                                  subjectLabel: func.name,
                                                  selection: {
                                                    ...subchapterSelection,
                                                    functionalCode: func.code,
                                                  },
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
                                            {formatNormalizedValue(func.totalAmount, normalizationFormatOptions, 'compact')}
                                            { baseTotal > 0 && <span className="hidden sm:inline text-xs text-muted-foreground">{`(${(Math.round((func.totalAmount / baseTotal) * 1000) / 10).toFixed(1)}%)`}</span> }
                                        </p>
                                        <p className={GROUPED_SECONDARY_VALUE_CLASS_NAME}>{formatNormalizedValue(func.totalAmount, normalizationFormatOptions, 'standard')}</p>
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

export default GroupedSubchapterAccordion;
