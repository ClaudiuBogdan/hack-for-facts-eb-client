import { EntityList } from "./entity-filter/EntityList";
import { FilterListContainer } from "./base-filter/FilterListContainer";
import { useState } from "react";
import { OptionItem } from "./base-filter/interfaces";
import { UatList } from "./uat-filter";
import { Card } from "../ui/card";
import { ArrowUpDown, Building2, Calendar, ChartBar, EuroIcon, Inbox, MapPin, ReceiptEuro, SlidersHorizontal } from "lucide-react";
import { EconomicClassificationList } from "./economic-classification-filter";
import { FunctionalClassificationList } from "./functional-classification-filter";
import { YearFilter } from "./year-filter";
import { AmountRangeFilter } from "./amount-range-filter";
import { FilterRangeContainer } from "./base-filter/FilterRangeContainer";
import { AccountTypeFilter } from "./account-type-filter/AccountTypeFilter";


export function DemoFilter() {
    const [selectedYear, setSelectedYear] = useState<OptionItem[]>([]);
    const [selectedEntities, setSelectedEntities] = useState<OptionItem[]>([]);
    const [selectedUats, setSelectedUats] = useState<OptionItem[]>([]);
    const [selectedEconomicClassifications, setSelectedEconomicClassifications] = useState<OptionItem[]>([]);
    const [selectedFunctionalClassifications, setSelectedFunctionalClassifications] = useState<OptionItem[]>([]);
    const [minAmount, setMinAmount] = useState<string>("");
    const [maxAmount, setMaxAmount] = useState<string>("");
    const [selectedAccountType, setSelectedAccountType] = useState<OptionItem[]>([]);

    return (
        <Card className="flex flex-col w-full min-h-full shadow-lg pb-8">
            <FilterListContainer
                title="Entitati Publice"
                icon={<Building2 className="w-4 h-4" />}
                listComponent={EntityList}
                selected={selectedEntities}
                setSelected={setSelectedEntities}
            />
            <FilterListContainer
                title="Unitati Administrativ Teritoriale (UAT)"
                icon={<MapPin className="w-4 h-4" />}
                listComponent={UatList}
                selected={selectedUats}
                setSelected={setSelectedUats}
            />
            <FilterListContainer
                title="Clasificare Economica"
                icon={<EuroIcon className="w-4 h-4" />}
                listComponent={EconomicClassificationList}
                selected={selectedEconomicClassifications}
                setSelected={setSelectedEconomicClassifications}
            />
            <FilterListContainer
                title="Clasificare Functionala"
                icon={<ChartBar className="w-4 h-4" />}
                listComponent={FunctionalClassificationList}
                selected={selectedFunctionalClassifications}
                setSelected={setSelectedFunctionalClassifications}
            />
            <FilterListContainer
                title="Anul"
                icon={<Calendar className="w-4 h-4" />}
                listComponent={YearFilter}
                selected={selectedYear}
                setSelected={setSelectedYear}
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
                selected={selectedAccountType}
                setSelected={setSelectedAccountType}
            />
        </Card>

    )
}
