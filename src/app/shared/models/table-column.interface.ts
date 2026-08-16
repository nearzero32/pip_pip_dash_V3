export type TableRow = Record<string, any>;

export interface TableColumn {
    key: string;
    label: string;
    type?: 'text' | 'date' | 'badge';
    badgeClassMap?: { [key: string]: string }; // For mapping values to CSS classes
    valueMap?: { [key: string]: string }; // For mapping values to display text
}
