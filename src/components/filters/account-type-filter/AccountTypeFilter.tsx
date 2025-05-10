
import { BaseListProps } from "../base-filter/interfaces";
import { cn } from "@/lib/utils";
import { ListOption } from "../base-filter/ListOption";
import { ListContainerSimple } from "../base-filter/ListContainerSimple";

const accountTypes = [
    { id: "ch", label: "Cheltuieli" },
    { id: "vn", label: "Venituri" },
];
const rowHight = 35;

export function AccountTypeFilter({ selectedOptions, toggleSelect, className }: BaseListProps) {

    return (
        <div className={cn("w-full flex flex-col space-y-3", className)}>
            <ListContainerSimple
                height={accountTypes.length * rowHight}
                className="h-[4.5rem] "
            >
                {accountTypes.map((accountType, index) => (
                    <ListOption
                        key={accountType.id}
                        uniqueIdPart={accountType.id}
                        onClick={() => toggleSelect(accountType)}
                        label={accountType.label}
                        selected={selectedOptions.some(item => item.id === accountType.id)}
                        optionHeight={rowHight}
                        optionStart={rowHight * index} />
                ))}
            </ListContainerSimple>

        </div>
    )
}