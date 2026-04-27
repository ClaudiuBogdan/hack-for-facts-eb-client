import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { t } from '@lingui/core/macro';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import type {
  AdvancedMapDatasetDraftRow,
  AdvancedMapDatasetPayloadDraft,
} from '@/features/advanced-map-datasets/types';
import {
  createAdvancedMapDatasetPayloadDraft,
  createEmptyAdvancedMapDatasetPayloadDraft,
  hasAdvancedMapDatasetPayloadDraftData,
  resolveAdvancedMapDatasetPayloadDraft,
} from '@/features/advanced-map-datasets/types';

interface DatasetEditorUatDialogProps {
  open: boolean;
  row: AdvancedMapDatasetDraftRow | null;
  unit: string;
  onOpenChange: (open: boolean) => void;
  onValueChange: (sirutaCode: string, nextValue: string) => void;
  onPayloadChange: (sirutaCode: string, nextPayloadDraft: AdvancedMapDatasetPayloadDraft) => void;
}

const VALUE_COMMIT_DELAY_MS = 500;
const PAYLOAD_COMMIT_DELAY_MS = 500;

function buildDialogTitle(row: AdvancedMapDatasetDraftRow | null): string {
  if (!row) {
    return '';
  }

  const levelName = row.levelName?.trim();
  if (levelName && levelName.length > 0) {
    return `${levelName} ${row.name}`;
  }

  return row.name;
}

function buildUnitLabel(unit: string): string {
  const trimmedUnit = unit.trim();
  return trimmedUnit.length > 0 ? trimmedUnit : t`No unit`;
}

export function DatasetEditorUatDialog({
  open,
  row,
  unit,
  onOpenChange,
  onValueChange,
  onPayloadChange,
}: Readonly<DatasetEditorUatDialogProps>) {
  const latestValueRef = useRef(row?.rawValue ?? row?.valueText ?? '');
  const previousRowSirutaRef = useRef<string | null>(row?.sirutaCode ?? null);
  const pendingValueCommitTimeoutRef = useRef<number | null>(null);
  const pendingPayloadCommitTimeoutRef = useRef<number | null>(null);
  const hasPendingValueCommitRef = useRef(false);
  const hasPendingPayloadCommitRef = useRef(false);
  const latestRowSirutaRef = useRef<string | null>(row?.sirutaCode ?? null);
  const onValueChangeRef = useRef(onValueChange);
  const onPayloadChangeRef = useRef(onPayloadChange);
  const [valueDraft, setValueDraft] = useState(row?.rawValue ?? row?.valueText ?? '');
  const [payloadDraft, setPayloadDraft] = useState<AdvancedMapDatasetPayloadDraft>(() =>
    row?.payloadDraft ?? createAdvancedMapDatasetPayloadDraft(row?.valueJson)
  );
  const payloadDraftRef = useRef(payloadDraft);

  useEffect(() => {
    onValueChangeRef.current = onValueChange;
  }, [onValueChange]);

  useEffect(() => {
    onPayloadChangeRef.current = onPayloadChange;
  }, [onPayloadChange]);

  const clearPendingValueCommit = useCallback(() => {
    if (pendingValueCommitTimeoutRef.current !== null) {
      window.clearTimeout(pendingValueCommitTimeoutRef.current);
      pendingValueCommitTimeoutRef.current = null;
    }
  }, []);

  const clearPendingPayloadCommit = useCallback(() => {
    if (pendingPayloadCommitTimeoutRef.current !== null) {
      window.clearTimeout(pendingPayloadCommitTimeoutRef.current);
      pendingPayloadCommitTimeoutRef.current = null;
    }
  }, []);

  const flushPendingValueCommit = useCallback((
    sirutaCode: string | null = latestRowSirutaRef.current,
    nextValue: string = latestValueRef.current
  ) => {
    clearPendingValueCommit();

    if (!sirutaCode || !hasPendingValueCommitRef.current) {
      return;
    }

    hasPendingValueCommitRef.current = false;
    onValueChangeRef.current(sirutaCode, nextValue);
  }, [clearPendingValueCommit]);

  const flushPendingPayloadCommit = useCallback((
    sirutaCode: string | null = latestRowSirutaRef.current,
    nextPayloadDraft: AdvancedMapDatasetPayloadDraft = payloadDraftRef.current
  ) => {
    clearPendingPayloadCommit();

    if (!sirutaCode || !hasPendingPayloadCommitRef.current) {
      return;
    }

    hasPendingPayloadCommitRef.current = false;
    onPayloadChangeRef.current(sirutaCode, nextPayloadDraft);
  }, [clearPendingPayloadCommit]);

  useEffect(() => {
    const previousSirutaCode = previousRowSirutaRef.current;
    const currentSirutaCode = row?.sirutaCode ?? null;

    if (previousSirutaCode !== null && previousSirutaCode !== currentSirutaCode) {
      flushPendingValueCommit(previousSirutaCode, latestValueRef.current);
      flushPendingPayloadCommit(previousSirutaCode, payloadDraftRef.current);
    }

    latestValueRef.current = row?.rawValue ?? row?.valueText ?? '';
    setValueDraft(latestValueRef.current);

    const nextPayloadDraft = row?.payloadDraft ?? createAdvancedMapDatasetPayloadDraft(row?.valueJson);
    payloadDraftRef.current = nextPayloadDraft;
    setPayloadDraft(nextPayloadDraft);

    previousRowSirutaRef.current = currentSirutaCode;
    latestRowSirutaRef.current = currentSirutaCode;
    hasPendingValueCommitRef.current = false;
    hasPendingPayloadCommitRef.current = false;
  }, [
    flushPendingPayloadCommit,
    flushPendingValueCommit,
    row?.payloadDraft,
    row?.rawValue,
    row?.sirutaCode,
    row?.valueJson,
    row?.valueText,
  ]);

  useEffect(() => () => {
    flushPendingValueCommit();
    flushPendingPayloadCommit();
  }, [flushPendingPayloadCommit, flushPendingValueCommit]);

  const typeLabel = row?.levelName?.trim() || t`Unknown type`;
  const countyLabel = row?.countyName?.trim() || t`Unknown county`;
  const unitLabel = buildUnitLabel(unit);
  const resolvedPayloadState = useMemo(
    () => resolveAdvancedMapDatasetPayloadDraft(payloadDraft, row?.valueJson ?? null),
    [payloadDraft, row?.valueJson]
  );
  const payloadPreview = useMemo(() => {
    if (payloadDraft.type === 'none') {
      return t`No payload configured`;
    }

    if (payloadDraft.type === 'text') {
      return payloadDraft.value.trim() || t`Empty text payload`;
    }

    if (payloadDraft.type === 'markdown') {
      return payloadDraft.value.trim() || t`Empty markdown payload`;
    }

    const trimmedUrl = payloadDraft.value.trim();
    const trimmedLabel = payloadDraft.linkLabel.trim();
    if (trimmedUrl === '') {
      return t`Empty link payload`;
    }

    return trimmedLabel !== '' ? `${trimmedLabel} | ${trimmedUrl}` : trimmedUrl;
  }, [payloadDraft]);
  const payloadValidationMessage = resolvedPayloadState.validationMessage;

  const updatePayloadDraft = (nextPayloadDraft: AdvancedMapDatasetPayloadDraft) => {
    payloadDraftRef.current = nextPayloadDraft;
    setPayloadDraft(nextPayloadDraft);
    hasPendingPayloadCommitRef.current = true;
    clearPendingPayloadCommit();
    const rowSirutaCode = row?.sirutaCode ?? null;
    pendingPayloadCommitTimeoutRef.current = window.setTimeout(() => {
      flushPendingPayloadCommit(rowSirutaCode, nextPayloadDraft);
    }, PAYLOAD_COMMIT_DELAY_MS);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          flushPendingValueCommit(row?.sirutaCode ?? null);
          flushPendingPayloadCommit(row?.sirutaCode ?? null, payloadDraftRef.current);
        }

        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="overflow-hidden p-0 sm:max-w-xl">
        <div className="px-6 pb-4 pt-6">
          <DialogHeader className="text-left">
            <DialogTitle className="pr-8 text-lg font-semibold tracking-tight">
              {buildDialogTitle(row) || t`UAT details`}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm">
              {row
                ? t`Update this UAT’s dataset value and optional payload.`
                : t`Select a UAT from the map to edit its value.`}
            </DialogDescription>
          </DialogHeader>

          {row ? (
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span>{typeLabel}</span>
              <span aria-hidden className="h-1 w-1 rounded-full bg-muted-foreground/40" />
              <span>{countyLabel}</span>
              <span aria-hidden className="h-1 w-1 rounded-full bg-muted-foreground/40" />
              <span className="font-mono">{t`SIRUTA`} {row.sirutaCode}</span>
            </div>
          ) : null}
        </div>

        {row ? (
          <div className="space-y-5 border-t border-border/60 px-6 pb-6 pt-5">
            <section className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-medium text-foreground">{t`Value`}</h3>
                <span className="text-xs text-muted-foreground">{t`Press Enter to save & close`}</span>
              </div>

              <div className="relative">
                <Input
                  id="dataset-editor-uat-value"
                  value={valueDraft}
                  onChange={(event) => {
                    const nextValue = event.currentTarget.value;
                    latestValueRef.current = nextValue;
                    setValueDraft(nextValue);
                    hasPendingValueCommitRef.current = true;
                    clearPendingValueCommit();
                    const rowSirutaCode = row?.sirutaCode ?? null;
                    pendingValueCommitTimeoutRef.current = window.setTimeout(() => {
                      flushPendingValueCommit(rowSirutaCode, nextValue);
                    }, VALUE_COMMIT_DELAY_MS);
                  }}
                  onBlur={() => flushPendingValueCommit(row?.sirutaCode ?? null)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' || event.nativeEvent.isComposing) {
                      return;
                    }

                    event.preventDefault();
                    flushPendingValueCommit(row?.sirutaCode ?? null, latestValueRef.current);
                    onOpenChange(false);
                  }}
                  placeholder={t`Value`}
                  className="h-11 pr-28 text-right text-base tabular-nums"
                  autoFocus
                />
                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {unitLabel}
                  </span>
                </div>
              </div>

              {row.validationMessage ? (
                <p className="text-xs text-destructive">{row.validationMessage}</p>
              ) : null}
            </section>

            <Separator className="bg-border/60" />

            <section className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-medium text-foreground">{t`Payload`}</h3>
                <span className="text-xs text-muted-foreground">{t`Optional`}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t`Optional content shown when users click this UAT on the map.`}
              </p>

              <Select
                value={payloadDraft.type}
                onValueChange={(value) => {
                  if (value === 'none') {
                    updatePayloadDraft(createEmptyAdvancedMapDatasetPayloadDraft());
                    return;
                  }

                  updatePayloadDraft({
                    ...payloadDraft,
                    type: value as AdvancedMapDatasetPayloadDraft['type'],
                    linkLabel: value === 'link' ? payloadDraft.linkLabel : '',
                  });
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t`No payload`}</SelectItem>
                  <SelectItem value="text">{t`Plain text`}</SelectItem>
                  <SelectItem value="link">{t`External link`}</SelectItem>
                  <SelectItem value="markdown">{t`Markdown`}</SelectItem>
                </SelectContent>
              </Select>

              {payloadDraft.type === 'text' ? (
                <Textarea
                  value={payloadDraft.value}
                  onChange={(event) =>
                    updatePayloadDraft({
                      ...payloadDraft,
                      value: event.currentTarget.value,
                    })
                  }
                  onBlur={() => flushPendingPayloadCommit(row?.sirutaCode ?? null, payloadDraftRef.current)}
                  placeholder={t`Enter text content…`}
                  className="min-h-[80px] resize-none"
                />
              ) : null}

              {payloadDraft.type === 'markdown' ? (
                <Textarea
                  value={payloadDraft.value}
                  onChange={(event) =>
                    updatePayloadDraft({
                      ...payloadDraft,
                      value: event.currentTarget.value,
                    })
                  }
                  onBlur={() => flushPendingPayloadCommit(row?.sirutaCode ?? null, payloadDraftRef.current)}
                  placeholder={t`Enter markdown content…`}
                  className="min-h-[100px] resize-none font-mono text-sm"
                />
              ) : null}

              {payloadDraft.type === 'link' ? (
                <div className="space-y-2">
                  <Input
                    value={payloadDraft.value}
                    onChange={(event) =>
                      updatePayloadDraft({
                        ...payloadDraft,
                        value: event.currentTarget.value,
                      })
                    }
                    onBlur={() => flushPendingPayloadCommit(row?.sirutaCode ?? null, payloadDraftRef.current)}
                    placeholder={t`https://example.com`}
                    className="h-9"
                  />
                  <Input
                    value={payloadDraft.linkLabel}
                    onChange={(event) =>
                      updatePayloadDraft({
                        ...payloadDraft,
                        linkLabel: event.currentTarget.value,
                      })
                    }
                    onBlur={() => flushPendingPayloadCommit(row?.sirutaCode ?? null, payloadDraftRef.current)}
                    placeholder={t`Link label (optional)`}
                    className="h-9"
                  />
                </div>
              ) : null}

              {payloadDraft.type !== 'none' ? (
                <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
                    {t`Preview`}
                  </span>
                  <p className="mt-1 break-words text-foreground/80">{payloadPreview}</p>
                </div>
              ) : null}

              {payloadValidationMessage && hasAdvancedMapDatasetPayloadDraftData(payloadDraft) ? (
                <p className="text-xs text-destructive">{payloadValidationMessage}</p>
              ) : null}
            </section>
          </div>
        ) : (
          <div className="border-t border-border/60 px-6 py-5 text-sm text-muted-foreground">
            {t`Select a UAT from the map to load its details here.`}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
