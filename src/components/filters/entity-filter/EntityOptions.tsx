import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MultiSelectInfinite } from "./MultiSelectInfinite";
import { EntityOption } from "./interfaces";
import { useState } from "react";

export function EntityOptions() {
    const [selected, setSelected] = useState<EntityOption[]>([]);

    const toggleSelect = (option: EntityOption) => {
        setSelected(prev => {
            const isAlreadySelected = prev.some(o => o.cui === option.cui);
            if (isAlreadySelected) {
                return prev.filter(o => o.cui !== option.cui);
            } else {
                return [...prev, option];
            }
        });
    };

    const clearSelection = () => {
        setSelected([]);
    };

    return (
        <Card className="w-full max-w-md shadow-lg">
            <CardHeader>
                <CardTitle>Filter Entities</CardTitle>
                {selected.length > 0 && (
                    <CardDescription>
                        {selected.length} entity{selected.length === 1 ? "" : "s"} selected.
                        <Button variant="ghost" onClick={clearSelection}>
                            Clear Selection ({selected.length})
                        </Button>
                    </CardDescription>

                )}
            </CardHeader>
            <CardContent className="p-0 md:p-4">
                <MultiSelectInfinite
                    selected={selected}
                    toggleSelect={toggleSelect}
                    pageSize={100}
                />
            </CardContent>
        </Card>
    );
}