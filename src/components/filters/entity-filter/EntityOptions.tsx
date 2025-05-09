import { useState } from "react";
import { MultiSelectInfinite } from "./MultiSelectInfinite";
import { EntityOption } from "./interfaces";
export function EntityOptions() {
    const [selected, setSelected] = useState<EntityOption[]>([]);

    const toggleSelect = (option: EntityOption) => {
        setSelected(prev => prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]);
    }
    return (
        <MultiSelectInfinite
            selected={selected}
            toggleSelect={toggleSelect}
            pageSize={100}
        />)
}