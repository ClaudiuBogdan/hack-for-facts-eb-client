import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FunctionComponent, useState } from "react";
import { cn } from "@/lib/utils"; // Your utility for classnames
import { SelectedOptionsDisplay } from "./SelectedOptionsDisplay"; // The new component
import { OptionItem } from "./interfaces";

// These constants are primarily used within SelectedOptionsDisplay,
// but knowing them helps understand the logic in toggleSelect.
const VISIBLE_BADGES_COUNT_IN_DISPLAY = 1; // Corresponds to VISIBLE_BADGES_COUNT in SelectedOptionsDisplay
const MIN_ITEMS_FOR_COMPACT_VIEW_IN_DISPLAY = VISIBLE_BADGES_COUNT_IN_DISPLAY + 1;

interface FilterContainerProps {
    listComponent: FunctionComponent<{
        selectedOptions: OptionItem[],
        toggleSelect: (option: OptionItem) => void,
        pageSize: number
    }>;
    selected: OptionItem[];
    setSelected: (cb: (prev: OptionItem[]) => OptionItem[]) => void;
    title: string;
    icon: React.ReactNode;
}


export function FilterContainer({ listComponent: ListComponent, title, icon, selected, setSelected }: FilterContainerProps) {
    // State to manage if all selected items are shown or just the compact view (passed to SelectedOptionsDisplay)
    const [showAllSelected, setShowAllSelected] = useState(false);

    /**
     * Toggles the selection state of an entity option.
     * If the option is already selected, it's removed. Otherwise, it's added.
     * Also handles collapsing the "Show all" view if the number of items drops below the threshold.
     * @param option - The entity option to toggle.
     */
    const toggleSelect = (option: OptionItem) => {
        setSelected((prev: OptionItem[]) => {
            const isAlreadySelected = prev.some(o => o.id === option.id);
            let newSelectedArray;

            if (isAlreadySelected) {
                newSelectedArray = prev.filter(o => o.id !== option.id);
                // If removing an item makes the list small enough that the "Show all/less"
                // button in SelectedOptionsDisplay would no longer be relevant,
                // reset the showAllSelected state to false to ensure a consistent UI.
                if (newSelectedArray.length <= MIN_ITEMS_FOR_COMPACT_VIEW_IN_DISPLAY) {
                    setShowAllSelected(false);
                }
            } else {
                newSelectedArray = [...prev, option];
            }
            return newSelectedArray;
        });
    };

    /**
     * Clears all currently selected entity options and resets the compact view state.
     */
    const clearSelection = () => {
        setSelected(() => []);
        setShowAllSelected(false); // Reset view on clear
    };

    return (
        <Card className={cn("w-full max-w-md shadow-none flex flex-col rounded-none")}>
            <CardHeader className="pb-0 flex flex-row gap-2">
                <div className="w-4 h-4">
                    {icon}
                </div>
                <CardTitle>{title}</CardTitle>
            </CardHeader>

            <CardContent className={cn("p-0 md:p-4 pt-0 flex-grow")}>
                <ListComponent
                    selectedOptions={selected}
                    toggleSelect={toggleSelect}
                    pageSize={100} // Default page size
                />
            </CardContent>
            <CardFooter>
                <SelectedOptionsDisplay
                    selectedOptions={selected}
                    toggleSelect={toggleSelect}
                    clearSelection={clearSelection}
                    showAllSelected={showAllSelected}
                    setShowAllSelected={setShowAllSelected}
                />
            </CardFooter>
        </Card>
    );
}
