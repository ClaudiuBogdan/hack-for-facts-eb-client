import { EntityList } from "./entity-filter/EntityList";
import { FilterListContainer } from "./base-filter/FilterListContainer";
import { UatList } from "./uat-filter";
import { Card } from "../ui/card";
import { ArrowUpDown, Building2, Calendar, ChartBar, EuroIcon, MapPin, SlidersHorizontal } from "lucide-react";
import { EconomicClassificationList } from "./economic-classification-filter";
import { FunctionalClassificationList } from "./functional-classification-filter";
import { YearFilter } from "./year-filter";
import { AmountRangeFilter } from "./amount-range-filter";
import { FilterRangeContainer } from "./base-filter/FilterRangeContainer";
import { AccountTypeFilter } from "./account-type-filter/AccountTypeFilter";
import { useFilterSearch } from "../../lib/hooks/useFilterSearch";

export function Filter() {
    const {
        selectedYearOptions,
        setSelectedYearOptions,
        selectedEntityOptions,
        setSelectedEntityOptions,
        selectedUatOptions,
        setSelectedUatOptions,
        selectedEconomicClassificationOptions,
        setSelectedEconomicClassificationOptions,
        selectedFunctionalClassificationOptions,
        setSelectedFunctionalClassificationOptions,
        minAmount,
        setMinAmount,
        maxAmount,
        setMaxAmount,
        selectedAccountTypeOptions,
        setSelectedAccountTypeOptions,
    } = useFilterSearch();

    return (
        <Card className="flex flex-col w-full min-h-full shadow-lg py-8">
            <FilterListContainer
                title="Entitati Publice"
                icon={<Building2 className="w-4 h-4" />}
                listComponent={EntityList}
                selected={selectedEntityOptions}
                setSelected={setSelectedEntityOptions}
            />
            <FilterListContainer
                title="Unitati Administrativ Teritoriale (UAT)"
                icon={<MapPin className="w-4 h-4" />}
                listComponent={UatList}
                selected={selectedUatOptions}
                setSelected={setSelectedUatOptions}
            />
            <FilterListContainer
                title="Clasificare Economica"
                icon={<EuroIcon className="w-4 h-4" />}
                listComponent={EconomicClassificationList}
                selected={selectedEconomicClassificationOptions}
                setSelected={setSelectedEconomicClassificationOptions}
            />
            <FilterListContainer
                title="Clasificare Functionala"
                icon={<ChartBar className="w-4 h-4" />}
                listComponent={FunctionalClassificationList}
                selected={selectedFunctionalClassificationOptions}
                setSelected={setSelectedFunctionalClassificationOptions}
            />
            <FilterListContainer
                title="Anul"
                icon={<Calendar className="w-4 h-4" />}
                listComponent={YearFilter}
                selected={selectedYearOptions}
                setSelected={setSelectedYearOptions}
            />
            <FilterRangeContainer
                title="Interval Valoare"
                icon={<SlidersHorizontal className="w-4 h-4" />}
                rangeComponent={AmountRangeFilter}
                minValue={minAmount}
                onMinValueChange={setMinAmount}
                maxValue={maxAmount}
                onMaxValueChange={setMaxAmount}
            />
            <FilterListContainer
                title="Venituri/Cheltuieli"
                icon={<ArrowUpDown className="w-4 h-4" />}
                listComponent={AccountTypeFilter}
                selected={selectedAccountTypeOptions}
                setSelected={setSelectedAccountTypeOptions}
            />
        </Card>
    );
}
