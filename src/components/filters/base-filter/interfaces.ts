export interface PageData<T> {
    nodes: T[];
    pageInfo: {
        totalCount: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
    nextOffset: number;
}

export interface OptionItem<TID = string | number> {
    id: TID
    label: string
}

export interface BaseListProps {
    selectedOptions: OptionItem[];
    toggleSelect: (option: OptionItem) => void;
    pageSize?: number;
    className?: string;
}

export interface BaseListFilterProps {
    minValue: string | number;
    maxValue: string | number;
    onMinValueChange: (value: string) => void;
    onMaxValueChange: (value: string) => void;
    className?: string;
}