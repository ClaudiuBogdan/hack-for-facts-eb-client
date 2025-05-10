import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BaseListFilterProps } from "../base-filter/interfaces";

export function AmountRangeFilter({
    minValue,
    maxValue,
    onMinValueChange,
    onMaxValueChange,
    className
}: BaseListFilterProps) {
    return (
        <div className={cn("w-full flex flex-col space-y-3 py-4", className)}>
            <div className="flex flex-col space-y-1.5">
                <Label htmlFor="minAmount">Min Amount</Label>
                <Input
                    type="number"
                    id="minAmount"
                    placeholder="Enter min amount"
                    value={minValue}
                    onChange={(e) => onMinValueChange(e.target.value)}
                    className="w-full"
                />
            </div>
            <div className="flex flex-col space-y-1.5">
                <Label htmlFor="maxAmount">Max Amount</Label>
                <Input
                    type="number"
                    id="maxAmount"
                    placeholder="Enter max amount"
                    value={maxValue}
                    onChange={(e) => onMaxValueChange(e.target.value)}
                    className="w-full"
                />
            </div>
        </div>
    );
} 