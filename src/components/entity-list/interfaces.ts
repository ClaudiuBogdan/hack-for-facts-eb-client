export interface Option {
    name: string;
    cui: string;
}

export interface UseMultiSelectInfiniteProps {
    selected: Option[];
    onChange: (selected: Option[]) => void;
    pageSize?: number;
    debounceMs?: number;
}

export interface PageData {
    nodes: Option[];
    pageInfo: {
        totalCount: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
    nextOffset: number;
}