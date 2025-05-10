import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ListOptionProps {
    onClick: () => void;
    label: string;
    uniqueIdPart: string;
    selected: boolean;
    optionHeight: number;
    optionStart: number;
    className?: string;
}

export function ListOption({
    onClick,
    label,
    uniqueIdPart,
    selected,
    optionHeight,
    optionStart,
    className
}: ListOptionProps) {
    const checkboxId = `filter-option-${uniqueIdPart}`;

    return (
        <div
            className={cn(
                "flex items-center absolute top-0 left-0 w-full transition-colors duration-150 ease-in-out",
                "border-b border-border",
                "hover:bg-accent hover:text-accent-foreground",
                selected && "bg-muted",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                className
            )}
            style={{
                height: `${optionHeight}px`,
                transform: `translateY(${optionStart}px)`,
            }}
            onClick={onClick}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
            role="option"
            aria-selected={selected}
            tabIndex={0}
        >
            <div className="flex items-center w-full px-3 py-2 cursor-pointer">
                <Checkbox
                    id={checkboxId}
                    checked={selected}
                    onCheckedChange={onClick}
                    className="mr-3 shrink-0"
                    aria-labelledby={`${checkboxId}-label`}
                    tabIndex={-1}
                />
                <Label
                    htmlFor={checkboxId}
                    id={`${checkboxId}-label`}
                    title={label}
                    className="text-xs leading-snug cursor-pointer select-none line-clamp-3"
                >
                    {label}
                </Label>
            </div>
        </div>
    );
}