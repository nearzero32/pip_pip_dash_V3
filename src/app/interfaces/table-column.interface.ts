export interface TableColumn {
    key: string;
    label: string;
    type?: 'text' | 'date' | 'currency' | 'badge' | 'image' | 'action' | 'customer-info' | 'bill-services' | 'bill-payment-details';
    badgeClassMap?: { [key: string]: string }; // For mapping values to CSS classes
    valueMap?: { [key: string]: string }; // For mapping values to display text
}
