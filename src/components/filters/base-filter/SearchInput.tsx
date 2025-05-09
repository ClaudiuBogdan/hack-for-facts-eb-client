import { useEffect, useState } from "react";

interface SearchInputProps {
    onChange: (val: string) => void;
}

export function SearchInput({ onChange }: SearchInputProps) {
    const [search, setSearch] = useState("");
    const debounceMs = 300;
    
    // Debounce search changes
    useEffect(() => {
        const handler = setTimeout(() => onChange(search), debounceMs);
        return () => clearTimeout(handler);
    }, [search, onChange, debounceMs]);

    return (
        <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={"Search"}
            className="w-full p-2 border rounded mb-2"
        />)
}