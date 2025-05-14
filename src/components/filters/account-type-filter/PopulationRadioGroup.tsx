import { useMapFilter } from '@/lib/hooks/useMapFilterStore';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { NormalizationOptionItem } from '@/lib/hooks/useMapFilterStore';
import { cn } from '@/lib/utils'; // Import cn utility

const normalizationFilter: NormalizationOptionItem[] = [
    { id: "total", label: "Total" },
    { id: "per-capita", label: "Per Capita" },
];

export function PopulationRadioGroup() {
    const { selectedNormalization, setNormalization } = useMapFilter();

    const handleValueChange = (value: string) => {
        const selected = normalizationFilter.find(cat => cat.id === value);
        if (selected) {
            setNormalization(selected);
        }
    };

    return (
        <RadioGroup
            value={selectedNormalization.id}
            onValueChange={handleValueChange}
            className="flex space-x-2"
        >
            {normalizationFilter.map((category) => {
                const isSelected = selectedNormalization.id === category.id;
                return (
                    <Label
                        key={category.id}
                        htmlFor={`map-ac-${category.id}`}
                        className={cn(
                            "flex-1 text-center px-3 py-2 border rounded-md cursor-pointer text-sm font-medium transition-colors",
                            isSelected
                                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                    >
                        <RadioGroupItem
                            value={category.id}
                            id={`map-ac-${category.id}`}
                            className="sr-only" // Visually hide the radio button
                        />
                        {category.label}
                    </Label>
                );
            })}
        </RadioGroup>
    );
} 