import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type {
  ExperimentalMapBinsPreset,
  ExperimentalMapBinsPresetConfig,
} from '@/schemas/experimental-map';
import { applyGradientColorsToBins } from '@/lib/map-bins/bins';
import { ExperimentalMapBinsList } from './experimental-map-bins-list';

interface ExperimentalMapBinsModalProps {
  open: boolean;
  preset: ExperimentalMapBinsPreset | undefined;
  activeSeriesLabel: string;
  validationErrors: string[];
  onOpenChange: (open: boolean) => void;
  onRegenerate: () => void;
  onApplyPreset: (
    nextPreset: ExperimentalMapBinsPreset
  ) => { ok: boolean; error?: string };
}

export function ExperimentalMapBinsModal({
  open,
  preset,
  activeSeriesLabel,
  validationErrors,
  onOpenChange,
  onRegenerate,
  onApplyPreset,
}: Readonly<ExperimentalMapBinsModalProps>) {
  const [defaultBinCountInput, setDefaultBinCountInput] = useState(
    String(preset?.config.defaultBinCount ?? 5)
  );
  const [inlineError, setInlineError] = useState<string | null>(null);

  useEffect(() => {
    setDefaultBinCountInput(String(preset?.config.defaultBinCount ?? 5));
  }, [preset?.config.defaultBinCount]);

  if (!preset) {
    return null;
  }

  const presetConfig = preset.config;

  const applyPreset = (nextPreset: ExperimentalMapBinsPreset): boolean => {
    const result = onApplyPreset(nextPreset);
    if (!result.ok) {
      setInlineError(result.error ?? 'Invalid bins configuration.');
      return false;
    }
    setInlineError(null);
    return true;
  };

  const applyConfig = (nextConfig: ExperimentalMapBinsPresetConfig): boolean => {
    return applyPreset({
      ...preset,
      config: nextConfig,
      updatedAt: new Date().toISOString(),
    });
  };

  const commitDefaultBinCount = () => {
    const parsed = Number(defaultBinCountInput);
    if (!Number.isInteger(parsed) || parsed < 1) {
      setInlineError('Default bin count must be an integer greater than or equal to 1.');
      setDefaultBinCountInput(String(presetConfig.defaultBinCount));
      return;
    }

    applyConfig({
      ...presetConfig,
      defaultBinCount: parsed,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid h-[min(92vh,940px)] w-[min(96vw,1200px)] max-w-5xl grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle>Edit Bins Preset</DialogTitle>
          <DialogDescription>
            Configure bins for this preset. Changes apply immediately while this modal is open.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-6 py-4">
          <section className="rounded-xl border bg-muted/20 p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="experimental-bins-preset-label">Preset label</Label>
                <Input
                  id="experimental-bins-preset-label"
                  value={preset.label}
                  onChange={(event) =>
                    applyPreset({
                      ...preset,
                      label: event.currentTarget.value,
                      updatedAt: new Date().toISOString(),
                    })
                  }
                  autoComplete="off"
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
                  onValueChange={(value) => {
                    applyConfig({
                      ...presetConfig,
                      colorMode: value as ExperimentalMapBinsPresetConfig['colorMode'],
                    });
                  }}
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

              <div className="flex items-center justify-between rounded-lg border bg-background p-3 md:col-span-2">
                <div>
                  <p className="text-sm font-medium">Show bin labels in legend</p>
                  <p className="text-xs text-muted-foreground">
                    When disabled, the legend shows only group IDs and colors.
                  </p>
                </div>
                <Switch
                  checked={presetConfig.showBinLabelOnLegend}
                  onCheckedChange={(checked) =>
                    applyConfig({
                      ...presetConfig,
                      showBinLabelOnLegend: checked,
                    })
                  }
                  aria-label={
                    presetConfig.showBinLabelOnLegend
                      ? 'Hide bin labels in legend'
                      : 'Show bin labels in legend'
                  }
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Gradient</h3>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  applyConfig({
                    ...presetConfig,
                    bins: applyGradientColorsToBins(presetConfig.bins, presetConfig.gradient),
                  });
                }}
              >
                Apply Gradient
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="experimental-bins-gradient-start">Start color</Label>
                <Input
                  id="experimental-bins-gradient-start"
                  type="color"
                  value={presetConfig.gradient.startColor}
                  onChange={(event) =>
                    applyConfig({
                      ...presetConfig,
                      gradient: {
                        ...presetConfig.gradient,
                        startColor: event.currentTarget.value,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experimental-bins-gradient-end">End color</Label>
                <Input
                  id="experimental-bins-gradient-end"
                  type="color"
                  value={presetConfig.gradient.endColor}
                  onChange={(event) =>
                    applyConfig({
                      ...presetConfig,
                      gradient: {
                        ...presetConfig.gradient,
                        endColor: event.currentTarget.value,
                      },
                    })
                  }
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border p-4">
            <h3 className="mb-3 text-sm font-semibold">NO_DATA</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="experimental-bins-no-data-label">Label</Label>
                <Input
                  id="experimental-bins-no-data-label"
                  value={presetConfig.noData.label}
                  onChange={(event) =>
                    applyConfig({
                      ...presetConfig,
                      noData: {
                        ...presetConfig.noData,
                        label: event.currentTarget.value,
                      },
                    })
                  }
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experimental-bins-no-data-color">Color</Label>
                <Input
                  id="experimental-bins-no-data-color"
                  type="color"
                  value={presetConfig.noData.color}
                  onChange={(event) =>
                    applyConfig({
                      ...presetConfig,
                      noData: {
                        ...presetConfig.noData,
                        color: event.currentTarget.value,
                      },
                    })
                  }
                />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-lg border bg-muted/20 p-3">
              <div>
                <p className="text-sm font-medium">Show NO_DATA marker in tooltip</p>
                <p className="text-xs text-muted-foreground">
                  Applies only when active series value is missing.
                </p>
              </div>
              <Switch
                checked={presetConfig.noData.showInTooltip}
                onCheckedChange={(checked) =>
                  applyConfig({
                    ...presetConfig,
                    noData: {
                      ...presetConfig.noData,
                      showInTooltip: checked,
                    },
                  })
                }
              />
            </div>
          </section>

          <section className="rounded-xl border p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Bins</h3>
              <Button type="button" variant="outline" size="sm" onClick={onRegenerate}>
                Regenerate from active data
              </Button>
            </div>
            <ExperimentalMapBinsList
              bins={presetConfig.bins}
              onApplyBins={(nextBins) => {
                const result = onApplyPreset({
                  ...preset,
                  config: {
                    ...presetConfig,
                    bins: nextBins,
                  },
                  updatedAt: new Date().toISOString(),
                });

                if (!result.ok) {
                  setInlineError(result.error ?? 'Invalid bins configuration.');
                  return {
                    ok: false,
                    error: result.error,
                  };
                }

                setInlineError(null);
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
  );
}
