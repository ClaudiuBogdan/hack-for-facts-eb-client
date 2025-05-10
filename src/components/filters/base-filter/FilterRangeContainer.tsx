import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FunctionComponent, useMemo, useState } from "react";
import { cn } from "@/lib/utils"; // Your utility for classnames
import { SelectedOptionsDisplay } from "./SelectedOptionsDisplay"; // The new component
import { BaseListFilterProps, OptionItem } from "./interfaces";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface FilterContainerProps {
    rangeComponent: FunctionComponent<BaseListFilterProps>;
    minValue: string | number;
    maxValue: string | number;
    onMinValueChange: (value: string) => void;
    onMaxValueChange: (value: string) => void;
    title: string;
    icon: React.ReactNode;
}


export function FilterRangeContainer({ rangeComponent: RangeComponent, title, icon, minValue, maxValue, onMinValueChange, onMaxValueChange }: FilterContainerProps) {
    // State to manage if all selected items are shown or just the compact view (passed to SelectedOptionsDisplay)
    const [showAllSelected, setShowAllSelected] = useState(false);

    const activeRangeOptions = useMemo(() => {
        const options: OptionItem[] = [];

        if (minValue) {
            options.push({ id: "min", label: `min: ${minValue}` });
        }

        if (maxValue) {
            options.push({ id: "max", label: `max: ${maxValue}` });
        }

        return options;
    }, [minValue, maxValue]);

    const handleClearRange = (option: OptionItem) => {
        if (option.id === "min") {
            onMinValueChange("");
        } else if (option.id === "max") {
            onMaxValueChange("");
        }
    };

    /**
     * Clears all currently selected entity options and resets the compact view state.
     */
    const clearSelection = () => {
        onMinValueChange("");
        onMaxValueChange("");
        setShowAllSelected(false); // Reset view on clear
    };

    return (
        <Card className={cn("w-full max-w-md shadow-none flex flex-col rounded-none")}>
            <Accordion type="single" collapsible className="w-full px-4">
                <AccordionItem value="item-1">
                    <AccordionTrigger>
                        <CardHeader className="flex flex-row items-center gap-2 p-0">
                            <div className="w-4 h-4 mt-1">
                                {icon}
                            </div>
                            <CardTitle>{title}</CardTitle>
                        </CardHeader>
                    </AccordionTrigger>
                    <AccordionContent>
                        <CardContent className={cn("p-0 flex-grow")}>
                            <RangeComponent
                                minValue={minValue}
                                maxValue={maxValue}
                                onMinValueChange={onMinValueChange}
                                onMaxValueChange={onMaxValueChange}
                            />
                        </CardContent>
                    </AccordionContent>

                    <CardFooter className="p-0">
                        <SelectedOptionsDisplay
                            selectedOptions={activeRangeOptions}
                            toggleSelect={handleClearRange}
                            clearSelection={clearSelection}
                            showAllSelected={showAllSelected}
                            setShowAllSelected={setShowAllSelected}
                        />
                    </CardFooter>
                </AccordionItem>
            </Accordion>

        </Card>
    );
}
