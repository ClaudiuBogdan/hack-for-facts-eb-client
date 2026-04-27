import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useDebouncedCallback } from '@/lib/hooks/useDebouncedCallback';

export interface DebouncedStatusInputProps extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value' | 'defaultValue'> {
  id?: string;
  value?: string;
  defaultValue?: string;
  debounceMs?: number;
  onImmediateChange?: (value: string) => void;
  onDebouncedChange?: (value: string) => void;
  className?: string;
  inputClassName?: string;
  changingText?: React.ReactNode;
  changedText?: React.ReactNode;
}

export function DebouncedStatusInput({
  id,
  value,
  defaultValue,
  debounceMs = 600,
  onImmediateChange,
  onDebouncedChange,
  className,
  inputClassName,
  changingText = 'Changing…',
  changedText = 'Changed',
  ...rest
}: DebouncedStatusInputProps) {
  const [innerValue, setInnerValue] = React.useState<string>(value ?? defaultValue ?? '');
  const [isChanging, setIsChanging] = React.useState(false);
  const [justChanged, setJustChanged] = React.useState(false);

  // Sync external value changes
  React.useEffect(() => {
    setInnerValue((current) =>
      typeof value === 'string' && value !== current ? value : current
    );
  }, [value]);

  const debouncedCommit = useDebouncedCallback((v: string) => {
    if (onDebouncedChange) onDebouncedChange(v);
    setIsChanging(false);
    setJustChanged(true);
    const t = setTimeout(() => setJustChanged(false), 1000);
    return () => clearTimeout(t);
  }, debounceMs);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInnerValue(v);
    setIsChanging(true);
    onImmediateChange?.(v);
    debouncedCommit(v);
  };

  return (
    <div className={cn('relative', className)}>
      <Input
        id={id}
        value={innerValue}
        onChange={handleChange}
        className={inputClassName}
        {...rest}
      />
      <div className="pointer-events-none absolute left-0 top-full mt-1 text-xs text-muted-foreground opacity-80">
        {isChanging ? changingText : justChanged ? changedText : null}
      </div>
    </div>
  );
}
