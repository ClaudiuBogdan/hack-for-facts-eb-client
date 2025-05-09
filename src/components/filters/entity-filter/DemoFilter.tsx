import { EntityList } from "./EntityList"; // Your existing component
import { FilterContainer } from "../base-filter/FilterContainer";
import { useState } from "react";
import { OptionItem } from "../base-filter/interfaces";


export function DemoFilter() {
    const [selected, setSelected] = useState<OptionItem[]>([]);
    return (
        <FilterContainer
            title="Filter Entities"
            listComponent={EntityList}
            selected={selected}
            setSelected={setSelected}
        />
    )
}
