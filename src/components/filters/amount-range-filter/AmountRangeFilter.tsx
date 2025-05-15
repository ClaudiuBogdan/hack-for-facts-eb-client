import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BaseListFilterProps } from "../base-filter/interfaces";
import { useDebouncedCallback } from "@/lib/hooks/useDebouncedCallback";
import { useEffect, useState } from "react";

export function AmountRangeFilter({
    minValue: initialMinValue,
    maxValue: initialMaxValue,
    unit,
    onMinValueChange,
    onMaxValueChange,
    className
}: BaseListFilterProps) {

    const [localMinValue, setLocalMinValue] = useState<string | undefined>(initialMinValue?.toString());
    const [localMaxValue, setLocalMaxValue] = useState<string | undefined>(initialMaxValue?.toString());

    // Update the local values when the values are removed from the filter
    useEffect(() => {
        setLocalMinValue(initialMinValue?.toString());
        setLocalMaxValue(initialMaxValue?.toString());
    }, [initialMinValue, initialMaxValue]);

    const debouncedMinValueChange = useDebouncedCallback((value: string | undefined) => {
        if (value === "") {
            onMinValueChange(undefined);
        } else {
            onMinValueChange(value);
        }
    }, 1000);

    const debouncedMaxValueChange = useDebouncedCallback((value: string | undefined) => {
        if (value === "") {
            onMaxValueChange(undefined);
        } else {
            onMaxValueChange(value);
        }
    }, 1000);

    const handleMinValueChange = (value: string) => {
        setLocalMinValue(value);
        debouncedMinValueChange(value);
    }

    const handleMaxValueChange = (value: string) => {
        setLocalMaxValue(value);
        debouncedMaxValueChange(value);
    }
    return (
        <div className={cn("w-full flex flex-col space-y-3 py-4", className)}>
            <div className="flex flex-col space-y-1.5">
                <Label htmlFor="minAmount">Valoare Minima</Label>
                <div className="relative flex items-center px-[1px]">
                    <Input
                        type="number"
                        id="minAmount"
                        min={0}
                        step={1000}
                        placeholder="Ex: 2000"
                        value={localMinValue || ""}
                        onChange={(e) => handleMinValueChange(e.target.value)}
                        className="w-full pr-16"
                    />
                    {unit && <span className="absolute right-3 text-gray-500">{unit}</span>}
                </div>
            </div>
            <div className="flex flex-col space-y-1.5">
                <Label htmlFor="maxAmount">Valoare Maxima</Label>
                <div className="relative flex items-center px-[1px]">
                    <Input
                        type="number"
                        min={0}
                        step={1000}
                        id="maxAmount"
                        placeholder="Ex: 4000"
                        value={localMaxValue || ""}
                        onChange={(e) => handleMaxValueChange(e.target.value)}
                        className="w-full pr-16"
                    />
                    {unit && <span className="absolute right-3 text-gray-500">{unit}</span>}
                </div>
            </div>
        </div>
    );
} 