import { FilterListContainer } from "./base-filter/FilterListContainer";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ArrowUpDown, Calendar, ChartBar, Divide, Globe, Group, SlidersHorizontal, Tags, XCircle } from "lucide-react";
import { YearFilter } from "./year-filter";
import { AccountCategoryRadioGroup } from "./account-type-filter/AccountCategoryRadioGroup";
import { Button } from "../ui/button";
import { OptionItem } from "./base-filter/interfaces";
import { useMapFilter, EconomicClassificationOptionItem } from "@/lib/hooks/useMapFilterStore";
import { EconomicClassificationList } from "./economic-classification-filter";
import { FunctionalClassificationList } from "./functional-classification-filter";
import { PopulationRadioGroup } from "./account-type-filter/PopulationRadioGroup";
import { FilterRangeContainer } from "./base-filter/FilterRangeContainer";
import { AmountRangeFilter } from "./amount-range-filter";
export function MapFilter() {
    const {
        selectedYears,
        selectedFunctionalClassifications,
        selectedEconomicClassifications,
        selectedMinAmount,
        selectedMaxAmount,
        selectedMinPopulation,
        selectedMaxPopulation,
        setSelectedYears,
        setSelectedFunctionalClassifications,
        setSelectedEconomicClassifications,
        setMinAmount,
        setMaxAmount,
        setMinPopulation,
        setMaxPopulation,
        resetMapFilters,
    } = useMapFilter();

    const clearAllFilters = () => {
        resetMapFilters();
    };

    const totalOptionalFilters =
        selectedYears.length +
        selectedFunctionalClassifications.length +
        selectedEconomicClassifications.length +
        (selectedMinAmount ? 1 : 0) +
        (selectedMaxAmount ? 1 : 0) +
        (selectedMinPopulation ? 1 : 0) +
        (selectedMaxPopulation ? 1 : 0);

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

                <div className="p-3 border-b">
                    <h4 className="mb-2 text-sm font-medium flex items-center">
                        <Divide className="w-4 h-4 mr-2" />
                        Sumă totală
                    </h4>
                    <PopulationRadioGroup />
                </div>

                <FilterListContainer
                    title="Anul"
                    icon={<Calendar className="w-4 h-4" />}
                    listComponent={YearFilter}
                    selected={selectedYears}
                    setSelected={(items) => setSelectedYears(items as OptionItem<number>[])}
                />
                <FilterListContainer
                    title="Clasificare Functionala"
                    icon={<ChartBar className="w-4 h-4" />}
                    listComponent={FunctionalClassificationList}
                    selected={selectedFunctionalClassifications}
                    setSelected={(items) => setSelectedFunctionalClassifications(items as OptionItem<string>[])}
                />
                <FilterListContainer
                    title="Clasificare Economică"
                    icon={<Tags className="w-4 h-4" />}
                    listComponent={EconomicClassificationList}
                    selected={selectedEconomicClassifications}
                    setSelected={(items) => setSelectedEconomicClassifications(items as EconomicClassificationOptionItem[])}
                />
                <FilterRangeContainer
                    title="Interval Valoare"
                    icon={<SlidersHorizontal className="w-4 h-4" />}
                    unit="RON"
                    rangeComponent={AmountRangeFilter}
                    minValue={selectedMinAmount}
                    onMinValueChange={(val) => setMinAmount(Number(val))}
                    maxValue={selectedMaxAmount}
                    onMaxValueChange={(val) => setMaxAmount(Number(val))}
                />
                <FilterRangeContainer
                    title="Interval Populație"
                    unit="locuitori"
                    icon={<Globe className="w-4 h-4" />}
                    rangeComponent={AmountRangeFilter}
                    minValue={selectedMinPopulation}
                    onMinValueChange={(val) => setMinPopulation(Number(val))}
                    maxValue={selectedMaxPopulation}
                    onMaxValueChange={(val) => setMaxPopulation(Number(val))}
                />
            </CardContent>
        </Card>
    );
} 