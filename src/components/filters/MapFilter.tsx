import { FilterListContainer } from "./base-filter/FilterListContainer";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ArrowUpDown, Calendar, Tags, XCircle } from "lucide-react";
import { YearFilter } from "./year-filter";
import { AccountCategoryRadioGroup } from "./account-type-filter/AccountCategoryRadioGroup";
import { Button } from "../ui/button";
import { OptionItem } from "./base-filter/interfaces";
import { useMapFilter, EconomicClassificationOptionItem } from "@/lib/hooks/useMapFilterStore";
import { EconomicClassificationList } from "./economic-classification-filter";

export function MapFilter() {
    const {
        selectedYears,
        selectedFunctionalClassifications,
        selectedEconomicClassifications,
        setSelectedYears,
        setSelectedEconomicClassifications,
        resetMapFilters,
    } = useMapFilter();

    const clearAllFilters = () => {
        resetMapFilters();
    };

    const totalOptionalFilters = selectedYears.length + selectedFunctionalClassifications.length + selectedEconomicClassifications.length;

    return (
        <Card className="flex flex-col w-full min-h-full shadow-lg">
            <CardHeader className="py-4 px-6 border-b">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-semibold">Filtre Hartă</CardTitle>
                    {totalOptionalFilters > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-sm">
                            <XCircle className="w-4 h-4 mr-1" />
                            Șterge filtre ({totalOptionalFilters})
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow p-0 space-y-1">
                <div className="p-3 border-b">
                    <h4 className="mb-2 text-sm font-medium flex items-center">
                        <ArrowUpDown className="w-4 h-4 mr-2" />
                        Venituri/Cheltuieli
                    </h4>
                    <AccountCategoryRadioGroup />
                </div>

                <FilterListContainer
                    title="Anul"
                    icon={<Calendar className="w-4 h-4" />}
                    listComponent={YearFilter}
                    selected={selectedYears}
                    setSelected={(items) => setSelectedYears(items as OptionItem<number>[])}
                />
                {/* <FilterListContainer
                    title="Clasificare Functionala"
                    icon={<ChartBar className="w-4 h-4" />}
                    listComponent={FunctionalClassificationList}
                    selected={selectedFunctionalClassifications}
                    setSelected={(items) => setSelectedFunctionalClassifications(items as OptionItem<string>[])}
                /> */}
                <FilterListContainer
                    title="Clasificare Economică"
                    icon={<Tags className="w-4 h-4" />}
                    listComponent={EconomicClassificationList}
                    selected={selectedEconomicClassifications}
                    setSelected={(items) => setSelectedEconomicClassifications(items as EconomicClassificationOptionItem[])}
                />
            </CardContent>
        </Card>
    );
} 