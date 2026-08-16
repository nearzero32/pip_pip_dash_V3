export interface TableColumn {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'badge';
  badgeClassMap?: { [key: string]: string };
  valueMap?: { [key: string]: string };
}
