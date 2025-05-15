import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FunctionComponent, useMemo, useState } from "react";
import { cn, formatNumberRO } from "@/lib/utils"; // Your utility for classnames
import { SelectedOptionsDisplay } from "./SelectedOptionsDisplay"; // The new component
import { BaseListFilterProps, OptionItem } from "./interfaces";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface FilterContainerProps {
    title: string;
    unit?: string;
    rangeComponent: FunctionComponent<BaseListFilterProps>;
    minValue?: string | number;
    maxValue?: string | number;
    maxValueAllowed?: number;
    onMinValueChange: (value: string | undefined) => void;
    onMaxValueChange: (value: string | undefined) => void;
    icon: React.ReactNode;
}


export function FilterRangeContainer({ rangeComponent: RangeComponent, title, unit, icon, minValue, maxValue, maxValueAllowed, onMinValueChange, onMaxValueChange }: FilterContainerProps) {
    // State to manage if all selected items are shown or just the compact view (passed to SelectedOptionsDisplay)
    const [showAllSelected, setShowAllSelected] = useState(false);

    const activeRangeOptions = useMemo(() => {
        const options: OptionItem[] = [];

        if (minValue !== undefined) {
            options.push({ id: "min", label: `min: ${formatNumberRO(Number(minValue))} ${unit}` });
        }

        if (maxValue !== undefined) {
            options.push({ id: "max", label: `max: ${formatNumberRO(Number(maxValue))} ${unit}` });
        }

        return options;
    }, [minValue, maxValue, unit]);

    const handleClearRange = (option: OptionItem) => {
        if (option.id === "min") {
            onMinValueChange(undefined);
        } else if (option.id === "max") {
            onMaxValueChange(undefined);
        }
    };

    /**
     * Clears all currently selected entity options and resets the compact view state.
     */
    const clearSelection = () => {
        console.log("Clearing range");
        onMinValueChange(undefined);
        onMaxValueChange(undefined);
        setShowAllSelected(false); // Reset view on clear
    };

    return (
        <Card className={cn("w-full max-w-md shadow-none flex flex-col rounded-none")}>
            <Accordion type="single" collapsible className="w-full px-4">
                <AccordionItem value="item-1" className="border-none">
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
                                unit={unit}
                                onMinValueChange={onMinValueChange}
                                onMaxValueChange={onMaxValueChange}
                                maxValueAllowed={maxValueAllowed}
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
