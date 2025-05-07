import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export type AmountRangePickerProps = {
  value: {
    min: number | null;
    max: number | null;
  };
  onChange: (value: { min: number | null; max: number | null }) => void;
  className?: string;
  currency?: string;
  maxAmount?: number;
};

// Format amount to a user-friendly string
const formatAmount = (amount: number | null): string => {
  if (amount === null) return "";

  // Format based on the amount size
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toString();
};

// Parse the user input to a number
const parseAmount = (input: string): number | null => {
  if (!input) return null;

  // Handle M/K suffixes
  if (input.toLowerCase().endsWith("m")) {
    return parseFloat(input.slice(0, -1)) * 1000000;
  }
  if (input.toLowerCase().endsWith("k")) {
    return parseFloat(input.slice(0, -1)) * 1000;
  }

  // Remove any non-numeric characters except decimal point
  const cleanedInput = input.replace(/[^0-9.]/g, "");
  const value = parseFloat(cleanedInput);
  return isNaN(value) ? null : value;
};

export function AmountRangePicker({
  value,
  onChange,
  className,
  currency = "€",
  maxAmount = 10000000, // 10 million default
}: AmountRangePickerProps) {
  // Track the text input values separately to handle formatting
  const [minText, setMinText] = React.useState(
    value.min !== null ? formatAmount(value.min) : ""
  );
  const [maxText, setMaxText] = React.useState(
    value.max !== null ? formatAmount(value.max) : ""
  );

  // Update the input texts when value prop changes
  React.useEffect(() => {
    setMinText(value.min !== null ? formatAmount(value.min) : "");
    setMaxText(value.max !== null ? formatAmount(value.max) : "");
  }, [value.min, value.max]);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMinText(e.target.value);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMaxText(e.target.value);
  };

  // Apply changes when input loses focus
  const handleMinBlur = () => {
    const parsedMin = parseAmount(minText);
    onChange({ ...value, min: parsedMin });
  };

  const handleMaxBlur = () => {
    const parsedMax = parseAmount(maxText);
    onChange({ ...value, max: parsedMax });
  };

  // Handle slider change
  const handleSliderChange = (newValues: number[]) => {
    onChange({
      min: newValues[0] > 0 ? newValues[0] : null,
      max: newValues[1] < maxAmount ? newValues[1] : null,
    });
  };

  // Calculate slider values
  const sliderValues = [
    value.min !== null ? value.min : 0,
    value.max !== null ? value.max : maxAmount,
  ];

  return (
    <div className={cn("grid gap-3", className)}>
      <div className="flex flex-col space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Label htmlFor="min-amount">Minimum</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-2.5 text-muted-foreground">
                {currency}
              </span>
              <Input
                id="min-amount"
                type="text"
                placeholder="No minimum"
                value={minText}
                onChange={handleMinChange}
                onBlur={handleMinBlur}
                className="pl-7"
              />
            </div>
          </div>

          <div className="flex-1">
            <Label htmlFor="max-amount">Maximum</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-2.5 text-muted-foreground">
                {currency}
              </span>
              <Input
                id="max-amount"
                type="text"
                placeholder="No maximum"
                value={maxText}
                onChange={handleMaxChange}
                onBlur={handleMaxBlur}
                className="pl-7"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="px-1 pt-4 pb-2">
        <Slider
          value={sliderValues}
          min={0}
          max={maxAmount}
          step={1000}
          onValueChange={handleSliderChange}
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>{currency}0</span>
          <span>{formatAmount(maxAmount / 4)}</span>
          <span>{formatAmount(maxAmount / 2)}</span>
          <span>{formatAmount((maxAmount * 3) / 4)}</span>
          <span>
            {currency}
            {formatAmount(maxAmount)}
          </span>
        </div>
      </div>
    </div>
  );
}
