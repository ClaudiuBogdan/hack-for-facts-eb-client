import { useEffect, useMemo, useState } from 'react';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  applyGradientColorsToBins,
  generateSequentialBins,
  validateBinsConfig,
} from '@/lib/map-bins/bins';
import type {
  ExperimentalMapBinsPreset,
  ExperimentalMapBinsPresetConfig,
} from '@/schemas/experimental-map';
import { ExperimentalMapBinsList } from './experimental-map-bins-list';

interface ExperimentalMapBinsModalProps {
  open: boolean;
  preset: ExperimentalMapBinsPreset | undefined;
  activeSeriesLabel: string;
  activeSeriesValues: Map<string, number | undefined> | undefined;
  onOpenChange: (open: boolean) => void;
  onApplyPreset: (
    nextPreset: ExperimentalMapBinsPreset
  ) => { ok: boolean; error?: string };
}

export function ExperimentalMapBinsModal({
  open,
  preset,
  activeSeriesLabel,
  activeSeriesValues,
  onOpenChange,
  onApplyPreset,
}: Readonly<ExperimentalMapBinsModalProps>) {
  const [draftPreset, setDraftPreset] = useState<ExperimentalMapBinsPreset | null>(
    preset ? cloneBinsPreset(preset) : null
  );
  const [defaultBinCountInput, setDefaultBinCountInput] = useState(
    String(preset?.config.defaultBinCount ?? 5)
  );
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [hasInvalidBinDrafts, setHasInvalidBinDrafts] = useState(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const [isGradientOverwriteDialogOpen, setIsGradientOverwriteDialogOpen] = useState(false);

  useEffect(() => {
    if (!preset) {
      setDraftPreset(null);
      setDefaultBinCountInput('5');
      setInlineError(null);
      setHasInvalidBinDrafts(false);
      setIsDiscardDialogOpen(false);
      setIsGradientOverwriteDialogOpen(false);
      return;
    }

    setDraftPreset(cloneBinsPreset(preset));
    setDefaultBinCountInput(String(preset.config.defaultBinCount));
    setInlineError(null);
    setHasInvalidBinDrafts(false);
    setIsDiscardDialogOpen(false);
    setIsGradientOverwriteDialogOpen(false);
  }, [preset?.id, open]);

  const presetConfig = draftPreset?.config;

  const validationErrors = useMemo(() => {
    if (!presetConfig) {
      return [];
    }
    if (presetConfig.bins.length === 0) {
      return ['At least one bin is required.'];
    }
    return validateBinsConfig(presetConfig).errors;
  }, [presetConfig]);

  const applyDraftPreset = (
    updater: (currentPreset: ExperimentalMapBinsPreset) => ExperimentalMapBinsPreset
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
    updater: (currentConfig: ExperimentalMapBinsPresetConfig) => ExperimentalMapBinsPresetConfig
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
      setInlineError('Default bin count must be an integer greater than or equal to 1.');
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
      setInlineError(result.error ?? 'Invalid bins configuration.');
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

  const handleColorModeChange = (nextColorMode: ExperimentalMapBinsPresetConfig['colorMode']) => {
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
      setInlineError('Cannot regenerate bins because active data has no numeric values.');
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
        <DialogContent className="grid h-[min(92vh,940px)] w-[min(96vw,1200px)] max-w-5xl grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle>Edit Bins Preset</DialogTitle>
            <DialogDescription>
              Configure bins for this preset. Changes are local while this modal is open.
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-6 py-4">
            <section className="rounded-xl border bg-muted/20 p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="experimental-bins-preset-label">Preset label</Label>
                  <Input
                    id="experimental-bins-preset-label"
                    value={draftPreset.label}
                    onChange={(event) =>
                      applyDraftPreset((currentPreset) => ({
                        ...currentPreset,
                        label: event.currentTarget.value,
                        updatedAt: new Date().toISOString(),
                      }))
                    }
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experimental-bins-title">Bins title</Label>
                  <Input
                    id="experimental-bins-title"
                    value={presetConfig.title}
                    onChange={(event) =>
                      applyDraftConfig((currentConfig) => ({
                        ...currentConfig,
                        title: event.currentTarget.value,
                      }))
                    }
                    autoComplete="off"
                    placeholder="Optional legend title"
                  />
                </div>

                <div className="rounded-lg border bg-background p-3">
                  <p className="text-sm font-medium">Active data series</p>
                  <p className="truncate text-sm text-muted-foreground">{activeSeriesLabel}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experimental-bins-color-mode">Color mode</Label>
                  <Select
                    value={presetConfig.colorMode}
                    onValueChange={(value) =>
                      handleColorModeChange(value as ExperimentalMapBinsPresetConfig['colorMode'])
                    }
                  >
                    <SelectTrigger id="experimental-bins-color-mode">
                      <SelectValue placeholder="Select color mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">manual</SelectItem>
                      <SelectItem value="gradient">gradient</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experimental-bins-default-count">Default bin count</Label>
                  <Input
                    id="experimental-bins-default-count"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={defaultBinCountInput}
                    onChange={(event) => setDefaultBinCountInput(event.currentTarget.value)}
                    onBlur={commitDefaultBinCount}
                    autoComplete="off"
                  />
                </div>
              </div>
            </section>

            <section className="flex items-center gap-4 rounded-lg border px-3 py-2">
              <span className="text-sm font-medium">Gradient</span>
              <div className="flex items-center gap-2">
                <Input
                  id="experimental-bins-gradient-start"
                  type="color"
                  value={presetConfig.gradient.startColor}
                  className="h-7 w-7 cursor-pointer rounded border-0 p-0.5"
                  onChange={(event) =>
                    applyDraftConfig((currentConfig) => ({
                      ...currentConfig,
                      gradient: {
                        ...currentConfig.gradient,
                        startColor: event.currentTarget.value,
                      },
                    }))
                  }
                />
                <span className="text-xs text-muted-foreground">→</span>
                <Input
                  id="experimental-bins-gradient-end"
                  type="color"
                  value={presetConfig.gradient.endColor}
                  className="h-7 w-7 cursor-pointer rounded border-0 p-0.5"
                  onChange={(event) =>
                    applyDraftConfig((currentConfig) => ({
                      ...currentConfig,
                      gradient: {
                        ...currentConfig.gradient,
                        endColor: event.currentTarget.value,
                      },
                    }))
                  }
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="ml-auto"
                onClick={() => {
                  applyDraftConfig((currentConfig) => ({
                    ...currentConfig,
                    bins: applyGradientColorsToBins(currentConfig.bins, currentConfig.gradient),
                  }));
                }}
              >
                Apply
              </Button>
            </section>

            <section className="flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2">
              <span className="text-sm font-medium">No data</span>
              <Input
                id="experimental-bins-no-data-label"
                value={presetConfig.noData.label}
                onChange={(event) =>
                  applyDraftConfig((currentConfig) => ({
                    ...currentConfig,
                    noData: {
                      ...currentConfig.noData,
                      label: event.currentTarget.value,
                    },
                  }))
                }
                autoComplete="off"
                className="h-7 w-24 text-xs"
              />
              <Input
                id="experimental-bins-no-data-color"
                type="color"
                value={presetConfig.noData.color}
                className="h-7 w-7 cursor-pointer rounded border-0 p-0.5"
                onChange={(event) =>
                  applyDraftConfig((currentConfig) => ({
                    ...currentConfig,
                    noData: {
                      ...currentConfig.noData,
                      color: event.currentTarget.value,
                    },
                  }))
                }
              />
              <div className="ml-auto flex items-center gap-2">
                <Label htmlFor="no-data-tooltip" className="cursor-pointer text-xs text-muted-foreground">
                  Show in tooltip
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

            <section className="rounded-xl border p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Bins</h3>
                <Button type="button" variant="outline" size="sm" onClick={regenerateBins}>
                  Regenerate from active data
                </Button>
              </div>
              <ExperimentalMapBinsList
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
            </section>

            {validationErrors.length > 0 ? (
              <section className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <h4 className="mb-1 text-sm font-semibold text-destructive">Validation errors</h4>
                <div className="space-y-1">
                  {validationErrors.map((errorMessage) => (
                    <p key={errorMessage} className="text-xs text-destructive">
                      {errorMessage}
                    </p>
                  ))}
                </div>
              </section>
            ) : null}

            {inlineError ? <p className="text-sm text-destructive">{inlineError}</p> : null}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDiscardDialogOpen} onOpenChange={setIsDiscardDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard local edits?</AlertDialogTitle>
            <AlertDialogDescription>
              Some local values are invalid. Closing now will discard unsaved local changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setIsDiscardDialogOpen(false);
                setHasInvalidBinDrafts(false);
                setInlineError(null);
                onOpenChange(false);
              }}
            >
              Discard & close
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
            <AlertDialogTitle>Apply gradient colors?</AlertDialogTitle>
            <AlertDialogDescription>
              Switching to gradient mode will overwrite current bin colors using the selected
              gradient anchors.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmGradientOverwrite}>
              Apply gradient
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function cloneBinsPreset(preset: ExperimentalMapBinsPreset): ExperimentalMapBinsPreset {
  return {
    ...preset,
    config: {
      ...preset.config,
      gradient: { ...preset.config.gradient },
      noData: { ...preset.config.noData },
      boundaries: { ...preset.config.boundaries },
      bins: preset.config.bins.map((bin) => ({ ...bin })),
    },
  };
}

function getFiniteValuesArray(values: Map<string, number | undefined> | undefined): number[] {
  if (!values || values.size === 0) {
    return [];
  }

  const result: number[] = [];
  for (const value of values.values()) {
    if (Number.isFinite(value)) {
      result.push(value as number);
    }
  }
  return result;
}
