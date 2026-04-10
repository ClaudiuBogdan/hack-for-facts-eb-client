import { useEffect, useMemo, useRef, useState } from 'react';
import { t } from '@lingui/core/macro';
import { Badge } from '@/components/ui/badge';
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
  const [valueDraft, setValueDraft] = useState(row?.rawValue ?? row?.valueText ?? '');
  const [payloadDraft, setPayloadDraft] = useState<AdvancedMapDatasetPayloadDraft>(() =>
    row?.payloadDraft ?? createAdvancedMapDatasetPayloadDraft(row?.valueJson)
  );
  const payloadDraftRef = useRef(payloadDraft);

  const clearPendingValueCommit = () => {
    if (pendingValueCommitTimeoutRef.current !== null) {
      window.clearTimeout(pendingValueCommitTimeoutRef.current);
      pendingValueCommitTimeoutRef.current = null;
    }
  };

  const clearPendingPayloadCommit = () => {
    if (pendingPayloadCommitTimeoutRef.current !== null) {
      window.clearTimeout(pendingPayloadCommitTimeoutRef.current);
      pendingPayloadCommitTimeoutRef.current = null;
    }
  };

  const flushPendingValueCommit = (
    sirutaCode: string | null = row?.sirutaCode ?? null,
    nextValue: string = latestValueRef.current
  ) => {
    clearPendingValueCommit();

    if (!sirutaCode || !hasPendingValueCommitRef.current) {
      return;
    }

    hasPendingValueCommitRef.current = false;
    onValueChange(sirutaCode, nextValue);
  };

  const flushPendingPayloadCommit = (
    sirutaCode: string | null = row?.sirutaCode ?? null,
    nextPayloadDraft: AdvancedMapDatasetPayloadDraft = payloadDraftRef.current
  ) => {
    clearPendingPayloadCommit();

    if (!sirutaCode || !hasPendingPayloadCommitRef.current) {
      return;
    }

    hasPendingPayloadCommitRef.current = false;
    onPayloadChange(sirutaCode, nextPayloadDraft);
  };

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
    hasPendingValueCommitRef.current = false;
    hasPendingPayloadCommitRef.current = false;
  }, [row?.payloadDraft, row?.rawValue, row?.sirutaCode, row?.valueJson, row?.valueText]);

  useEffect(() => () => {
    flushPendingValueCommit();
    flushPendingPayloadCommit();
  }, []);

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
        <div className="border-b bg-muted/20 px-6 py-5">
          <DialogHeader className="text-left">
            <DialogTitle className="pr-8">{buildDialogTitle(row) || t`UAT details`}</DialogTitle>
            <DialogDescription className="mt-1.5">
              {row
                ? t`Review the selected UAT metadata and update its dataset value here.`
                : t`Select a UAT from the map to edit its value.`}
            </DialogDescription>
          </DialogHeader>

          {row ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-background/80">{typeLabel}</Badge>
              <Badge variant="outline" className="bg-background/80">{countyLabel}</Badge>
              <Badge variant="secondary" className="font-mono">{row.sirutaCode}</Badge>
            </div>
          ) : null}
        </div>

        {row ? (
          <div className="px-5 py-4">
            <div className="space-y-4">
              <section className="space-y-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{t`Dataset value`}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t`Press Enter to save and close.`}
                  </p>
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
                    className="h-11 pr-32 text-right text-base tabular-nums"
                    autoFocus
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    <span className="rounded border bg-muted/70 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {unitLabel}
                    </span>
                  </div>
                </div>

                {row.validationMessage ? (
                  <p className="text-xs text-destructive">{row.validationMessage}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {t`Changes apply immediately to the draft and are reflected in the table and map preview.`}
                  </p>
                )}
              </section>

              <Separator />

              <section className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{t`Payload`}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t`Optional content displayed when users click this UAT on the map.`}
                  </p>
                </div>

                <div className="space-y-3 rounded-lg border bg-background p-3">
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
                      placeholder={t`Enter text content...`}
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
                      placeholder={t`Enter markdown content...`}
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
                    <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/70">{t`Preview:`}</span>{' '}
                      {payloadPreview}
                    </div>
                  ) : null}

                  {payloadValidationMessage && hasAdvancedMapDatasetPayloadDraftData(payloadDraft) ? (
                    <p className="text-xs text-destructive">{payloadValidationMessage}</p>
                  ) : null}
                </div>
              </section>
            </div>
          </div>
        ) : (
          <div className="px-6 py-5 text-sm text-muted-foreground">
            {t`Select a UAT from the map to load its details here.`}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
