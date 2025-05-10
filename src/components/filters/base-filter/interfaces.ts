export interface PageData<T> {
    nodes: T[];
    pageInfo: {
        totalCount: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
    nextOffset: number;
}

export interface OptionItem {
    id: string | number
    label: string
}

export interface BaseListProps {
    selectedOptions: OptionItem[];
    toggleSelect: (option: OptionItem) => void;
    pageSize?: number;
    className?: string;
}