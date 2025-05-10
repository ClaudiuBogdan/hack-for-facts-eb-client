
import { EntityList } from "./entity-filter/EntityList";
import { FilterContainer } from "./base-filter/FilterContainer";
import { useState } from "react";
import { OptionItem } from "./base-filter/interfaces";
import { UatList } from "./uat-filter";
import { Card } from "../ui/card";
import { Building2, EuroIcon, MapPin } from "lucide-react";
import { EconomicClassificationList } from "./economic-classification-filter";


export function DemoFilter() {
    const [selectedEntities, setSelectedEntities] = useState<OptionItem[]>([]);
    const [selectedUats, setSelectedUats] = useState<OptionItem[]>([]);
    const [selectedEconomicClassifications, setSelectedEconomicClassifications] = useState<OptionItem[]>([]);
    return (
        <Card className="flex flex-col w-full min-h-full shadow-lg">
            <FilterContainer
                title="Entitati Publice"
                icon={<Building2 className="w-4 h-4" />}
                listComponent={EntityList}
                selected={selectedEntities}
                setSelected={setSelectedEntities}
            />
            <FilterContainer
                title="Unitati Administrativ Teritoriale (UAT)"
                icon={<MapPin className="w-4 h-4" />}
                listComponent={UatList}
                selected={selectedUats}
                setSelected={setSelectedUats}
            />
            <FilterContainer
                title="Clasificare Economica"
                icon={<EuroIcon className="w-4 h-4" />}
                listComponent={EconomicClassificationList}
                selected={selectedEconomicClassifications}
                setSelected={setSelectedEconomicClassifications}
            />
        </Card>

    )
}
