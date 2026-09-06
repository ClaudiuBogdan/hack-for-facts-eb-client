import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { ColorInput } from '@/components/ui/color-input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { largeModalClassName, modalContentClassName, modalHeaderClassName } from '@/components/ui/modal-sizes';
import { ModalSection } from '@/components/ui/modal-section';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  applyGradientColorsToBins,
  generateSequentialBins,
  getFiniteValuesArray,
  normalizeContinuousPercentilesForCommit,
  validateBinsConfig,
} from '@/lib/map-bins/bins';
import type {
  AdvancedMapAnalyticsBinsPreset,
  AdvancedMapAnalyticsBinsPresetConfig,
} from '@/schemas/advanced-map-analytics';
import { AdvancedMapAnalyticsBinsList } from './advanced-map-analytics-bins-list';
import { t } from '@lingui/core/macro';
import { ArrowLeftRight } from 'lucide-react';

interface AdvancedMapAnalyticsBinsModalProps {
  open: boolean;
  preset: AdvancedMapAnalyticsBinsPreset | undefined;
  activeSeriesLabel: string;
  activeSeriesValues: Map<string, string | number | undefined> | undefined;
  onOpenChange: (open: boolean) => void;
  onApplyPreset: (
    nextPreset: AdvancedMapAnalyticsBinsPreset
  ) => { ok: boolean; error?: string };
}

export function AdvancedMapAnalyticsBinsModal({
  open,
  preset,
  activeSeriesLabel,
  activeSeriesValues,
  onOpenChange,
  onApplyPreset,
}: Readonly<AdvancedMapAnalyticsBinsModalProps>) {
  const [draftPreset, setDraftPreset] = useState<AdvancedMapAnalyticsBinsPreset | null>(
    preset ? cloneBinsPreset(preset) : null
  );
  const [defaultBinCountInput, setDefaultBinCountInput] = useState(
    String(preset?.config.defaultBinCount ?? 5)
  );
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [hasInvalidBinDrafts, setHasInvalidBinDrafts] = useState(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const [isGradientOverwriteDialogOpen, setIsGradientOverwriteDialogOpen] = useState(false);
  const [minPercentileInput, setMinPercentileInput] = useState(
    formatPercentileInput(preset?.config.continuousPercentiles.min ?? 5)
  );
  const [maxPercentileInput, setMaxPercentileInput] = useState(
    formatPercentileInput(preset?.config.continuousPercentiles.max ?? 95)
  );
  const presetRef = useRef(preset);
  presetRef.current = preset;
  const presetResetKey = preset ? `${preset.id}:${preset.updatedAt}` : null;

  useEffect(() => {
    const currentPreset = presetRef.current;
    if (!currentPreset) {
      setDraftPreset(null);
      setDefaultBinCountInput('5');
      setMinPercentileInput('5');
      setMaxPercentileInput('95');
      setInlineError(null);
      setHasInvalidBinDrafts(false);
      setIsDiscardDialogOpen(false);
      setIsGradientOverwriteDialogOpen(false);
      return;
    }

    setDraftPreset(cloneBinsPreset(currentPreset));
    setDefaultBinCountInput(String(currentPreset.config.defaultBinCount));
    setMinPercentileInput(formatPercentileInput(currentPreset.config.continuousPercentiles.min));
    setMaxPercentileInput(formatPercentileInput(currentPreset.config.continuousPercentiles.max));
    setInlineError(null);
    setHasInvalidBinDrafts(false);
    setIsDiscardDialogOpen(false);
    setIsGradientOverwriteDialogOpen(false);
  }, [open, presetResetKey]);

  const presetConfig = draftPreset?.config;

  const validationErrors = useMemo(() => {
    if (!presetConfig) {
      return [];
    }
    if (presetConfig.intervalMode === 'discrete' && presetConfig.bins.length === 0) {
      return [t`At least one bin is required.`];
    }
    return validateBinsConfig(presetConfig).errors;
  }, [presetConfig]);

  const applyDraftPreset = (
    updater: (currentPreset: AdvancedMapAnalyticsBinsPreset) => AdvancedMapAnalyticsBinsPreset
  ): boolean => {
    setDraftPreset((currentPreset) => {
      if (!currentPreset) {
        return currentPreset;
      }
      return updater(currentPreset);
    });
    setInlineError(null);
    return true;
  };

  const applyDraftConfig = (
    updater: (currentConfig: AdvancedMapAnalyticsBinsPresetConfig) => AdvancedMapAnalyticsBinsPresetConfig
  ): boolean => {
    return applyDraftPreset((currentPreset) => ({
      ...currentPreset,
      config: updater(currentPreset.config),
      updatedAt: new Date().toISOString(),
    }));
  };

  const commitDefaultBinCount = () => {
    if (!presetConfig) {
      return;
    }

    const parsed = Number(defaultBinCountInput);
    if (!Number.isInteger(parsed) || parsed < 1) {
      setInlineError(t`Default bin count must be an integer greater than or equal to 1.`);
      setDefaultBinCountInput(String(presetConfig.defaultBinCount));
      return;
    }

    applyDraftConfig((currentConfig) => ({
      ...currentConfig,
      defaultBinCount: parsed,
    }));
  };

  const commitPresetAndClose = () => {
    if (!draftPreset) {
      onOpenChange(false);
      return;
    }

    const result = onApplyPreset({
      ...draftPreset,
      updatedAt: new Date().toISOString(),
    });
    if (!result.ok) {
      setInlineError(result.error ?? t`Invalid bins configuration.`);
      return;
    }

    setInlineError(null);
    onOpenChange(false);
  };

  const requestModalClose = () => {
    if (hasInvalidBinDrafts || validationErrors.length > 0 || inlineError) {
      setIsDiscardDialogOpen(true);
      return;
    }
    commitPresetAndClose();
  };

  const handleColorModeChange = (nextColorMode: AdvancedMapAnalyticsBinsPresetConfig['colorMode']) => {
    if (!presetConfig || nextColorMode === presetConfig.colorMode) {
      return;
    }

    if (nextColorMode === 'gradient' && presetConfig.bins.length > 0) {
      setIsGradientOverwriteDialogOpen(true);
      return;
    }

    applyDraftConfig((currentConfig) => ({
      ...currentConfig,
      colorMode: nextColorMode,
    }));
  };

  const handleIntervalModeChange = (
    nextIntervalMode: AdvancedMapAnalyticsBinsPresetConfig['intervalMode']
  ) => {
    if (!presetConfig || nextIntervalMode === presetConfig.intervalMode) {
      return;
    }

    if (nextIntervalMode === 'continuous') {
      setHasInvalidBinDrafts(false);
    }

    applyDraftConfig((currentConfig) => ({
      ...currentConfig,
      intervalMode: nextIntervalMode,
      colorMode: nextIntervalMode === 'continuous' ? 'gradient' : currentConfig.colorMode,
    }));
  };

  const commitContinuousPercentile = (bound: 'min' | 'max') => {
    if (!presetConfig) {
      return;
    }

    const currentInput = bound === 'min' ? minPercentileInput : maxPercentileInput;
    const parsedValue = Number(currentInput);
    if (!Number.isFinite(parsedValue)) {
      setMinPercentileInput(formatPercentileInput(presetConfig.continuousPercentiles.min));
      setMaxPercentileInput(formatPercentileInput(presetConfig.continuousPercentiles.max));
      return;
    }

    const normalizedPercentiles = normalizeContinuousPercentilesForCommit(
      presetConfig.continuousPercentiles,
      bound,
      parsedValue
    );

    applyDraftConfig((currentConfig) => ({
      ...currentConfig,
      continuousPercentiles: normalizedPercentiles,
    }));

    setMinPercentileInput(formatPercentileInput(normalizedPercentiles.min));
    setMaxPercentileInput(formatPercentileInput(normalizedPercentiles.max));
  };

  const confirmGradientOverwrite = () => {
    if (!presetConfig) {
      return;
    }

    applyDraftConfig((currentConfig) => ({
      ...currentConfig,
      colorMode: 'gradient',
      bins: applyGradientColorsToBins(currentConfig.bins, currentConfig.gradient),
    }));
    setIsGradientOverwriteDialogOpen(false);
  };

  const regenerateBins = () => {
    if (!presetConfig) {
      return;
    }

    const generatedBins = generateSequentialBins(
      getFiniteValuesArray(activeSeriesValues),
      presetConfig.defaultBinCount,
      presetConfig.colorMode,
      presetConfig.gradient
    );
    if (generatedBins.length === 0) {
      setInlineError(t`Cannot generate numeric bins for the active values.`);
      return;
    }

    applyDraftConfig((currentConfig) => ({
      ...currentConfig,
      bins: generatedBins,
    }));
  };

  if (!draftPreset || !presetConfig) {
    return null;
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            onOpenChange(true);
            return;
          }
          requestModalClose();
        }}
      >
        <DialogContent className={`${largeModalClassName} max-w-5xl`}>
          <DialogHeader className={modalHeaderClassName}>
            <DialogTitle>{t`Edit Bins Preset`}</DialogTitle>
            <DialogDescription>
              {t`Configure bins for this preset. Changes are local while this modal is open.`}
            </DialogDescription>
          </DialogHeader>

          <div className={modalContentClassName}>
            <ModalSection variant="muted">
              <div className="space-y-4">
                <FormField label={t`Preset label`} htmlFor="advanced-map-analytics-bins-preset-label">
                  <Input
                    id="advanced-map-analytics-bins-preset-label"
                    value={draftPreset.label}
                    onChange={(event) => {
                      const nextLabel = event.currentTarget.value;
                      applyDraftPreset((currentPreset) => ({
                        ...currentPreset,
                        label: nextLabel,
                        updatedAt: new Date().toISOString(),
                      }));
                    }}
                    autoComplete="off"
                  />
                </FormField>

                <FormField label={t`Bins title`} htmlFor="advanced-map-analytics-bins-title">
                  <Input
                    id="advanced-map-analytics-bins-title"
                    value={presetConfig.title}
                    onChange={(event) => {
                      const nextTitle = event.currentTarget.value;
                      applyDraftConfig((currentConfig) => ({
                        ...currentConfig,
                        title: nextTitle,
                      }));
                    }}
                    autoComplete="off"
                    placeholder={t`Optional legend title`}
                  />
                </FormField>

                <div className="rounded-lg border bg-background p-3">
                  <p className="text-sm font-medium">{t`Active data series`}</p>
                  <p className="truncate text-sm text-muted-foreground">{activeSeriesLabel}</p>
                </div>

                <FormField label={t`Interval mode`} htmlFor="advanced-map-analytics-bins-interval-mode">
                  <Select
                    value={presetConfig.intervalMode}
                    onValueChange={(value) =>
                      handleIntervalModeChange(value as AdvancedMapAnalyticsBinsPresetConfig['intervalMode'])
                    }
                  >
                    <SelectTrigger id="advanced-map-analytics-bins-interval-mode">
                      <SelectValue placeholder={t`Select interval mode`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="discrete">{t`discrete`}</SelectItem>
                      <SelectItem value="continuous">{t`continuous`}</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>

                {presetConfig.intervalMode === 'discrete' ? (
                  <FormField label={t`Color mode`} htmlFor="advanced-map-analytics-bins-color-mode">
                    <Select
                      value={presetConfig.colorMode}
                      onValueChange={(value) =>
                        handleColorModeChange(value as AdvancedMapAnalyticsBinsPresetConfig['colorMode'])
                      }
                    >
                      <SelectTrigger id="advanced-map-analytics-bins-color-mode">
                        <SelectValue placeholder={t`Select color mode`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">{t`manual`}</SelectItem>
                        <SelectItem value="gradient">{t`gradient`}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                ) : null}

                {presetConfig.intervalMode === 'discrete' ? (
                  <FormField label={t`Default bin count`} htmlFor="advanced-map-analytics-bins-default-count">
                    <Input
                      id="advanced-map-analytics-bins-default-count"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={defaultBinCountInput}
                      onChange={(event) => setDefaultBinCountInput(event.currentTarget.value)}
                      onBlur={commitDefaultBinCount}
                      autoComplete="off"
                    />
                  </FormField>
                ) : null}
              </div>
            </ModalSection>

            <section className="flex items-center gap-4 rounded-lg border px-3 py-2">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">{t`Gradient`}</span>
                <div className="flex items-center gap-2">
                  <ColorInput
                    id="advanced-map-analytics-bins-gradient-start"
                    value={presetConfig.gradient.startColor}
                    onChange={(event) => {
                      const nextStartColor = event.currentTarget.value;
                      applyDraftConfig((currentConfig) => ({
                        ...currentConfig,
                        gradient: {
                          ...currentConfig.gradient,
                          startColor: nextStartColor,
                        },
                      }));
                    }}
                  />
                  <span className="text-xs text-muted-foreground">→</span>
                  <ColorInput
                    id="advanced-map-analytics-bins-gradient-end"
                    value={presetConfig.gradient.endColor}
                    onChange={(event) => {
                      const nextEndColor = event.currentTarget.value;
                      applyDraftConfig((currentConfig) => ({
                        ...currentConfig,
                        gradient: {
                          ...currentConfig.gradient,
                          endColor: nextEndColor,
                        },
                      }));
                    }}
                  />
                </div>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-label={t`Switch gradient colors`}
                  title={t`Switch gradient colors`}
                  onClick={() => {
                    applyDraftConfig((currentConfig) => ({
                      ...currentConfig,
                      gradient: {
                        startColor: currentConfig.gradient.endColor,
                        endColor: currentConfig.gradient.startColor,
                      },
                    }));
                  }}
                >
                  <ArrowLeftRight />
                </Button>

                {presetConfig.intervalMode === 'discrete' ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      applyDraftConfig((currentConfig) => ({
                        ...currentConfig,
                        bins: applyGradientColorsToBins(currentConfig.bins, currentConfig.gradient),
                      }));
                    }}
                  >
                    {t`Apply`}
                  </Button>
                ) : null}
              </div>
            </section>

            {presetConfig.intervalMode === 'continuous' ? (
              <ModalSection title={t`Continuous range`}>
                <div className="space-y-3">
                  <FormField
                    label={t`Min percentile`}
                    htmlFor="advanced-map-analytics-bins-continuous-min-percentile"
                  >
                    <Input
                      id="advanced-map-analytics-bins-continuous-min-percentile"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={100}
                      step="any"
                      value={minPercentileInput}
                      onChange={(event) => setMinPercentileInput(event.currentTarget.value)}
                      onBlur={() => commitContinuousPercentile('min')}
                      autoComplete="off"
                    />
                  </FormField>

                  <FormField
                    label={t`Max percentile`}
                    htmlFor="advanced-map-analytics-bins-continuous-max-percentile"
                  >
                    <Input
                      id="advanced-map-analytics-bins-continuous-max-percentile"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={100}
                      step="any"
                      value={maxPercentileInput}
                      onChange={(event) => setMaxPercentileInput(event.currentTarget.value)}
                      onBlur={() => commitContinuousPercentile('max')}
                      autoComplete="off"
                    />
                  </FormField>
                </div>
              </ModalSection>
            ) : null}

            <section className="flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2">
              <span className="text-sm font-medium">{t`No data`}</span>
              <Input
                id="advanced-map-analytics-bins-no-data-label"
                value={presetConfig.noData.label}
                onChange={(event) => {
                  const nextNoDataLabel = event.currentTarget.value;
                  applyDraftConfig((currentConfig) => ({
                    ...currentConfig,
                    noData: {
                      ...currentConfig.noData,
                      label: nextNoDataLabel,
                    },
                  }));
                }}
                autoComplete="off"
                className="h-7 w-24 text-xs"
              />
              <ColorInput
                id="advanced-map-analytics-bins-no-data-color"
                value={presetConfig.noData.color}
                onChange={(event) => {
                  const nextNoDataColor = event.currentTarget.value;
                  applyDraftConfig((currentConfig) => ({
                    ...currentConfig,
                    noData: {
                      ...currentConfig.noData,
                      color: nextNoDataColor,
                    },
                  }));
                }}
              />
              <div className="ml-auto flex items-center gap-2">
                <Label htmlFor="no-data-tooltip" className="cursor-pointer text-xs text-muted-foreground">
                  {t`Show in tooltip`}
                </Label>
                <Switch
                  id="no-data-tooltip"
                  checked={presetConfig.noData.showInTooltip}
                  onCheckedChange={(checked) =>
                    applyDraftConfig((currentConfig) => ({
                      ...currentConfig,
                      noData: {
                        ...currentConfig.noData,
                        showInTooltip: checked,
                      },
                    }))
                  }
                />
              </div>
            </section>

            {presetConfig.intervalMode === 'discrete' ? (
              <ModalSection
                title={t`Bins`}
                actions={
                  <Button type="button" variant="outline" size="sm" onClick={regenerateBins}>
                    {t`Regenerate from active data`}
                  </Button>
                }
              >
                <AdvancedMapAnalyticsBinsList
                  bins={presetConfig.bins}
                  onInvalidDraftStateChange={setHasInvalidBinDrafts}
                  onApplyBins={(nextBins) => {
                    applyDraftConfig((currentConfig) => ({
                      ...currentConfig,
                      bins: nextBins,
                    }));
                    return { ok: true };
                  }}
                />
              </ModalSection>
            ) : null}

            {validationErrors.length > 0 ? (
              <ModalSection variant="danger" className="p-3">
                <h4 className="mb-1 text-sm font-semibold text-destructive">{t`Validation errors`}</h4>
                <div className="space-y-1">
                  {validationErrors.map((errorMessage) => (
                    <p key={errorMessage} className="text-xs text-destructive">
                      {errorMessage}
                    </p>
                  ))}
                </div>
              </ModalSection>
            ) : null}

            {inlineError ? <p className="text-sm text-destructive">{inlineError}</p> : null}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDiscardDialogOpen} onOpenChange={setIsDiscardDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t`Discard local edits?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {t`Some local values are invalid. Closing now will discard unsaved local changes.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t`Continue editing`}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setIsDiscardDialogOpen(false);
                setHasInvalidBinDrafts(false);
                setInlineError(null);
                onOpenChange(false);
              }}
            >
              {t`Discard & close`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isGradientOverwriteDialogOpen}
        onOpenChange={setIsGradientOverwriteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t`Apply gradient colors?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {t`Switching to gradient mode will overwrite current bin colors using the selected gradient anchors.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t`Cancel`}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmGradientOverwrite}>
              {t`Apply gradient`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function cloneBinsPreset(preset: AdvancedMapAnalyticsBinsPreset): AdvancedMapAnalyticsBinsPreset {
  return {
    ...preset,
    config: {
      ...preset.config,
      gradient: { ...preset.config.gradient },
      noData: { ...preset.config.noData },
      boundaries: { ...preset.config.boundaries },
      continuousPercentiles: { ...preset.config.continuousPercentiles },
      bins: preset.config.bins.map((bin) => ({ ...bin })),
    },
  };
}

function formatPercentileInput(value: number): string {
  const rounded = Math.round(value * 1_000_000) / 1_000_000;
  return String(rounded);
}
