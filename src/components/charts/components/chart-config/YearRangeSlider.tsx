import * as React from 'react';
import { Trans } from '@lingui/react/macro';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useDebouncedCallback } from '@/lib/hooks/useDebouncedCallback';

interface YearRangeSliderProps {
  value: [number, number];
  onChange: (value: [number, number]) => void;
  min: number;
  max: number;
}

export const YearRangeSlider = ({ value, onChange, min, max }: YearRangeSliderProps) => {
  const [localValue, setLocalValue] = React.useState(value);

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const debouncedOnChange = useDebouncedCallback<[[number, number]]>((val) => onChange(val), 500);

  const handleValueChange = (newValue: number[]) => {
    const newRange = newValue as [number, number];
    setLocalValue(newRange);
    debouncedOnChange(newRange);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label><Trans>Year Range</Trans></Label>
        <span className="text-sm text-muted-foreground">
          {localValue[0]} - {localValue[1]}
        </span>
      </div>
      <Slider
        value={localValue}
        onValueChange={handleValueChange}
        min={min}
        max={max}
        step={1}
      />
    </div>
  );
};
