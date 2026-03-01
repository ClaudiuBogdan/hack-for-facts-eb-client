import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getDefaultBinTitle } from '@/lib/map-bins/bins';
import {
  createUniqueAdvancedMapAnalyticsId,
  type AdvancedMapAnalyticsBin,
} from '@/schemas/advanced-map-analytics';

interface AdvancedMapAnalyticsBinsListProps {
  bins: AdvancedMapAnalyticsBin[];
  onApplyBins: (nextBins: AdvancedMapAnalyticsBin[]) => { ok: boolean; error?: string };
  onInvalidDraftStateChange?: (hasInvalidDrafts: boolean) => void;
}

export function AdvancedMapAnalyticsBinsList({
  bins,
  onApplyBins,
  onInvalidDraftStateChange,
}: Readonly<AdvancedMapAnalyticsBinsListProps>) {
  const [minInputs, setMinInputs] = useState<Record<number, string>>({});
  const [maxInputs, setMaxInputs] = useState<Record<number, string>>({});
  const [inlineError, setInlineError] = useState<string | null>(null);

  const rowCount = bins.length;

  const minValues = useMemo(
    () =>
      bins.map((bin, index) =>
        Object.prototype.hasOwnProperty.call(minInputs, index) ? minInputs[index] ?? '' : String(bin.min)
      ),
    [bins, minInputs]
  );

  const maxValues = useMemo(
    () =>
      bins.map((bin, index) => {
        if (bin.max === null) {
          return '';
        }
        return Object.prototype.hasOwnProperty.call(maxInputs, index)
          ? maxInputs[index] ?? ''
          : String(bin.max);
      }),
    [bins, maxInputs]
  );

  const commit = (nextBins: AdvancedMapAnalyticsBin[]): boolean => {
    const result = onApplyBins(nextBins);
    if (!result.ok) {
      setInlineError(result.error ?? 'Invalid bins configuration.');
      return false;
    }
    setInlineError(null);
    return true;
  };

  const commitMinValue = (index: number) => {
    const rawValue = minValues[index];
    if (rawValue === undefined) {
      return;
    }

    if (rawValue.trim().length === 0) {
      setInlineError(`Bin ${index + 1} min must be a finite number.`);
      return;
    }

    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      setInlineError(`Bin ${index + 1} min must be a finite number.`);
      return;
    }

    const nextBins = bins.map((bin, currentIndex) =>
      currentIndex === index ? { ...bin, min: parsed } : bin
    );
    if (!commit(nextBins)) {
      return;
    }

    setMinInputs((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const commitMaxValue = (index: number) => {
    const bin = bins[index];
    if (!bin || bin.max === null) {
      return;
    }

    const rawValue = maxValues[index];
    if (rawValue === undefined || rawValue.trim().length === 0) {
      setInlineError(`Bin ${index + 1} max must be a finite number.`);
      return;
    }

    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      setInlineError(`Bin ${index + 1} max must be a finite number.`);
      return;
    }

    const nextBins = bins.map((entry, currentIndex) =>
      currentIndex === index ? { ...entry, max: parsed } : entry
    );
    if (!commit(nextBins)) {
      return;
    }

    setMaxInputs((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const addBin = () => {
    // Create a new unique bin ID. Prevents duplicate IDs when adding multiple bins.
    const existingBinIds = bins.map((bin) => bin.id);
    const nextBinId = createUniqueAdvancedMapAnalyticsId(existingBinIds);

    if (bins.length === 0) {
      const added = commit([
        {
          id: nextBinId,
          min: 0,
          max: null,
          label: getDefaultBinTitle(0),
          color: '#d95f0e',
        },
      ]);
      if (!added) {
        return;
      }
      return;
    }

    const lastIndex = bins.length - 1;
    const lastBin = bins[lastIndex];
    if (!lastBin) {
      return;
    }

    const nextMin = lastBin.max === null ? lastBin.min + 1 : lastBin.max;
    const previousLast = {
      ...lastBin,
      max: nextMin,
    };

    const nextBins = [
      ...bins.slice(0, lastIndex),
      previousLast,
      {
        id: nextBinId,
        min: nextMin,
        max: null,
        label: getDefaultBinTitle(bins.length),
        color: lastBin.color,
      },
    ];
    commit(nextBins);
  };

  const removeBin = (index: number) => {
    if (bins.length <= 1) {
      setInlineError('At least one bin is required.');
      return;
    }

    let nextBins = bins.filter((_, currentIndex) => currentIndex !== index);
    if (nextBins.length > 0) {
      const lastIndex = nextBins.length - 1;
      const lastBin = nextBins[lastIndex];
      if (lastBin && lastBin.max !== null) {
        nextBins = nextBins.map((bin, currentIndex) =>
          currentIndex === lastIndex
            ? {
                ...bin,
                max: null,
              }
            : bin
        );
      }
    }
    commit(nextBins);
  };

  const moveBin = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= bins.length) {
      return;
    }

    const reordered = bins.map((bin) => ({ ...bin }));
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    const lastIndex = reordered.length - 1;
    const normalizedBins = reordered.map((bin, currentIndex) => {
      if (currentIndex === lastIndex) {
        return {
          ...bin,
          max: null,
        };
      }

      if (bin.max === null) {
        return {
          ...bin,
          max: bin.min + 1,
        };
      }

      return bin;
    });

    commit(normalizedBins);
  };

  const toggleEnabled = (index: number, enabled: boolean) => {
    const nextBins = bins.map((entry, currentIndex) =>
      currentIndex === index
        ? {
            ...entry,
            disabled: enabled ? undefined : true,
          }
        : entry
    );
    commit(nextBins);
  };

  const hasInvalidNumberDrafts = useMemo(() => {
    for (const [indexKey, rawValue] of Object.entries(minInputs)) {
      const index = Number(indexKey);
      if (!Number.isFinite(index)) {
        continue;
      }
      if (rawValue.trim().length === 0 || !Number.isFinite(Number(rawValue))) {
        return true;
      }
    }

    for (const [indexKey, rawValue] of Object.entries(maxInputs)) {
      const index = Number(indexKey);
      if (!Number.isFinite(index)) {
        continue;
      }
      const bin = bins[index];
      if (!bin || bin.max === null) {
        continue;
      }
      if (rawValue.trim().length === 0 || !Number.isFinite(Number(rawValue))) {
        return true;
      }
    }

    return false;
  }, [bins, maxInputs, minInputs]);

  const hasInvalidDrafts = hasInvalidNumberDrafts || Boolean(inlineError);

  useEffect(() => {
    onInvalidDraftStateChange?.(hasInvalidDrafts);
  }, [hasInvalidDrafts, onInvalidDraftStateChange]);

  const commitMinOnEnter = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key !== 'Enter') {
      return;
    }
    event.preventDefault();
    commitMinValue(index);
  };

  const commitMaxOnEnter = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key !== 'Enter') {
      return;
    }
    event.preventDefault();
    commitMaxValue(index);
  };

  return (
    <TooltipProvider>
      <div className="space-y-2">
        {bins.map((bin, index) => {
          const isLast = index === rowCount - 1;
          const isEnabled = bin.disabled !== true;
          return (
            <div
              key={bin.id}
              className={`group relative flex items-start gap-0 rounded-lg border transition-all ${
                !isEnabled
                  ? 'border-border/40 bg-muted/30 opacity-60'
                  : 'border-border/60 bg-background hover:border-border'
              }`}
            >
              {/* Color indicator strip */}
              <div
                className="h-full w-2 shrink-0 self-stretch rounded-l-lg"
                style={{ backgroundColor: bin.color }}
              />

              {/* Content area */}
              <div className="flex flex-1 flex-col gap-2 px-3 py-2">
                {/* Row 1: Color, Label, Actions */}
                <div className="flex items-center gap-3">
                  {/* Color picker */}
                  <Input
                    id={`bin-color-${index}`}
                    type="color"
                    value={bin.color}
                    className="h-8 w-8 shrink-0 cursor-pointer rounded border-0 p-0.5"
                    onChange={(event) => {
                      setInlineError(null);
                      const nextBins = bins.map((entry, currentIndex) =>
                        currentIndex === index ? { ...entry, color: event.currentTarget.value } : entry
                      );
                      commit(nextBins);
                    }}
                  />

                  {/* Label input */}
                  <Input
                    id={`bin-label-${index}`}
                    value={bin.label}
                    onChange={(event) => {
                      setInlineError(null);
                      const nextBins = bins.map((entry, currentIndex) =>
                        currentIndex === index ? { ...entry, label: event.currentTarget.value } : entry
                      );
                      commit(nextBins);
                    }}
                    placeholder="Label"
                    autoComplete="off"
                    className="h-8 flex-1 text-sm"
                  />

                  {/* Actions */}
                  <div className="flex items-center gap-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => toggleEnabled(index, !isEnabled)}
                          aria-label={isEnabled ? 'Disable bin' : 'Enable bin'}
                        >
                          {isEnabled ? (
                            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {isEnabled ? 'Disable bin' : 'Enable bin'}
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => moveBin(index, 'up')}
                          disabled={index === 0}
                          aria-label="Move up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Move up</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => moveBin(index, 'down')}
                          disabled={index === rowCount - 1}
                          aria-label="Move down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Move down</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => removeBin(index)}
                          aria-label="Delete bin"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Delete</TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {/* Row 2: Min, Max */}
                <div className="flex items-center gap-3 pl-11">
                  {/* Min input */}
                  <div className="w-32">
                    <Input
                      id={`bin-min-${index}`}
                      value={minValues[index] ?? ''}
                      onChange={(event) => {
                        setInlineError(null);
                        const nextValue = event.currentTarget.value;
                        setMinInputs((prev) => ({ ...prev, [index]: nextValue }));
                      }}
                      onBlur={() => commitMinValue(index)}
                      onKeyDown={(event) => commitMinOnEnter(event, index)}
                      type="number"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="Min"
                      className="h-7 text-xs"
                    />
                  </div>

                  {/* Max input or indicator */}
                  <div className="w-32">
                    {isLast ? (
                      <div className="flex h-7 items-center justify-center rounded-md border border-dashed border-border/50 bg-muted/30 px-2 text-xs text-muted-foreground">
                        Open
                      </div>
                    ) : (
                      <Input
                        id={`bin-max-${index}`}
                        value={maxValues[index] ?? ''}
                        onChange={(event) => {
                          setInlineError(null);
                          const nextValue = event.currentTarget.value;
                          setMaxInputs((prev) => ({ ...prev, [index]: nextValue }));
                        }}
                        onBlur={() => commitMaxValue(index)}
                        onKeyDown={(event) => commitMaxOnEnter(event, index)}
                        type="number"
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder="Max"
                        className="h-7 text-xs"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div className="flex items-center justify-between pt-2">
          <Button type="button" variant="outline" size="sm" onClick={addBin}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add bin
          </Button>
          <span className="text-xs text-muted-foreground">{bins.length} bins</span>
        </div>

        {inlineError ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {inlineError}
          </p>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
