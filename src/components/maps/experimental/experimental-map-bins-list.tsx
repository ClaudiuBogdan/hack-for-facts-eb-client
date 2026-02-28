import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ExperimentalMapBin } from '@/schemas/experimental-map';

interface ExperimentalMapBinsListProps {
  bins: ExperimentalMapBin[];
  onApplyBins: (nextBins: ExperimentalMapBin[]) => { ok: boolean; error?: string };
}

export function ExperimentalMapBinsList({ bins, onApplyBins }: Readonly<ExperimentalMapBinsListProps>) {
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

  const commit = (nextBins: ExperimentalMapBin[]): boolean => {
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
      setMinInputs((prev) => ({ ...prev, [index]: String(bins[index]?.min ?? 0) }));
      return;
    }

    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      setInlineError(`Bin ${index + 1} min must be a finite number.`);
      setMinInputs((prev) => ({ ...prev, [index]: String(bins[index]?.min ?? 0) }));
      return;
    }

    const nextBins = bins.map((bin, currentIndex) =>
      currentIndex === index ? { ...bin, min: parsed } : bin
    );
    if (!commit(nextBins)) {
      setMinInputs((prev) => ({ ...prev, [index]: String(bins[index]?.min ?? parsed) }));
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
      setMaxInputs((prev) => ({ ...prev, [index]: String(bin.max ?? '') }));
      return;
    }

    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      setInlineError(`Bin ${index + 1} max must be a finite number.`);
      setMaxInputs((prev) => ({ ...prev, [index]: String(bin.max ?? '') }));
      return;
    }

    const nextBins = bins.map((entry, currentIndex) =>
      currentIndex === index ? { ...entry, max: parsed } : entry
    );
    if (!commit(nextBins)) {
      setMaxInputs((prev) => ({ ...prev, [index]: String(bin.max ?? parsed) }));
      return;
    }

    setMaxInputs((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const addBin = () => {
    if (bins.length === 0) {
      const added = commit([
        {
          min: 0,
          max: null,
          label: '>= 0',
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
      label: `${formatNumberLabel(lastBin.min)} - ${formatNumberLabel(nextMin)}`,
    };

    const nextBins = [
      ...bins.slice(0, lastIndex),
      previousLast,
      {
        min: nextMin,
        max: null,
        label: `>= ${formatNumberLabel(nextMin)}`,
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
                label: bin.label.trim().length > 0 ? bin.label : `>= ${formatNumberLabel(bin.min)}`,
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
          label: bin.label.trim().length === 0 ? `>= ${formatNumberLabel(bin.min)}` : bin.label,
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

  return (
    <div className="space-y-3">
      {bins.map((bin, index) => {
        const isLast = index === rowCount - 1;
        return (
          <div key={`${index}-${bin.min}-${bin.max ?? 'null'}`} className="rounded-lg border bg-muted/20 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Bin {index + 1}</p>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveBin(index, 'up')}
                  disabled={index === 0}
                  aria-label="Move bin up"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveBin(index, 'down')}
                  disabled={index === rowCount - 1}
                  aria-label="Move bin down"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => removeBin(index)}
                  aria-label="Delete bin"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`bin-min-${index}`}>Min</Label>
                <Input
                  id={`bin-min-${index}`}
                  value={minValues[index] ?? ''}
                  onChange={(event) =>
                    setMinInputs((prev) => ({ ...prev, [index]: event.currentTarget.value }))
                  }
                  onBlur={() => commitMinValue(index)}
                  type="number"
                  inputMode="decimal"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`bin-max-${index}`}>Max</Label>
                {isLast ? (
                  <div className="flex h-10 items-center rounded-md border border-input bg-background px-3 text-sm text-muted-foreground">
                    Open-ended (required)
                  </div>
                ) : (
                  <Input
                    id={`bin-max-${index}`}
                    value={maxValues[index] ?? ''}
                    onChange={(event) =>
                      setMaxInputs((prev) => ({ ...prev, [index]: event.currentTarget.value }))
                    }
                    onBlur={() => commitMaxValue(index)}
                    type="number"
                    inputMode="decimal"
                    autoComplete="off"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`bin-label-${index}`}>Label</Label>
                <Input
                  id={`bin-label-${index}`}
                  value={bin.label}
                  onChange={(event) => {
                    const nextBins = bins.map((entry, currentIndex) =>
                      currentIndex === index ? { ...entry, label: event.currentTarget.value } : entry
                    );
                    commit(nextBins);
                  }}
                  placeholder={isLast ? `>= ${formatNumberLabel(bin.min)}` : 'Range label'}
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`bin-color-${index}`}>Color</Label>
                <Input
                  id={`bin-color-${index}`}
                  type="color"
                  value={bin.color}
                  onChange={(event) => {
                    const nextBins = bins.map((entry, currentIndex) =>
                      currentIndex === index ? { ...entry, color: event.currentTarget.value } : entry
                    );
                    commit(nextBins);
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={addBin}>
          <Plus className="mr-2 h-4 w-4" />
          Add bin
        </Button>
        <span className="text-xs text-muted-foreground">{bins.length} bins configured</span>
      </div>

      {inlineError ? <p className="text-sm text-destructive">{inlineError}</p> : null}
    </div>
  );
}

function formatNumberLabel(value: number): string {
  return new Intl.NumberFormat('ro-RO', {
    maximumFractionDigits: 2,
  }).format(value);
}
