import { RadioGroupButtons } from "@/components/ui/radio-group-buttons";
import { t } from "@lingui/core/macro";

interface BooleanFilterProps {
    value: boolean | undefined;
    onChange: (value: boolean | undefined) => void;
}
export function BooleanFilter({ value, onChange }: BooleanFilterProps) {

    const handleChange = (next: string | number | boolean | undefined) => {
        if (next === undefined) {
            onChange(undefined);
        } else if (String(next) === 'true') {
            onChange(true);
        } else if (String(next) === 'false') {
            onChange(false);
        }
    };

    return (
        <RadioGroupButtons
            value={value}
            onChange={handleChange}
            options={[{ value: true, label: t`Yes` }, { value: false, label: t`No` }]} />
    );
} 