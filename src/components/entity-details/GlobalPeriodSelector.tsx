import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// TODO: Integrate with a global state store (e.g., Zustand) instead of local state
// interface GlobalPeriodSelectorProps {
//   selectedYear: number;
//   setSelectedYear: (year: number) => void;
//   selectedPeriodType: string; // e.g., 'monthly', 'quarterly', 'annual'
//   setSelectedPeriodType: (type: string) => void;
//   // Potentially specific month/quarter if applicable
// }

export function GlobalPeriodSelector(/* props: GlobalPeriodSelectorProps */) {
    const [year, setYear] = useState(new Date().getFullYear());
    const [periodType, setPeriodType] = useState('annual'); // 'annual', 'quarterly', 'monthly'

    // TODO: Add logic for selecting specific quarter/month if periodType changes
    // TODO: Call functions from props to update global state

    return (
        <div className="flex items-center space-x-2 p-2 border rounded-md bg-muted/40">
            <div>
                <label htmlFor="year-select" className="text-sm font-medium sr-only">An:</label>
                <Input
                    type="number"
                    id="year-select"
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value, 10))}
                    className="w-24 h-9"
                />
            </div>
            <div>
                <label htmlFor="period-type-select" className="text-sm font-medium sr-only">Perioadă:</label>
                <Select value={periodType} onValueChange={setPeriodType}>
                    <SelectTrigger className="w-[150px] h-9" id="period-type-select">
                        <SelectValue placeholder="Selectează perioada" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="annual">Anual</SelectItem>
                        <SelectItem value="quarterly">Trimestrial</SelectItem>
                        <SelectItem value="monthly">Lunar</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            {/* TODO: Add selectors for specific Quarter/Month based on periodType */}
            {/* 
            {periodType === 'quarterly' && (
                <Select>
                    <SelectTrigger className="w-[100px] h-9"><SelectValue placeholder="Trimestru" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Q1">Q1</SelectItem>
                        <SelectItem value="Q2">Q2</SelectItem>
                        <SelectItem value="Q3">Q3</SelectItem>
                        <SelectItem value="Q4">Q4</SelectItem>
                    </SelectContent>
                </Select>
            )}
            */}
            <Button size="sm" variant="outline" className="h-9">
                Aplică
            </Button>
            <p className="text-xs text-muted-foreground">
                Selector Perioadă (în construcție)
            </p>
        </div>
    );
} 