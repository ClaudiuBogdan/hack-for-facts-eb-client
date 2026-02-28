import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculation, Chart, Operation, Series } from '@/schemas/charts';
import { ArrowDown, ArrowUp, Check, PlusCircle, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { applyAlpha } from '../chart-renderer/utils';
import { getContextualOperandLabel, operationIcons, operationLabels } from './utils';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';

interface CalculationEditorProps {
  calculation: Calculation;
  onChange: (calculation: Calculation) => void;
  allSeries: Series[];
  currentSeriesId: string;
  chart?: Pick<Chart, 'config'>;
  validateCalculation?: (calculation: Calculation) => string | null;
  onValidationError?: (message: string) => void;
}

function tryCommitCalculation(
  calculation: Calculation,
  onChange: (calculation: Calculation) => void,
  validateCalculation?: (calculation: Calculation) => string | null,
  onValidationError?: (message: string) => void
) {
  const validationError = validateCalculation?.(calculation);
  if (validationError) {
    onValidationError?.(validationError);
    return;
  }

  onChange(calculation);
}

export function CalculationEditor({
  calculation,
  onChange,
  allSeries,
  currentSeriesId,
  chart,
  validateCalculation,
  onValidationError,
}: Readonly<CalculationEditorProps>) {
  const commitCalculation = (nextCalculation: Calculation) => {
    tryCommitCalculation(nextCalculation, onChange, validateCalculation, onValidationError);
  };

  return (
    <RecursiveCalculation
      calculation={calculation}
      onChange={commitCalculation}
      allSeries={allSeries}
      currentSeriesId={currentSeriesId}
      chart={chart}
      validateCalculation={validateCalculation}
      onValidationError={onValidationError}
    />
  );
}

type RecursiveCalculationProps = {
  calculation: Calculation;
  onChange: (calculation: Calculation) => void;
  allSeries: Series[];
  currentSeriesId: string;
  chart?: Pick<Chart, 'config'>;
  validateCalculation?: (calculation: Calculation) => string | null;
  onValidationError?: (message: string) => void;
} & ControlPanelProps;

function RecursiveCalculation({
  calculation,
  onChange,
  allSeries,
  currentSeriesId,
  chart,
  controls,
  validateCalculation,
  onValidationError,
}: Readonly<RecursiveCalculationProps>) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const availableSeries = useMemo(
    () => allSeries.filter((series) => series.id !== currentSeriesId),
    [allSeries, currentSeriesId]
  );

  const commitCalculation = (nextCalculation: Calculation) => {
    tryCommitCalculation(nextCalculation, onChange, validateCalculation, onValidationError);
  };

  const handleOpChange = (op: Operation) => {
    commitCalculation({ ...calculation, op });
  };

  const handleAddSeries = (operand: string) => {
    const newArgs = [...calculation.args, operand];
    commitCalculation({ ...calculation, args: newArgs });
    setIsPopoverOpen(false);
  };

  const handleAddNestedCalculation = () => {
    const newNestedCalculation: Calculation = { op: 'sum', args: [] };
    const newArgs = [...calculation.args, newNestedCalculation];
    commitCalculation({ ...calculation, args: newArgs });
  };

  const handleMoveOperand = (index: number, direction: 'up' | 'down') => {
    const newArgs = [...calculation.args];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newArgs.length) {
      return;
    }

    [newArgs[index], newArgs[targetIndex]] = [newArgs[targetIndex], newArgs[index]];
    commitCalculation({ ...calculation, args: newArgs });
  };

  const handleOperandChange = (index: number, newOperand: Calculation | number) => {
    const newArgs = [...calculation.args];
    newArgs[index] = newOperand;
    commitCalculation({ ...calculation, args: newArgs });
  };

  const handleRemoveOperand = (index: number) => {
    const newArgs = calculation.args.filter((_, currentIndex) => currentIndex !== index);
    commitCalculation({ ...calculation, args: newArgs });
  };

  return (
    <div className="bg-muted/30 p-4 rounded-lg border space-y-4 overflow-x-auto">
      <div className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={calculation.op} onValueChange={handleOpChange}>
            <SelectTrigger className="w-[150px] bg-background/50">
              <SelectValue placeholder={t`Select operation`} />
            </SelectTrigger>
            <SelectContent>
              {['sum', 'subtract', 'multiply', 'divide'].map((operation) => (
                <SelectItem key={operation} value={operation}>
                  <div className="flex items-center gap-2">
                    {operationIcons[operation as Operation]}
                    <span>{operationLabels[operation as Operation]}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 bg-background/50">
                  <PlusCircle className="h-4 w-4" /> <Trans>Add Series</Trans>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandEmpty>
                    <Trans>No series found.</Trans>
                  </CommandEmpty>
                  <CommandGroup>
                    {availableSeries.map((series) => (
                      <CommandItem key={series.id} value={series.id} onSelect={handleAddSeries}>
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            calculation.args.includes(series.id) ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {series.label || series.id}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-background/50"
              onClick={() => commitCalculation({ ...calculation, args: [...calculation.args, 0] })}
            >
              <PlusCircle className="h-4 w-4" /> <Trans>Add Number</Trans>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-background/50"
              onClick={handleAddNestedCalculation}
            >
              <PlusCircle className="h-4 w-4" /> <Trans>Add Calculation</Trans>
            </Button>
          </div>
        </div>
        <ControlPanel controls={controls} forceVisible />
      </div>

      <div className="space-y-3 pl-4 border-l-2 ml-2">
        {calculation.args.length > 0 ? (
          calculation.args.map((arg, index) => {
            const operandLabel = getContextualOperandLabel(calculation.op, index);
            const seriesOperand = typeof arg === 'string' ? allSeries.find((series) => series.id === arg) : null;

            const currentControls = {
              canMoveUp: index > 0,
              canMoveDown: index < calculation.args.length - 1,
              onMoveUp: () => handleMoveOperand(index, 'up'),
              onMoveDown: () => handleMoveOperand(index, 'down'),
              onRemove: () => handleRemoveOperand(index),
            };

            return (
              <div key={index} className="flex items-center gap-4">
                <div>
                  <div className={cn('w-16 h-[2px] bg-border -ml-4', operandLabel && 'w-4')} />
                </div>
                {operandLabel ? (
                  <div className="text-sm text-muted-foreground w-20 text-left font-medium">{operandLabel}</div>
                ) : null}
                <div className="flex-grow">
                  {seriesOperand ? (
                    <SeriesOperand series={seriesOperand} chart={chart} controls={currentControls} />
                  ) : typeof arg === 'number' ? (
                    <NumberOperand
                      value={arg}
                      onChange={(newValue) => handleOperandChange(index, newValue)}
                      controls={currentControls}
                    />
                  ) : typeof arg !== 'string' ? (
                    <RecursiveCalculation
                      calculation={arg}
                      onChange={(newCalculation) => handleOperandChange(index, newCalculation)}
                      allSeries={allSeries}
                      currentSeriesId={currentSeriesId}
                      chart={chart}
                      controls={currentControls}
                      validateCalculation={validateCalculation}
                      onValidationError={onValidationError}
                    />
                  ) : (
                    <NotFoundSeries seriesId={arg} controls={currentControls} />
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-sm text-muted-foreground text-center py-4">
            <Trans>No operands. Add a series or a new calculation.</Trans>
          </div>
        )}
      </div>
    </div>
  );
}

type NotFoundSeriesProps = {
  seriesId: string;
} & ControlPanelProps;

function NotFoundSeries({ seriesId, controls }: Readonly<NotFoundSeriesProps>) {
  const idPrefix = seriesId.substring(0, 6);
  return (
    <div className="group text-destructive p-2 flex items-center justify-between gap-4 border border-destructive/50 rounded-lg bg-destructive/10">
      <span>
        <Trans>Error: Series not found</Trans> {idPrefix}...
      </span>
      <ControlPanel controls={controls} />
    </div>
  );
}

type SeriesOperandProps = {
  series: Series;
  chart?: Pick<Chart, 'config'>;
} & ControlPanelProps;

function SeriesOperand({ series, chart, controls }: Readonly<SeriesOperandProps>) {
  const color = series.config.color || chart?.config.color || '#0000ff';
  const label = series.label || t`Untitled Series`;
  const idPrefix = series.id.substring(0, 6);

  return (
    <div
      className="group flex items-center justify-between p-2 pl-4 border rounded-lg bg-background w-full"
      style={{ backgroundColor: applyAlpha(color, 0.1) }}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="text-sm font-medium truncate" title={label}>
          {label}
        </span>
        <span className="text-xs text-muted-foreground">[id::{idPrefix}...]</span>
      </div>
      <ControlPanel controls={controls} />
    </div>
  );
}

interface ControlPanelProps {
  controls?: {
    canMoveUp: boolean;
    canMoveDown: boolean;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onRemove: () => void;
  };
  forceVisible?: boolean;
}

function ControlPanel({ controls, forceVisible }: Readonly<ControlPanelProps>) {
  if (!controls) return null;

  return (
    <div
      className={cn(
        'flex items-center flex-shrink-0 group-hover:opacity-100 transition-opacity mx-2',
        forceVisible ? 'opacity-100' : 'opacity-0'
      )}
    >
      <Button variant="ghost" size="icon" onClick={controls.onMoveUp} disabled={!controls.canMoveUp}>
        <ArrowUp className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={controls.onMoveDown} disabled={!controls.canMoveDown}>
        <ArrowDown className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={controls.onRemove} className="flex-shrink-0">
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

type NumberOperandProps = {
  value: number;
  onChange: (value: number) => void;
} & ControlPanelProps;

function NumberOperand({ value, onChange, controls }: Readonly<NumberOperandProps>) {
  return (
    <div className="group flex items-center justify-between p-2 pl-4 border rounded-lg bg-background w-full">
      <Input
        type="number"
        value={value}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
          onChange(Number(event.target.value))
        }
        className="w-full"
      />
      <ControlPanel controls={controls} />
    </div>
  );
}
