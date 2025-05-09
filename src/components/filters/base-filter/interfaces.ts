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
    id: string
    label: string
}