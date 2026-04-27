import { useMemo, useState, useCallback } from "react";
import { t } from "@lingui/core/macro";
import {
  AlertTriangle,
  Info,
  X,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type {
  ValidationResult,
  DataValidationError,
} from "@/lib/chart-data-validation";

interface ChartDataErrorProps {
  validationResult: ValidationResult;
  onDismiss?: () => void;
  showDetails?: boolean;
}

type IssueGroup = Record<DataValidationError["type"], DataValidationError[]>;

const COLORS = {
  ERROR: {
    background: 'bg-red-50',
    border: 'border-l-red-500',
    text: 'text-red-500',
    sectionBg: 'bg-red-50/60',
    sectionBorder: 'border-red-100',
    badgeBorder: 'border-red-300',
    badgeText: 'text-red-700',
    headerText: 'text-red-700',
    itemText: 'text-red-700',
    codeBg: 'bg-red-100'
  },
  WARNING: {
    background: 'bg-yellow-50',
    border: 'border-l-yellow-500',
    text: 'text-yellow-500',
    sectionBg: 'bg-yellow-50',
    sectionBorder: 'border-yellow-100',
    badgeBorder: 'border-yellow-300',
    badgeText: 'text-yellow-800',
    headerText: 'text-yellow-700',
    itemText: 'text-yellow-800',
    codeBg: 'bg-yellow-100'
  }
} as const;

const COPY_FEEDBACK_DURATION = 2000;

const TYPE_LABEL: Record<DataValidationError["type"], string> = {
  invalid_x_value: "Invalid X value",
  invalid_y_value: "Invalid Y value",
  missing_data: "Missing data",
  empty_series: "Empty series",
  invalid_aggregated_value: "Invalid aggregated value",
  auto_adjusted_value: "Auto-adjusted value",
};


const groupByType = (issues: DataValidationError[]): IssueGroup => {
  return issues.reduce((acc, issue) => {
    (acc[issue.type] ||= []).push(issue);
    return acc;
  }, {} as IssueGroup);
};

const formatIssueValue = (value: unknown): string => {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const buildClipboardReport = (vr: ValidationResult): string => {
  const total = vr.errors.length + vr.warnings.length;
  const lines: string[] = [];
  lines.push(`Chart data issues: ${total}`);
  
  const formatIssue = (issue: DataValidationError, index: number) => {
    const idx = issue.pointIndex !== undefined ? `@${issue.pointIndex}` : '';
    const val = issue.value !== undefined ? ` value=${formatIssueValue(issue.value)}` : '';
    return `  ${index + 1}. [${issue.type}] ${issue.seriesId}${idx}: ${issue.message}${val}`;
  };
  
  if (vr.errors.length) {
    lines.push(`Errors (${vr.errors.length}):`);
    vr.errors.forEach((e, i) => lines.push(formatIssue(e, i)));
  }
  
  if (vr.warnings.length) {
    lines.push(`Warnings (${vr.warnings.length}):`);
    vr.warnings.forEach((w, i) => lines.push(formatIssue(w, i)));
  }
  
  return lines.join('\n');
};

interface IssuesSectionProps {
  title: string;
  issues: DataValidationError[];
  colorScheme: typeof COLORS.ERROR | typeof COLORS.WARNING;
  showAutoFixNote?: boolean;
}

const IssuesSection = ({ title, issues, colorScheme, showAutoFixNote }: IssuesSectionProps) => {
  const issueGroups = useMemo(() => groupByType(issues), [issues]);
  
  return (
    <section>
      <h4 className={`text-sm font-medium mb-2 ${colorScheme.headerText}`} id={`${title.toLowerCase()}-section`}>
        {title}
      </h4>

      <div className="flex flex-wrap gap-2 mb-3" role="group" aria-labelledby={`${title.toLowerCase()}-section`}>
        {Object.entries(issueGroups).map(([type, list]) => (
          <Badge
            key={type}
            variant="outline"
            className={`${colorScheme.badgeBorder} ${colorScheme.badgeText}`}
          >
            {TYPE_LABEL[type as DataValidationError["type"]]} ({list.length})
          </Badge>
        ))}
      </div>

      <div className="space-y-3">
        {Object.entries(issueGroups).map(([type, list]) => (
          <div
            key={type}
            className={`rounded-md ${colorScheme.sectionBg} border ${colorScheme.sectionBorder} p-3`}
          >
            <div className={`text-xs font-semibold mb-2 ${colorScheme.badgeText}`}>
              {TYPE_LABEL[type as DataValidationError["type"]]}
            </div>
            <ul className="text-sm space-y-1.5">
              {list.map((issue, idx) => (
                <li key={`${type}-${idx}`} className={`${colorScheme.itemText} break-words`}>
                  <span className="font-medium">{issue.seriesId}</span>
                  {issue.pointIndex !== undefined && (
                    <span className="opacity-80"> @ {issue.pointIndex}</span>
                  )}
                  : {issue.message}
                  {issue.value !== undefined && (
                    <code className={`ml-1 px-1 py-0.5 ${colorScheme.codeBg} rounded text-[11px] break-all`}>
                      {formatIssueValue(issue.value)}
                    </code>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {showAutoFixNote && (
        <div className={`text-sm mt-3 ${colorScheme.itemText}/90`}>
          {t`These issues were auto-resolved (invalid points removed or values set to 0) so the chart could render.`}
        </div>
      )}
    </section>
  );
};

export function ChartDataError({
  validationResult,
  onDismiss,
  showDetails = false,
}: ChartDataErrorProps) {
  const [isExpanded, setIsExpanded] = useState(showDetails);
  const [copyFeedback, setCopyFeedback] = useState<'idle' | 'copied' | 'error'>('idle');

  const { hasErrors, hasWarnings, total, headerTone, iconTone } = useMemo(() => {
    const hasErrors = validationResult.errors.length > 0;
    const hasWarnings = validationResult.warnings.length > 0;
    const total = validationResult.errors.length + validationResult.warnings.length;
    const headerTone = hasErrors ? `border-l-4 ${COLORS.ERROR.border} ${COLORS.ERROR.background}` : `border-l-4 ${COLORS.WARNING.border} ${COLORS.WARNING.background}`;
    const iconTone = hasErrors ? COLORS.ERROR.text : COLORS.WARNING.text;
    
    return { hasErrors, hasWarnings, total, headerTone, iconTone };
  }, [validationResult.errors.length, validationResult.warnings.length]);

  const copyReport = useCallback(async () => {
    try {
      setCopyFeedback('idle');
      await navigator.clipboard.writeText(buildClipboardReport(validationResult));
      setCopyFeedback('copied');
      setTimeout(() => setCopyFeedback('idle'), COPY_FEEDBACK_DURATION);
    } catch {
      setCopyFeedback('error');
      setTimeout(() => setCopyFeedback('idle'), COPY_FEEDBACK_DURATION);
    }
  }, [validationResult]);

  if (validationResult.isValid && !hasWarnings) return null;


  return (
    <Card className={headerTone} role="alert" aria-live="polite">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-2">
            {hasErrors ? (
              <AlertTriangle className={`h-5 w-5 ${iconTone}`} />
            ) : (
              <Info className={`h-5 w-5 ${iconTone}`} />
            )}
            <div className="space-y-0.5">
              <CardTitle className="text-base">
                {hasErrors ? t`Chart Data Error` : t`Chart Data Warning`}
              </CardTitle>
              <CardDescription>
                {hasErrors
                  ? t`Invalid data detected in chart series`
                  : t`Some data issues were automatically resolved`}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasErrors && (
              <Badge variant="destructive">
                {validationResult.errors.length} error
                {validationResult.errors.length !== 1 ? "s" : ""}
              </Badge>
            )}
            {hasWarnings && (
              <Badge variant="secondary">
                {validationResult.warnings.length} warning
                {validationResult.warnings.length !== 1 ? "s" : ""}
              </Badge>
            )}
            <Badge variant={hasErrors ? "destructive" : "secondary"}>
              {total} issue{total !== 1 ? "s" : ""}
            </Badge>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded((v) => !v)}
              className="gap-1"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  {t`Hide details`}
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  {t`Show details`}
                </>
              )}
            </Button>

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={copyReport} 
              className="gap-1"
              aria-label={copyFeedback === 'copied' ? t`Copied to clipboard` : t`Copy error report to clipboard`}
              disabled={copyFeedback !== 'idle'}
            >
              {copyFeedback === 'copied' ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <ClipboardCopy className="h-4 w-4" />
              )}
              {copyFeedback === 'copied' ? t`Copied!` : copyFeedback === 'error' ? t`Error` : t`Copy`}
            </Button>

            {onDismiss && (
              <Button variant="ghost" size="sm" onClick={onDismiss}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {(isExpanded || hasErrors) && (
        <CardContent className="pt-0">
          <div className="space-y-5">
            {hasErrors && (
              <IssuesSection
                title={t`Errors`}
                issues={validationResult.errors}
                colorScheme={COLORS.ERROR}
              />
            )}

            {hasWarnings && (
              <IssuesSection
                title={t`Warnings`}
                issues={validationResult.warnings}
                colorScheme={COLORS.WARNING}
                showAutoFixNote={!hasErrors}
              />
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
