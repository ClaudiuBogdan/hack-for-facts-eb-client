import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ElementType } from "react";

type ViewOption<T extends string> = { id: T, label: string, icon?: ElementType }

interface ViewTypeRadioGroupProps<T extends string> {
    value: T;
    onChange: (value: T) => void;
    viewOptions: ViewOption<T>[];
    ariaLabel?: string;
    ariaLabelledby?: string;
}

export function ViewTypeRadioGroup<T extends string>({ value, onChange, viewOptions, ariaLabel, ariaLabelledby }: ViewTypeRadioGroupProps<T>) {
    return (
        <RadioGroup
            value={value}
            onValueChange={(val) => onChange(val as T)}
            className="flex border-b border-border"
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledby}
        >
            {viewOptions.map(option => {
                const isSelected = value === option.id;
                const Icon = option.icon;
                return (
                    <Label
                        key={option.id}
                        htmlFor={`view-type-${option.id}`}
                        className={cn(
                            "flex-1 text-center px-2 py-2 cursor-pointer text-sm font-medium transition-colors flex items-center justify-center gap-2 border-b-2 -mb-px has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-ring has-[:focus-visible]:rounded-sm",
                            isSelected
                                ? "border-foreground text-foreground"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <RadioGroupItem
                            value={option.id}
                            id={`view-type-${option.id}`}
                            className="sr-only"
                        />
                        {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
                        {option.label}
                    </Label>
                );
            })}
        </RadioGroup>
    );
}
