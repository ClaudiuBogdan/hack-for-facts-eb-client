import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BaseListFilterProps } from "../base-filter/interfaces";

export function AmountRangeFilter({
    minValue,
    maxValue,
    unit,
    onMinValueChange,
    onMaxValueChange,
    className
}: BaseListFilterProps) {
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
                        value={minValue || ""}
                        onChange={(e) => onMinValueChange(e.target.value)}
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
                        value={maxValue || ""}
                        onChange={(e) => onMaxValueChange(e.target.value)}
                        className="w-full pr-16"
                    />
                    {unit && <span className="absolute right-3 text-gray-500">{unit}</span>}
                </div>
            </div>
        </div>
    );
} 