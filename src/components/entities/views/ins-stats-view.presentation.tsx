import { memo, useMemo, useState, type CSSProperties, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import ArrowDownUp from 'lucide-react/dist/esm/icons/arrow-down-up';
import Baby from 'lucide-react/dist/esm/icons/baby';
import Briefcase from 'lucide-react/dist/esm/icons/briefcase';
import Check from 'lucide-react/dist/esm/icons/check';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import Droplets from 'lucide-react/dist/esm/icons/droplets';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Flame from 'lucide-react/dist/esm/icons/flame';
import HeartPulse from 'lucide-react/dist/esm/icons/heart-pulse';
import House from 'lucide-react/dist/esm/icons/house';
import Info from 'lucide-react/dist/esm/icons/info';
import Network from 'lucide-react/dist/esm/icons/network';
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up';
import Ruler from 'lucide-react/dist/esm/icons/ruler';
import Search from 'lucide-react/dist/esm/icons/search';
import TrendingDown from 'lucide-react/dist/esm/icons/trending-down';
import Waves from 'lucide-react/dist/esm/icons/waves';
import {
  Area,
  Brush,
  CartesianGrid,
  ComposedChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ReactMarkdown from 'react-markdown';
import { Link } from '@tanstack/react-router';

import type { InsDataset, InsObservation } from '@/schemas/ins';
import type { InsSeriesGroup, InsUnitOption } from '@/lib/ins/series-selection';
import type { ChartUrlState } from '@/components/charts/page-schema';
import { formatNumber, formatValueWithUnit } from '@/lib/utils';
import {
  formatDatasetPeriodicity,
  formatObservationValue,
  formatPeriodLabel,
  getCardNumericValue,
  getClassificationLabel,
  getLocalizedText,
  isSafeExternalHref,
  normalizeSearchValue,
  toPlainTextLabel,
} from './ins-stats-view.formatters';
import {
  buildDerivedIndicatorRuntimeContext,
  DERIVED_INDICATOR_GROUP_META,
  DERIVED_INDICATOR_GROUP_ORDER,
  getDerivedIndicatorExplanation,
} from './ins-stats-view.derived';
import type {
  DatasetExplorerGroup,
  DerivedIndicator,
  DerivedIndicatorRuntimeContext,
  TemporalSplit,
} from './ins-stats-view.types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useWindowSize } from '@/hooks/useWindowSize';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SafeResponsiveContainer } from '@/components/charts/safe-responsive-container';

const CHART_GRID_COLOR = 'hsl(var(--border) / 0.4)';
const CHART_AXIS_COLOR = 'hsl(var(--muted-foreground) / 0.7)';
const CHART_LINE_COLOR = '#0ea5e9';
const CHART_LINE_HIGHLIGHT_COLOR = '#22d3ee';
const CHART_DOT_STROKE_COLOR = '#0284c7';
const CHART_BRUSH_FILL = 'hsl(199 89% 48% / 0.12)';
const CHART_AREA_GRADIENT_ID = 'ins-history-area-gradient';
const CHART_AREA_TOP_COLOR = '#a5f3fc';
const CHART_AREA_UPPER_COLOR = '#67e8f9';
const CHART_AREA_MID_COLOR = '#22d3ee';
const CHART_AREA_LOWER_COLOR = '#0ea5e9';
const CHART_AREA_BOTTOM_COLOR = '#3b82f6';
const CHART_TOOLTIP_STYLE: CSSProperties = {
  backgroundColor: 'hsl(var(--popover) / 0.96)',
  border: '1px solid hsl(199 89% 48% / 0.22)',
  borderRadius: '0.5rem',
  color: 'hsl(var(--popover-foreground))',
  boxShadow: '0 14px 34px hsl(205 84% 18% / 0.12)',
};

const DISALLOWED_ELEMENTS = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'];

function MarkdownDescriptionBase({ content }: { content: string }) {
  return (
    <ReactMarkdown
      disallowedElements={DISALLOWED_ELEMENTS}
      components={{
        p: ({ children }) => (
          <p className="mb-2 text-sm leading-6 tracking-[0.005em] text-foreground/80 last:mb-0">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="mb-2 list-disc space-y-1 pl-5 text-sm leading-6 tracking-[0.005em] text-foreground/80">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-2 list-decimal space-y-1 pl-5 text-sm leading-6 tracking-[0.005em] text-foreground/80">{children}</ol>
        ),
        li: ({ children }) => <li>{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        a: ({ href, children }) => {
          if (!isSafeExternalHref(href)) {
            return <span>{children}</span>;
          }
          return (
            <a href={href} target="_blank" rel="noreferrer" className="font-medium text-blue-700 dark:text-blue-300 underline underline-offset-2">
              {children}
            </a>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export const MarkdownDescription = memo(MarkdownDescriptionBase);

function ExpandableMarkdownFieldBase({
  label,
  content,
  collapsible = true,
}: {
  label: ReactNode;
  content: string;
  collapsible?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const plainTextLength = useMemo(() => toPlainTextLabel(content).length, [content]);
  const canExpand = collapsible && (plainTextLength > 360 || content.split('\n').length > 5);

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
      <div className={`mt-1 ${canExpand && !expanded ? 'relative max-h-36 overflow-hidden' : ''}`}>
        <MarkdownDescription content={content} />
        {canExpand && !expanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card to-transparent" />
        )}
      </div>
      {canExpand && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((current) => !current)}
          className="mt-1 h-7 px-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {expanded ? t`Show less` : t`Show more`}
        </Button>
      )}
    </div>
  );
}

export const ExpandableMarkdownField = memo(ExpandableMarkdownFieldBase);

function DerivedIndicatorIcon({ id }: { id: DerivedIndicator['id'] }) {
  const iconClassName = 'h-4 w-4 text-foreground/80';
  const iconProps = { className: iconClassName, 'aria-hidden': true as const };

  switch (id) {
    case 'birth-rate':
      return <Baby {...iconProps} />;
    case 'death-rate':
      return <HeartPulse {...iconProps} />;
    case 'natural-increase':
    case 'natural-increase-rate':
      return <TrendingDown {...iconProps} />;
    case 'net-migration':
    case 'net-migration-rate':
      return <ArrowDownUp {...iconProps} />;
    case 'employees-rate':
      return <Briefcase {...iconProps} />;
    case 'dwellings-rate':
      return <House {...iconProps} />;
    case 'living-area':
      return <Ruler {...iconProps} />;
    case 'water':
      return <Droplets {...iconProps} />;
    case 'gas':
      return <Flame {...iconProps} />;
    case 'sewer-rate':
      return <Waves {...iconProps} />;
    case 'gas-network-rate':
      return <Network {...iconProps} />;
    default:
      return <Info {...iconProps} />;
  }
}

type SummaryMetricRow = {
  dataset: InsDataset | null;
  observation: InsObservation | null;
  periodLabel: string;
  selectedPeriodLabel: string;
  source: 'selected' | 'fallback' | 'none';
  hasData: boolean;
};

type SummaryMetricCard = {
  code: string;
  label: string;
  row: SummaryMetricRow | undefined;
};

function SummaryMetricsSectionBase(props: {
  isLoading: boolean;
  summaryCards: SummaryMetricCard[];
  selectedReportPeriodLabel: string;
  selectedDatasetCode: string | null;
  locale: 'ro' | 'en';
  onSelectDataset: (datasetCode: string) => void;
}) {
  const { isLoading, summaryCards, selectedReportPeriodLabel, selectedDatasetCode, locale, onSelectDataset } = props;

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="rounded-[28px] space-y-3 p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-20" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {summaryCards.map((summary) => {
        const observation = summary.row?.observation;
        const formattedValue = observation ? getCardNumericValue(observation) : { value: t`N/A` };
        const period = summary.row?.periodLabel || t`Unknown`;
        const selectedPeriodTag = summary.row?.selectedPeriodLabel || selectedReportPeriodLabel;
        const isPeriodFallback =
          summary.row?.source === 'fallback' || (period !== t`Unknown` && period !== selectedPeriodTag);
        const periodLabelText = isPeriodFallback ? `${period} (${t`last available`})` : period;
        const datasetName =
          getLocalizedText(summary.row?.dataset?.name_ro, summary.row?.dataset?.name_en, locale) || summary.code;
        const isSelected = selectedDatasetCode === summary.code;

        return (
          <button
            key={summary.code}
            type="button"
            onClick={() => onSelectDataset(summary.code)}
            className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Card className={`flex h-full flex-col rounded-[28px] border-border/50 ${isSelected ? 'border-primary ring-1 ring-primary/10' : ''}`}>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="min-h-[2lh] text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {summary.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col pb-4">
                <div className="flex items-center gap-2 text-[2.2rem] font-bold leading-none tracking-tight text-foreground">
                  <span>{formattedValue.value}</span>
                  {formattedValue.statusLabel && (
                    <Badge variant="outline" className="text-[10px]">
                      {formattedValue.statusLabel}
                    </Badge>
                  )}
                </div>
                <div className="mt-2 line-clamp-2 text-[13px] leading-snug text-muted-foreground">{datasetName}</div>
                <div className="mt-auto pt-2 text-[12px] font-medium text-muted-foreground">
                  <Trans>Period:</Trans> {periodLabelText}
                </div>
              </CardContent>
            </Card>
          </button>
        );
      })}
    </div>
  );
}

export const SummaryMetricsSection = memo(SummaryMetricsSectionBase);

function DerivedIndicatorsSectionBase(props: {
  isLoading: boolean;
  error: unknown;
  derivedIndicators: DerivedIndicator[];
  groupedDerivedIndicators: Record<'demography' | 'economy_housing' | 'utilities', DerivedIndicator[]>;
  derivedIndicatorStatus: {
    selectedPeriodLabel: string;
    dataPeriodLabel: string;
    hasFallback: boolean;
  };
  onSelectDerivedIndicator: (datasetCode: string | null) => void;
  onSelectDataset: (datasetCode: string) => void;
}) {
  const {
    isLoading,
    error,
    derivedIndicators,
    groupedDerivedIndicators,
    derivedIndicatorStatus,
    onSelectDerivedIndicator,
    onSelectDataset,
  } = props;

  const isPeriodFallback =
    derivedIndicatorStatus.hasFallback ||
    (derivedIndicatorStatus.dataPeriodLabel !== t`Unknown` &&
      derivedIndicatorStatus.dataPeriodLabel !== derivedIndicatorStatus.selectedPeriodLabel);
  const periodLabelText = isPeriodFallback
    ? `${derivedIndicatorStatus.dataPeriodLabel} (${t`last available`})`
    : derivedIndicatorStatus.dataPeriodLabel;
  const [openDerivedIndicatorInfoId, setOpenDerivedIndicatorInfoId] = useState<DerivedIndicator['id'] | null>(null);
  const { width } = useWindowSize();
  const isMobile = width <= 640;
  const runtimeContextByIndicatorId = useMemo(() => {
    const contextById = new Map<DerivedIndicator['id'], DerivedIndicatorRuntimeContext>();
    for (const row of derivedIndicators) {
      contextById.set(
        row.id,
        buildDerivedIndicatorRuntimeContext({
          selectedPeriodLabel: derivedIndicatorStatus.selectedPeriodLabel,
          dataPeriodLabel: derivedIndicatorStatus.dataPeriodLabel,
          sourceDatasetCode: row.sourceDatasetCode,
          hasFallback: derivedIndicatorStatus.hasFallback,
        })
      );
    }
    return contextById;
  }, [
    derivedIndicatorStatus.dataPeriodLabel,
    derivedIndicatorStatus.hasFallback,
    derivedIndicatorStatus.selectedPeriodLabel,
    derivedIndicators,
  ]);

  return (
    <Card className="rounded-[28px] border-border/50">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-xl font-bold tracking-tight text-foreground">
            <Trans>Derived indicators</Trans>
          </CardTitle>
          <div className="text-[12px] font-medium text-muted-foreground">
            <Trans>Period:</Trans> {periodLabelText}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-4">
        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-full" />
            ))}
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle><Trans>Could not load derived indicators</Trans></AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : t`Unexpected error while loading derived indicators.`}
            </AlertDescription>
          </Alert>
        ) : derivedIndicators.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            <Trans>Not enough latest values to compute derived indicators.</Trans>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-3">
            {DERIVED_INDICATOR_GROUP_ORDER.map((groupId) => {
              const groupRows = groupedDerivedIndicators[groupId];
              if (groupRows.length === 0) return null;

              return (
                <div key={groupId} className="rounded-xl border border-border/50 bg-card px-2 py-3">
                  <div className="mb-2">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {DERIVED_INDICATOR_GROUP_META[groupId].label}
                    </h4>
                    <p className="text-[12px] text-muted-foreground">
                      {DERIVED_INDICATOR_GROUP_META[groupId].description}
                    </p>
                  </div>

                  <div className="space-y-1">
                    {groupRows.map((row) => {
                      const explanation = getDerivedIndicatorExplanation(row.id);
                      const runtimeContext =
                        runtimeContextByIndicatorId.get(row.id) ??
                        buildDerivedIndicatorRuntimeContext({
                          selectedPeriodLabel: derivedIndicatorStatus.selectedPeriodLabel,
                          dataPeriodLabel: derivedIndicatorStatus.dataPeriodLabel,
                          sourceDatasetCode: row.sourceDatasetCode,
                          hasFallback: derivedIndicatorStatus.hasFallback,
                        });
                      const detailsButtonLabel = t`Show details for ${row.label}`;

                      const infoContent = (
                        <>
                          <div className="border-b border-border bg-muted/50 py-4 px-5">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0 flex-1">
                                <h3 className="text-[15px] font-semibold text-foreground leading-tight">{row.label}</h3>
                                <p className="mt-0.5 text-[13px] text-muted-foreground">{row.unitLabel}</p>
                              </div>
                              <div className="shrink-0 text-right">
                                <div className="text-[1.5rem] font-bold leading-none tabular-nums text-foreground">
                                  {row.value}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="p-5 space-y-4">
                            <div className="space-y-2">
                              <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                                <Trans>Why this matters</Trans>
                              </h4>
                              <p className="text-[14px] leading-relaxed text-foreground/80">{explanation.whyItMatters}</p>
                            </div>

                            <div className="space-y-2">
                              <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                                <Trans>How calculated</Trans>
                              </h4>
                              <code className="block px-3 py-2.5 rounded-md bg-muted text-[13px] font-mono text-foreground/80">
                                {explanation.formula}
                              </code>
                            </div>

                            <div className="space-y-2">
                              <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                                <Trans>Inputs used</Trans>
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {explanation.inputs.map((inputLabel) => {
                                  const datasetCodeMatch = inputLabel.match(/\(([A-Z0-9]+)\)$/);
                                  const datasetCode = datasetCodeMatch ? datasetCodeMatch[1] : null;

                                  if (!datasetCode) {
                                    return (
                                      <span
                                        key={inputLabel}
                                        className="inline-flex items-center px-2.5 py-1.5 rounded-md bg-muted border border-border text-[13px] text-foreground/80"
                                      >
                                        {inputLabel}
                                      </span>
                                    );
                                  }

                                  return (
                                    <button
                                      key={inputLabel}
                                      type="button"
                                      onClick={() => {
                                        setOpenDerivedIndicatorInfoId(null);
                                        onSelectDataset(datasetCode);
                                      }}
                                      className="inline-flex items-center px-2.5 py-1.5 rounded-md bg-muted border border-border text-[13px] text-foreground/80 hover:bg-muted/80 hover:border-border transition-colors cursor-pointer"
                                      title={t`View ${datasetCode}`}
                                    >
                                      {inputLabel}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="space-y-3 pt-2 border-t border-border/50">
                              <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                                <Trans>Current period and source</Trans>
                              </h4>
                              <dl className="space-y-2 text-[14px]">
                                <div className="flex items-center justify-between">
                                  <dt className="text-muted-foreground"><Trans>Selected period:</Trans></dt>
                                  <dd className="tabular-nums text-foreground font-medium">{runtimeContext.selectedPeriodLabel}</dd>
                                </div>
                                <div className="flex items-center justify-between">
                                  <dt className="text-muted-foreground"><Trans>Data period shown:</Trans></dt>
                                  <dd className="tabular-nums text-foreground font-medium">{runtimeContext.dataPeriodLabel}</dd>
                                </div>
                                <div className="flex items-center justify-between">
                                  <dt className="text-muted-foreground"><Trans>Source dataset:</Trans></dt>
                                  <dd className="font-semibold text-foreground">
                                    {runtimeContext.sourceDatasetCode ?? t`Unavailable`}
                                  </dd>
                                </div>
                              </dl>
                              {runtimeContext.hasFallback && (
                                <div className="mt-3 rounded-lg border border-amber-200/80 dark:border-amber-700/40 bg-amber-50/60 dark:bg-amber-900/20 px-3 py-2.5">
                                  <p className="text-[13px] leading-relaxed text-amber-800 dark:text-amber-200">
                                    <span className="font-semibold"><Trans>Fallback:</Trans></span>{' '}
                                    <Trans>
                                      Some indicators use the latest available period because the selected period had
                                      missing values.
                                    </Trans>
                                  </p>
                                </div>
                              )}
                            </div>

                            <div className="space-y-2 pt-2 border-t border-border/50">
                              <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                                <Trans>Interpretation notes</Trans>
                              </h4>
                              <p className="text-[14px] leading-relaxed text-foreground/80">{explanation.notes}</p>
                            </div>
                          </div>
                        </>
                      );

                      const isInfoOpen = openDerivedIndicatorInfoId === row.id;

                      return (
                        <div
                          key={row.id}
                          className="group/row flex items-center rounded-lg border border-transparent bg-transparent px-1 py-1 transition-colors hover:border-border hover:bg-muted/50 focus-within:border-border focus-within:bg-muted/50"
                        >
                          <button
                            type="button"
                            data-testid={`derived-indicator-info-${row.id}`}
                            aria-label={detailsButtonLabel}
                            title={detailsButtonLabel}
                            onClick={() => setOpenDerivedIndicatorInfoId(isInfoOpen ? null : row.id)}
                            className="shrink-0 rounded-md border border-border bg-card p-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                          >
                            <span className="block group-hover/row:hidden">
                              <DerivedIndicatorIcon id={row.id} />
                            </span>
                            <span className="hidden group-hover/row:block">
                              <Info className="h-4 w-4 text-foreground/80" aria-hidden="true" />
                            </span>
                          </button>

                          <button
                            type="button"
                            data-testid={`derived-indicator-select-${row.id}`}
                            onClick={() => {
                              setOpenDerivedIndicatorInfoId(null);
                              onSelectDerivedIndicator(row.sourceDatasetCode);
                            }}
                            className="flex min-w-0 flex-1 items-center justify-between gap-1 overflow-hidden rounded-md px-1.5 py-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                          >
                            <span className="truncate text-[13px] font-medium text-muted-foreground">{row.label}</span>
                            <div className="min-w-[96px] shrink-0 pr-1 text-right">
                              <div className="text-[1.25rem] font-bold leading-none tracking-tight tabular-nums text-foreground">
                                {row.value}
                              </div>
                              <div className="mt-0.5 text-[10px] font-medium leading-none text-muted-foreground">
                                {row.unitLabel}
                              </div>
                            </div>
                          </button>

                          {isMobile ? (
                            <Sheet
                              open={isInfoOpen}
                              onOpenChange={(open) => setOpenDerivedIndicatorInfoId(open ? row.id : null)}
                            >
                              <SheetContent
                                side="bottom"
                                className="rounded-t-3xl border-border bg-card px-4 pb-4 pt-0 min-h-[65vh] max-h-[90vh] overflow-y-auto"
                              >
                                <SheetTitle className="sr-only">{row.label}</SheetTitle>
                                <SheetDescription className="sr-only">{detailsButtonLabel}</SheetDescription>
                                {infoContent}
                              </SheetContent>
                            </Sheet>
                          ) : (
                            <Dialog
                              open={isInfoOpen}
                              onOpenChange={(open) => setOpenDerivedIndicatorInfoId(open ? row.id : null)}
                            >
                              <DialogContent className="max-w-[560px] border-border bg-card p-0 overflow-hidden">
                                <DialogTitle className="sr-only">{row.label}</DialogTitle>
                                <DialogDescription className="sr-only">{detailsButtonLabel}</DialogDescription>
                                <div className="max-h-[80vh] overflow-y-auto">
                                  {infoContent}
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const DerivedIndicatorsSection = memo(DerivedIndicatorsSectionBase);

function DatasetExplorerSectionBase(props: {
  isExplorerExpanded: boolean;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onToggleExpanded: () => void;
  isLoading: boolean;
  groupedDatasets: DatasetExplorerGroup[];
  openRootGroups: string[];
  onOpenRootGroupsChange: (value: string[]) => void;
  selectedDatasetCode: string | null;
  locale: 'ro' | 'en';
  onSelectDataset: (datasetCode: string) => void;
  rootGroupRefs: Record<string, HTMLDivElement | null>;
  sectionRefs: Record<string, HTMLDivElement | null>;
  datasetItemRefs: Record<string, HTMLButtonElement | null>;
}) {
  const {
    isExplorerExpanded,
    searchTerm,
    onSearchTermChange,
    onToggleExpanded,
    isLoading,
    groupedDatasets,
    openRootGroups,
    onOpenRootGroupsChange,
    selectedDatasetCode,
    locale,
    onSelectDataset,
    rootGroupRefs,
    sectionRefs,
    datasetItemRefs,
  } = props;

  const renderDatasetListItem = (dataset: InsDataset) => {
    const periodicityLabel = formatDatasetPeriodicity(dataset.periodicity);
    const isSelected = selectedDatasetCode === dataset.code;
    const datasetLabel = getLocalizedText(dataset.name_ro, dataset.name_en, locale) || dataset.code;

    return (
      <button
        type="button"
        key={dataset.code}
        data-testid={`dataset-item-${dataset.code}`}
        ref={(element) => {
          datasetItemRefs[dataset.code] = element;
        }}
        className={`group w-full rounded-md text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${isSelected ? 'bg-muted' : 'bg-card hover:bg-muted/50'
          }`}
        onClick={() => onSelectDataset(dataset.code)}
      >
        <div className="flex items-start justify-between gap-2 px-3 py-3">
          <div className="min-w-0">
            <div className="line-clamp-1 text-[14px] font-semibold leading-6 tracking-[0.002em] text-foreground">
              {datasetLabel}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${isSelected ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
                  }`}
              >
                {dataset.code}
              </span>
              {periodicityLabel && (
                <span className="text-[11px] font-medium text-muted-foreground">{periodicityLabel}</span>
              )}
            </div>
          </div>
        </div>
      </button>
    );
  };

  return (
    <Card className={`flex flex-col px-2 rounded-[28px] border-border/50 ${isExplorerExpanded ? 'h-[760px]' : ''}`}>
      <CardHeader className={`pt-4 ${isExplorerExpanded ? 'space-y-3 pb-3' : 'pb-4'}`}>
        <button
          type="button"
          onClick={onToggleExpanded}
          className="flex w-full items-center justify-between gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
        >
          <CardTitle className="text-[1.05rem] font-semibold tracking-[-0.01em] text-foreground">
            <Trans>Dataset explorer</Trans>
          </CardTitle>
          {isExplorerExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          )}
        </button>

        {isExplorerExpanded && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              type="search"
              name="ins-dataset-search"
              aria-label={t`Search dataset code or name`}
              autoComplete="off"
              placeholder={t`Search dataset code or name`}
              className="h-10 w-full rounded-lg border-border bg-card pl-9 text-sm shadow-sm"
            />
          </div>
        )}
      </CardHeader>
      {isExplorerExpanded && <CardContent className="flex-1 min-h-0 px-4 pb-4 pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : groupedDatasets.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            <Trans>No datasets match your current filters.</Trans>
          </div>
        ) : (
          <ScrollArea className="h-full pr-2">
            <Accordion
              type="multiple"
              value={openRootGroups}
              onValueChange={onOpenRootGroupsChange}
              className="w-full"
            >
              {groupedDatasets.map((group) => (
                <AccordionItem
                  key={group.code}
                  value={group.code}
                  className="rounded-none border-0 bg-transparent px-0"
                  ref={(element) => {
                    rootGroupRefs[group.code] = element;
                  }}
                >
                  <AccordionTrigger
                    className="items-start text-[13px] font-semibold tracking-[-0.005em] text-foreground hover:no-underline [&>svg]:-mt-0.5 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:self-start border-b border-border px-2 py-3"
                  >
                    <div className="flex w-full items-start justify-between gap-3 pr-2">
                      <div className="min-w-0 text-left">
                        <div className="line-clamp-1 font-semibold tracking-[-0.005em] text-foreground">{group.label}</div>
                      </div>
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold tracking-[0.01em] text-muted-foreground">
                        {group.totalCount}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent
                    className="pb-3 pt-1 space-y-4 px-2 pt-2"
                  >
                    {group.sections.map((section) => (
                      <div
                        key={`${group.code}-${section.code}`}
                        className="space-y-2 px-1"
                        ref={(element) => {
                          sectionRefs[section.code] = element;
                        }}
                      >
                        <div className="flex items-center justify-between gap-3 px-0.5">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                            {section.label}
                          </span>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            {section.datasets.length}
                          </span>
                        </div>
                        <div className="divide-y divide-border/50 overflow-hidden rounded-md bg-card">
                          {section.datasets.map((dataset) =>
                            renderDatasetListItem(dataset)
                          )}
                        </div>
                      </div>
                    ))}

                    {group.unsectionedDatasets.length > 0 && (
                      <div className="space-y-2 px-1">
                        <div className="flex items-center justify-between gap-3 px-0.5">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                            <Trans>Other datasets</Trans>
                          </span>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            {group.unsectionedDatasets.length}
                          </span>
                        </div>
                        <div className="divide-y divide-border/50 overflow-hidden rounded-md bg-card">
                          {group.unsectionedDatasets.map((dataset) =>
                            renderDatasetListItem(dataset)
                          )}
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollArea>
        )}
      </CardContent>}
    </Card>
  );
}

export const DatasetExplorerSection = memo(DatasetExplorerSectionBase);

type DatasetDetailsCardModel = {
  code: string;
  title: string;
  hierarchy: Array<{
    code: string;
    label: string;
    kind: 'home' | 'context' | 'dataset';
    rootCode: string;
  }>;
  rootContextCode: string;
  rootContextBreadcrumbLabel: string | null;
  contextLabel: string | null;
  periodicityLabel: string;
  yearRange: string | null;
  dimensionCount: string | null;
  definition: string | null;
  methodology: string | null;
  source: string | null;
  notes: string | null;
};

type ChartShortcutLink = {
  to: '/charts/$chartId';
  params: {
    chartId: string;
  };
  search: ChartUrlState;
};

type HistoryChartPoint = {
  period: string;
  numericValue: number | null;
  rawValue: string | null | undefined;
  statusLabel: string | null;
};

function DatasetDetailSectionBase(props: {
  selectedDatasetDetails: DatasetDetailsCardModel | null;
  selectedDatasetBreadcrumbItems: Array<{
    code: string;
    label: string;
    kind: 'home' | 'context' | 'dataset';
    rootCode: string;
  }>;
  selectedDataset: InsDataset | null;
  selectedDatasetCode: string | null;
  locale: 'ro' | 'en';
  hasDatasetMetadataPanel: boolean;
  isDatasetMetaExpanded: boolean;
  setIsDatasetMetaExpanded: Dispatch<SetStateAction<boolean>>;
  handleHierarchyNavigate: (item: { code: string; kind: 'home' | 'context' | 'dataset'; rootCode: string }) => void;
  datasetHistoryQuery: {
    isLoading: boolean;
    error: unknown;
    data: {
      partial?: boolean;
    } | undefined;
  };
  historySeries: InsObservation[];
  historyRows: InsObservation[];
  showAllRows: boolean;
  setShowAllRows: Dispatch<SetStateAction<boolean>>;
  isTemporalSplitIncompatible: boolean;
  availableTemporalOptions: Array<{ value: Exclude<TemporalSplit, 'all'>; label: string }>;
  temporalSplit: TemporalSplit;
  setTemporalSplit: Dispatch<SetStateAction<TemporalSplit>>;
  hasTemporalSelector: boolean;
  hasSeriesSelectors: boolean;
  handleResetSeriesSelection: () => void;
  selectableSeriesGroups: InsSeriesGroup[];
  effectiveSeriesSelection: Record<string, string[]>;
  seriesSelectorSearchByTypeCode: Record<string, string>;
  setSeriesSelectorSearchByTypeCode: Dispatch<SetStateAction<Record<string, string>>>;
  handleSeriesGroupSelectionChange: (typeCode: string, selectedCode: string, multiSelect: boolean) => void;
  historyUnitOptions: InsUnitOption[];
  effectiveUnitSelection: string | null;
  chartUnitLabel: string | null;
  handleUnitSelectionChange: (unitKey: string) => void;
  activeSeriesCriteriaParts: string[];
  historyChartData: HistoryChartPoint[];
  selectedDatasetSourceUrl: string | null;
  insTermsUrl: string;
  hasMultiValueSeriesSelection: boolean;
  chartShortcutLink: ChartShortcutLink | null;
}) {
  const {
    selectedDatasetDetails,
    selectedDatasetBreadcrumbItems,
    selectedDataset,
    selectedDatasetCode,
    locale,
    hasDatasetMetadataPanel,
    isDatasetMetaExpanded,
    setIsDatasetMetaExpanded,
    handleHierarchyNavigate,
    datasetHistoryQuery,
    historySeries,
    historyRows,
    showAllRows,
    setShowAllRows,
    isTemporalSplitIncompatible,
    availableTemporalOptions,
    temporalSplit,
    setTemporalSplit,
    hasTemporalSelector,
    hasSeriesSelectors,
    handleResetSeriesSelection,
    selectableSeriesGroups,
    effectiveSeriesSelection,
    seriesSelectorSearchByTypeCode,
    setSeriesSelectorSearchByTypeCode,
    handleSeriesGroupSelectionChange,
    historyUnitOptions,
    effectiveUnitSelection,
    chartUnitLabel,
    handleUnitSelectionChange,
    activeSeriesCriteriaParts,
    historyChartData,
    selectedDatasetSourceUrl,
    insTermsUrl,
    hasMultiValueSeriesSelection,
    chartShortcutLink,
  } = props;

  const renderHistoryTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: readonly unknown[];
    label?: string | number;
  }) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const pointPayload = payload
      .map((item) => (typeof item === 'object' && item !== null ? (item as { payload?: HistoryChartPoint }).payload : null))
      .find((item) => Boolean(item));
    if (!pointPayload) {
      return null;
    }

    const periodLabel =
      typeof label === 'string' && label.trim() !== ''
        ? label
        : pointPayload.period || '—';
    const numericValue = pointPayload.numericValue;
    const hasNumericValue = typeof numericValue === 'number';
    const showFullValueLine = hasNumericValue && numericValue > 1000;

    let compactValueWithUnit = '—';
    let fullValueWithUnit = '—';

    if (hasNumericValue) {
      compactValueWithUnit = chartUnitLabel
        ? formatValueWithUnit(numericValue, chartUnitLabel, 'compact')
        : formatNumber(numericValue, 'compact');
      fullValueWithUnit = chartUnitLabel
        ? formatValueWithUnit(numericValue, chartUnitLabel, 'standard')
        : formatNumber(numericValue, 'standard');
    }

    return (
      <div style={CHART_TOOLTIP_STYLE} className="min-w-[220px] px-3 py-2.5">
        <div className="mb-2 text-[13px] font-semibold text-foreground">{periodLabel}</div>
        <div className="space-y-1.5 text-[12px] leading-5">
          <div className="flex items-start justify-between gap-4">
            <span className="text-muted-foreground">{t`Value`}</span>
            <div className="text-right">
              <div className="font-semibold tabular-nums text-foreground">{compactValueWithUnit}</div>
              {showFullValueLine && (
                <div className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">{fullValueWithUnit}</div>
              )}
            </div>
          </div>
          {pointPayload.statusLabel && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{t`Status`}</span>
              <span className="font-medium text-foreground">{pointPayload.statusLabel}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="rounded-[28px] border-border/50">
      <CardHeader className="space-y-3 px-8 pb-4">
        {selectedDatasetDetails && selectedDatasetBreadcrumbItems.length > 0 && (
          <nav className="text-[12px] font-medium leading-5 tracking-[0.01em] text-muted-foreground">
            <div className="flex flex-wrap items-center gap-y-1">
              {selectedDatasetBreadcrumbItems.map((item, index) => {
                const isCurrent = index === selectedDatasetBreadcrumbItems.length - 1;
                const displayLabel =
                  item.kind === 'context' && item.code === selectedDatasetDetails?.rootContextCode
                    ? selectedDatasetDetails?.rootContextBreadcrumbLabel || item.label
                    : item.label;

                return (
                  <div key={`${item.code}-${index}`} className="flex items-center">
                    {index > 0 && <span className="mx-1.5 text-muted-foreground/50">/</span>}
                    {isCurrent ? (
                      <span
                        title={displayLabel}
                        className="max-w-[320px] truncate font-semibold tracking-[0.005em] text-foreground"
                      >
                        {displayLabel}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleHierarchyNavigate(item)}
                        title={displayLabel}
                        className="max-w-[320px] truncate rounded-sm font-medium tracking-[0.005em] text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                      >
                        {displayLabel}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>
        )}

        {selectedDataset ? (
          <div className="space-y-1">
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {selectedDatasetDetails?.title ||
                getLocalizedText(selectedDataset.name_ro, selectedDataset.name_en, locale) ||
                selectedDataset.code}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {chartShortcutLink ? (
                <Link
                  to={chartShortcutLink.to}
                  params={chartShortcutLink.params}
                  search={chartShortcutLink.search}
                  preload="intent"
                  data-testid="ins-open-chart-shortcut"
                  title={t`Open in chart editor`}
                  aria-label={`${selectedDataset.code} - ${t`Open in chart editor`}`}
                  className="inline-flex items-center gap-1 rounded-sm px-1 py-0.5 text-xl font-semibold tracking-[-0.01em] text-foreground/80 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                >
                  <span>{selectedDataset.code}</span>
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              ) : (
                <span className="text-xl font-semibold tracking-[-0.01em] text-foreground/80">{selectedDataset.code}</span>
              )}
              {hasDatasetMetadataPanel && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDatasetMetaExpanded((current) => !current)}
                  className="h-7 px-2 text-[12px] font-medium tracking-[0.01em] text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {isDatasetMetaExpanded ? t`Show less` : t`Show more`}
                </Button>
              )}
            </div>
          </div>
        ) : selectedDatasetCode !== null ? (
          <div className="space-y-1">
            <div className="text-3xl font-bold tracking-tight text-foreground">{selectedDatasetCode}</div>
            <div className="text-sm text-muted-foreground">
              <Trans>Dataset metadata is loading or unavailable, but historical data can still be viewed below.</Trans>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            <Trans>Select a metric card or dataset from the list to load full history.</Trans>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4 px-8">
        {selectedDatasetDetails && isDatasetMetaExpanded && (
          <div className="rounded-xl border border-border bg-muted/50 p-4">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-border bg-card px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  <Trans>Code</Trans>
                </div>
                <div className="mt-0.5 text-[1.05rem] font-semibold tracking-[-0.005em] text-foreground">
                  {selectedDatasetDetails.code}
                </div>
              </div>
              {selectedDatasetDetails.periodicityLabel && (
                <div className="rounded-lg border border-border bg-card px-3 py-2">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    <Trans>Periodicity</Trans>
                  </div>
                  <div className="mt-0.5 text-[1.05rem] font-semibold tracking-[-0.005em] text-foreground">
                    {selectedDatasetDetails.periodicityLabel}
                  </div>
                </div>
              )}
              {selectedDatasetDetails.yearRange && (
                <div className="rounded-lg border border-border bg-card px-3 py-2">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    <Trans>Coverage</Trans>
                  </div>
                  <div className="mt-0.5 text-[1.05rem] font-semibold tracking-[-0.005em] text-foreground">
                    {selectedDatasetDetails.yearRange}
                  </div>
                </div>
              )}
              {selectedDatasetDetails.dimensionCount && (
                <div className="rounded-lg border border-border bg-card px-3 py-2">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    <Trans>Dimensions</Trans>
                  </div>
                  <div className="mt-0.5 text-[1.05rem] font-semibold tracking-[-0.005em] text-foreground">
                    {selectedDatasetDetails.dimensionCount}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 space-y-3">
              {selectedDatasetDetails.contextLabel && (
                <ExpandableMarkdownField label={<Trans>Context</Trans>} content={selectedDatasetDetails.contextLabel} />
              )}

              {selectedDatasetDetails.definition && (
                <ExpandableMarkdownField
                  label={<Trans>Description</Trans>}
                  content={selectedDatasetDetails.definition}
                  collapsible={false}
                />
              )}

              {selectedDatasetDetails.methodology && (
                <ExpandableMarkdownField label={<Trans>Methodology</Trans>} content={selectedDatasetDetails.methodology} />
              )}

              {selectedDatasetDetails.source && (
                <ExpandableMarkdownField label={<Trans>Source</Trans>} content={selectedDatasetDetails.source} />
              )}

              {selectedDatasetDetails.notes && (
                <ExpandableMarkdownField label={<Trans>Notes</Trans>} content={selectedDatasetDetails.notes} />
              )}
            </div>
          </div>
        )}

        {selectedDatasetCode === null ? (
          <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            <Trans>No dataset selected yet.</Trans>
          </div>
        ) : datasetHistoryQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : datasetHistoryQuery.error instanceof Error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle><Trans>Could not load historical data</Trans></AlertTitle>
            <AlertDescription>{datasetHistoryQuery.error.message}</AlertDescription>
          </Alert>
        ) : historySeries.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            <p><Trans>No observations available for the selected dataset and entity.</Trans></p>
            {isTemporalSplitIncompatible && availableTemporalOptions.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs">
                  <Trans>This dataset is not available for the selected temporal split.</Trans>
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => setTemporalSplit(availableTemporalOptions[0].value)}
                >
                  <Trans>Reset to available period</Trans>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            {hasTemporalSelector && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                  <Trans>Period</Trans>
                </span>
                {availableTemporalOptions.map((option) => (
                  <Button
                    key={`detail-${option.value}`}
                    variant={temporalSplit === option.value ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setTemporalSplit(option.value)}
                    className={`h-7 rounded-full px-3 text-[11px] font-medium tracking-[0.01em] ${temporalSplit === option.value
                        ? 'bg-foreground text-background hover:bg-foreground/90'
                        : 'border border-border bg-card text-foreground/80 hover:bg-muted/50'
                      }`}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            )}

            {hasSeriesSelectors && (
              <div className="space-y-3 rounded-md border border-border bg-muted/50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    <Trans>Series selector</Trans>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResetSeriesSelection}
                    className="h-7 px-2 text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Trans>Reset to default</Trans>
                  </Button>
                </div>

                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {selectableSeriesGroups.map((group) => {
                    const selectedCodes = effectiveSeriesSelection[group.typeCode] ?? [];
                    const selectedCodeSet = new Set(selectedCodes);
                    const selectedOptions = group.options.filter((option) => selectedCodeSet.has(option.code));
                    const selectorSearchTerm = seriesSelectorSearchByTypeCode[group.typeCode] ?? '';
                    const shouldShowSelectorSearch = group.options.length > 10;
                    const normalizedSelectorSearchTerm = normalizeSearchValue(selectorSearchTerm);
                    const filteredOptions =
                      !shouldShowSelectorSearch || normalizedSelectorSearchTerm === ''
                        ? group.options
                        : group.options.filter((option) =>
                          normalizeSearchValue(`${option.label} ${option.rawCode}`).includes(
                            normalizedSelectorSearchTerm
                          )
                        );
                    const triggerLabel =
                      selectedOptions.length === 0
                        ? t`Select series`
                        : selectedOptions.length === 1
                          ? selectedOptions[0].label
                          : `${selectedOptions.length} ${t`selected`}`;
                    return (
                      <div key={group.typeCode} className="space-y-1">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                          {group.typeLabel}
                        </label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 w-full justify-between border-border bg-card px-2 text-[13px] font-medium text-foreground/80 hover:bg-muted"
                            >
                              <span className="truncate text-left">{triggerLabel}</span>
                              <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-[min(420px,92vw)] border-border p-2">
                            <div className="mb-1.5 text-[11px] text-muted-foreground">
                              <Trans>Hold Ctrl/Cmd or Shift while clicking to multi-select.</Trans>
                            </div>

                            {shouldShowSelectorSearch && (
                              <div className="relative mb-2">
                                <Search className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                                <Input
                                  value={selectorSearchTerm}
                                  onChange={(event) =>
                                    setSeriesSelectorSearchByTypeCode((current) => ({
                                      ...current,
                                      [group.typeCode]: event.target.value,
                                    }))
                                  }
                                  type="search"
                                  name={`series-search-${group.typeCode}`}
                                  aria-label={t`Search options in ${group.typeLabel}`}
                                  autoComplete="off"
                                  placeholder={t`Search series options`}
                                  className="h-8 rounded-md border-border bg-card pl-7 text-[12px]"
                                />
                              </div>
                            )}

                            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                              {shouldShowSelectorSearch ? (
                                <>
                                  {selectedOptions.length > 0 && (
                                    <div className="space-y-1">
                                      <div className="px-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                                        <Trans>Selected</Trans>
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {selectedOptions.map((option) => (
                                          <button
                                            type="button"
                                            key={`${group.typeCode}-${option.code}-selected`}
                                            onClick={() =>
                                              handleSeriesGroupSelectionChange(group.typeCode, option.code, true)
                                            }
                                            className="inline-flex items-center gap-1 rounded-full bg-foreground px-2 py-1 text-[11px] font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                                          >
                                            <Check className="h-3 w-3" aria-hidden="true" />
                                            <span className="max-w-[180px] truncate">{option.label}</span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <div className="space-y-1">
                                    <div className="px-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                                      <Trans>Options</Trans>
                                    </div>
                                    {filteredOptions.map((option) => {
                                      const isSelected = selectedCodeSet.has(option.code);
                                      return (
                                        <button
                                          type="button"
                                          key={`${group.typeCode}-${option.code}`}
                                          onClick={(event) =>
                                            handleSeriesGroupSelectionChange(
                                              group.typeCode,
                                              option.code,
                                              event.shiftKey || event.ctrlKey || event.metaKey
                                            )
                                          }
                                          className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${isSelected
                                              ? 'bg-foreground text-background'
                                              : 'text-foreground/80 hover:bg-muted'
                                            }`}
                                        >
                                          <span className="text-[12px] font-medium leading-5">{option.label}</span>
                                          {isSelected && <Check className="ml-2 h-4 w-4 shrink-0" aria-hidden="true" />}
                                        </button>
                                      );
                                    })}
                                    {filteredOptions.length === 0 && (
                                      <div className="rounded-md border border-dashed border-border px-2 py-2 text-[12px] text-muted-foreground">
                                        <Trans>No options match your search.</Trans>
                                      </div>
                                    )}
                                  </div>
                                </>
                              ) : (
                                group.options.map((option) => {
                                  const isSelected = selectedCodeSet.has(option.code);

                                  return (
                                    <button
                                      type="button"
                                      key={`${group.typeCode}-${option.code}`}
                                      onClick={(event) =>
                                        handleSeriesGroupSelectionChange(
                                          group.typeCode,
                                          option.code,
                                          event.shiftKey || event.ctrlKey || event.metaKey
                                        )
                                      }
                                      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${isSelected
                                          ? 'bg-foreground text-background'
                                          : 'text-foreground/80 hover:bg-muted'
                                        }`}
                                    >
                                      <span className="text-[12px] font-medium leading-5">{option.label}</span>
                                      {isSelected && <Check className="ml-2 h-4 w-4 shrink-0" aria-hidden="true" />}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    );
                  })}

                  {historyUnitOptions.length > 1 && (
                    <div className="space-y-1">
                      <label
                        htmlFor="series-selector-unit"
                        className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground"
                      >
                        <Trans>Unit</Trans>
                      </label>
                      <select
                        id="series-selector-unit"
                        value={effectiveUnitSelection ?? ''}
                        onChange={(event) => handleUnitSelectionChange(event.target.value)}
                        className="h-9 w-full rounded-md border border-border bg-card px-2 text-[13px] font-medium text-foreground/80 shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        {historyUnitOptions.map((option) => (
                          <option key={option.key} value={option.key}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSeriesCriteriaParts.length > 0 && (
              <div className="text-[12px] leading-5 text-muted-foreground">
                <span className="font-semibold text-foreground/80"><Trans>Active series criteria:</Trans></span>{' '}
                {activeSeriesCriteriaParts.join(' • ')}
              </div>
            )}

            <div className="h-72 w-full">
              <SafeResponsiveContainer width="100%" height="100%">
                <ComposedChart data={historyChartData} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id={CHART_AREA_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_AREA_TOP_COLOR} stopOpacity={0.55} />
                      <stop offset="15%" stopColor={CHART_AREA_UPPER_COLOR} stopOpacity={0.42} />
                      <stop offset="45%" stopColor={CHART_AREA_MID_COLOR} stopOpacity={0.22} />
                      <stop offset="75%" stopColor={CHART_AREA_LOWER_COLOR} stopOpacity={0.1} />
                      <stop offset="100%" stopColor={CHART_AREA_BOTTOM_COLOR} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="4 5" vertical={false} />
                  <XAxis
                    dataKey="period"
                    minTickGap={24}
                    stroke={CHART_AXIS_COLOR}
                    tick={{ fill: CHART_AXIS_COLOR, fontSize: 12 }}
                    axisLine={{ stroke: CHART_GRID_COLOR }}
                    tickLine={{ stroke: CHART_GRID_COLOR }}
                  />
                  <YAxis
                    stroke={CHART_AXIS_COLOR}
                    tick={{ fill: CHART_AXIS_COLOR, fontSize: 12 }}
                    axisLine={{ stroke: CHART_GRID_COLOR }}
                    tickLine={{ stroke: CHART_GRID_COLOR }}
                  />
                  <Tooltip
                    cursor={{ stroke: CHART_LINE_HIGHLIGHT_COLOR, strokeWidth: 1, strokeDasharray: '3 3' }}
                    content={renderHistoryTooltip}
                  />
                  <Area
                    type="monotone"
                    dataKey="numericValue"
                    stroke="none"
                    fill={`url(#${CHART_AREA_GRADIENT_ID})`}
                  />
                  <Line
                    type="monotone"
                    dataKey="numericValue"
                    stroke={CHART_LINE_COLOR}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: CHART_LINE_HIGHLIGHT_COLOR,
                      stroke: CHART_DOT_STROKE_COLOR,
                      strokeWidth: 2,
                    }}
                  />
                  <Brush dataKey="period" height={20} stroke={CHART_AXIS_COLOR} fill={CHART_BRUSH_FILL} travellerWidth={9} />
                </ComposedChart>
              </SafeResponsiveContainer>
            </div>
            {selectedDatasetSourceUrl && (
              <div className="rounded-md border border-border bg-muted/50 px-3 py-2.5 text-[12px] leading-5 text-muted-foreground">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <a
                    href={selectedDatasetSourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-semibold text-foreground underline-offset-2 hover:text-foreground hover:underline"
                  >
                    <Trans>Open source matrix in INS Tempo</Trans>
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                  <span className="text-muted-foreground/50">•</span>
                  <span>
                    <Trans>
                      Data is sourced from INS Tempo. Reuse and redistribution are subject to INS terms and license.
                    </Trans>{' '}
                    <a
                      href={insTermsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground"
                    >
                      <Trans>INS terms</Trans>
                    </a>
                  </span>
                </div>
              </div>
            )}

            {datasetHistoryQuery.data?.partial && (
              <Alert>
                <Info className="h-4 w-4" aria-hidden="true" />
                <AlertTitle><Trans>Partial history</Trans></AlertTitle>
                <AlertDescription>
                  <Trans>
                    Full historical observations exceeded the page cap for this view. Showing the retrieved subset.
                  </Trans>
                </AlertDescription>
              </Alert>
            )}

            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32 text-[12px] font-semibold tracking-[0.02em] text-muted-foreground">
                    <Trans>Period</Trans>
                  </TableHead>
                  <TableHead className="text-[12px] font-semibold tracking-[0.02em] text-muted-foreground">
                    <Trans>Value</Trans>
                  </TableHead>
                  <TableHead className="text-right text-[12px] font-semibold tracking-[0.02em] text-muted-foreground">
                    <Trans>Details</Trans>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyRows.map((row) => {
                  const { value, statusLabel } = formatObservationValue(row);
                  return (
                    <TableRow key={`${row.dataset_code}-${row.time_period.iso_period}-${row.value}`}>
                      <TableCell className="font-medium tracking-[0.005em]">{formatPeriodLabel(row.time_period)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={statusLabel ? 'text-muted-foreground' : 'font-medium tracking-[0.005em]'}>
                            {value}
                          </span>
                          {statusLabel && (
                            <Badge variant="outline" className="text-[10px]">
                              {statusLabel}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {hasMultiValueSeriesSelection ? t`Multiple selected values` : getClassificationLabel(row)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {historySeries.length > 12 && (
              <Button variant="outline" size="sm" onClick={() => setShowAllRows((previous) => !previous)}>
                {showAllRows ? t`Show less` : t`Show all periods`}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export const DatasetDetailSection = memo(DatasetDetailSectionBase);
