interface FilterOptionProps {
    onClick: () => void;
    label: string
    selected: boolean;
    optionHeight: number;
    optionStart: number;
}

export function FilterOption({ onClick, label, selected, optionHeight, optionStart }: FilterOptionProps) {
    return (
        <div
            className="flex items-center p-2 cursor-pointer absolute top-0 left-0 w-full line-height-0 border-b border-gray-200 border-solid"
            style={{
                height: `${optionHeight}px`,
                transform: `translateY(${optionStart}px)`,
            }}
            onClick={onClick}
        >
            <input type="checkbox" checked={selected} readOnly className="mr-2" />
            <span title={label} className="text-xs leading-tight">{label}</span>
        </div>
    )
}
