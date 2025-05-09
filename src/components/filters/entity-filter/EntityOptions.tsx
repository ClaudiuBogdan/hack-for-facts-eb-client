import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MultiSelectInfinite } from "./MultiSelectInfinite"; // Your existing component
import { useState } from "react";
import { cn } from "@/lib/utils"; // Your utility for classnames
import { SelectedOptionsDisplay } from "../base-filter/SelectedOptionsDisplay"; // The new component
import { OptionItem } from "../base-filter/interfaces";

// These constants are primarily used within SelectedOptionsDisplay,
// but knowing them helps understand the logic in toggleSelect.
const VISIBLE_BADGES_COUNT_IN_DISPLAY = 1; // Corresponds to VISIBLE_BADGES_COUNT in SelectedOptionsDisplay
const MIN_ITEMS_FOR_COMPACT_VIEW_IN_DISPLAY = VISIBLE_BADGES_COUNT_IN_DISPLAY + 1;


export function EntityOptions() {
    const [selected, setSelected] = useState<OptionItem[]>([]);
    // State to manage if all selected items are shown or just the compact view (passed to SelectedOptionsDisplay)
    const [showAllSelected, setShowAllSelected] = useState(false);

    /**
     * Toggles the selection state of an entity option.
     * If the option is already selected, it's removed. Otherwise, it's added.
     * Also handles collapsing the "Show all" view if the number of items drops below the threshold.
     * @param option - The entity option to toggle.
     */
    const toggleSelect = (option: OptionItem) => {
        setSelected(prev => {
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
        setSelected([]);
        setShowAllSelected(false); // Reset view on clear
    };

    return (
        <Card className={cn("w-full max-w-md shadow-lg flex flex-col")}>
            <CardHeader>
                <CardTitle>Filter Entities</CardTitle>
            </CardHeader>

            <CardContent className={cn("p-0 md:p-4 pt-0 flex-grow")}>
                <MultiSelectInfinite
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
